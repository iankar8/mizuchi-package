import { DBStatusCode, Result } from "@/types/supabase";
import {
  createError,
  createSuccess,
  createRLSError,
  createNotFoundError,
  withResultHandling
} from "./resultUtils";
import { supabase, withSessionCheck, withTimeout } from "./client";
import { tokenManager } from "./tokenManager";

// Default timeout from environment variable or fallback to 15s
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

/**
 * Safely attempts a database operation with session validation, error handling,
 * automatic token refresh, and timeout protection.
 * 
 * @param operation Function performing the database operation
 * @param operationName Name of the operation for error reporting
 * @param timeout Optional timeout in milliseconds
 */
export async function withSafeOperation<T>(
  operation: () => Promise<Result<T>>,
  operationName: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Result<T>> {
  try {
    // Ensure we have a valid session
    return await withSessionCheck(async () => {
      try {
        // Apply timeout and run the operation
        return await withTimeout(operation(), timeout, operationName);
      } catch (error) {
        // Handle timeout errors specifically
        if (error.message?.includes('timed out')) {
          return createError<T>(
            `Operation "${operationName}" timed out after ${timeout}ms`, 
            DBStatusCode.TIMEOUT_ERROR,
            { timeout }
          );
        }
        
        // Handle RLS/permission errors by attempting token refresh
        const isAuthError = 
          error.code === 'PGRST301' || 
          error.message?.includes('JWT') || 
          error.message?.includes('permission denied') ||
          error.message?.includes('not authenticated');
          
        if (isAuthError) {
          console.warn(`[SafeOperation] Auth error in ${operationName}, attempting token refresh`);
          
          // Try refreshing the token
          const refreshed = await tokenManager.refreshToken();
          
          if (refreshed) {
            console.log(`[SafeOperation] Token refreshed, retrying ${operationName}`);
            // Wait a bit for refresh to take effect
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Retry the operation after token refresh
            try {
              return await withTimeout(operation(), timeout, `${operationName} (retry)`);
            } catch (retryError) {
              return handleErrorToResult<T>(retryError, operationName);
            }
          }
        }
        
        // Handle other errors
        return handleErrorToResult<T>(error, operationName);
      }
    });
  } catch (error) {
    return handleErrorToResult<T>(error, operationName);
  }
}

/**
 * Converts a caught exception to a standardized Result type
 */
function handleErrorToResult<T>(error: any, operationName: string): Result<T> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Try to determine appropriate status code
  let status = DBStatusCode.SERVER_ERROR;
  
  if (errorMessage.includes('timed out')) {
    status = DBStatusCode.TIMEOUT_ERROR;
  } else if (errorMessage.includes('permission denied') || errorMessage.includes('PGRST301')) {
    status = DBStatusCode.RLS_ERROR;
  } else if (errorMessage.includes('not found') || errorMessage.includes('PGRST116')) {
    status = DBStatusCode.NOT_FOUND;
  } else if (errorMessage.includes('not authenticated') || errorMessage.includes('JWT')) {
    status = DBStatusCode.UNAUTHORIZED;
  }
  
  return createError<T>(
    `Error in ${operationName}: ${errorMessage}`, 
    status, 
    { originalError: error }
  );
}

/**
 * Safely executes a Supabase query with proper session validation, error handling,
 * and timeout protection.
 * 
 * @param queryFn Function that returns a Supabase query
 * @param operationName Name of the operation for error reporting
 * @param timeout Optional timeout in milliseconds
 */
export async function withSafeQuery<T, R = T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  operationName: string,
  timeout: number = DEFAULT_TIMEOUT,
  transform?: (data: T) => R
): Promise<Result<R>> {
  return withSafeOperation<R>(
    async () => {
      const response = await queryFn();
      
      if (response.error) {
        if (response.error.code === 'PGRST116') {
          return createNotFoundError<R>(operationName);
        }
        
        if (response.error.code === 'PGRST301') {
          return createRLSError<R>(`Permission denied for ${operationName}`);
        }
        
        return createError<R>(
          response.error.message || `Error in ${operationName}`,
          DBStatusCode.QUERY_ERROR,
          { code: response.error.code, details: response.error.details }
        );
      }
      
      // Handle null data
      if (response.data === null || response.data === undefined) {
        return createSuccess<R>(null as R);
      }
      
      // Apply optional transform
      const transformedData = transform ? transform(response.data) : response.data as unknown as R;
      return createSuccess(transformedData);
    },
    operationName,
    timeout
  );
}

/**
 * Safely executes a Supabase query that is expected to return an array,
 * ensuring proper error handling and that an array is always returned.
 */
export async function withSafeArrayQuery<T, R = T>(
  queryFn: () => Promise<{ data: T[] | null; error: any }>,
  operationName: string,
  timeout: number = DEFAULT_TIMEOUT,
  transform?: (data: T) => R
): Promise<Result<R[]>> {
  return withSafeOperation<R[]>(
    async () => {
      const response = await queryFn();
      
      if (response.error) {
        if (response.error.code === 'PGRST301') {
          return createRLSError<R[]>(`Permission denied for ${operationName}`);
        }
        
        return createError<R[]>(
          response.error.message || `Error in ${operationName}`,
          DBStatusCode.QUERY_ERROR,
          { code: response.error.code, details: response.error.details }
        );
      }
      
      // Always return an array
      const dataArray = response.data || [];
      const transformedData = transform 
        ? dataArray.map(item => transform(item)).filter(Boolean)
        : dataArray as unknown as R[];
        
      return createSuccess(transformedData);
    },
    operationName,
    timeout
  );
}

/**
 * Safely executes a Supabase mutation (insert, update, delete)
 * with proper session validation and error handling.
 */
export async function withSafeMutation<T>(
  mutationFn: () => Promise<{ data: T | null; error: any }>,
  operationName: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Result<boolean>> {
  return withSafeOperation<boolean>(
    async () => {
      const response = await mutationFn();
      
      if (response.error) {
        if (response.error.code === 'PGRST301') {
          return createRLSError<boolean>(`Permission denied for ${operationName}`);
        }
        
        return createError<boolean>(
          response.error.message || `Error in ${operationName}`,
          DBStatusCode.QUERY_ERROR,
          { code: response.error.code, details: response.error.details }
        );
      }
      
      return createSuccess(true);
    },
    operationName,
    timeout
  );
}

/**
 * Tests database access with validation of the specified RLS policies
 * @param table The table to test
 * @param operations Operations to test ('select', 'insert', 'update', 'delete')
 */
export async function testRLSPolicies(
  table: string, 
  operations: ('select' | 'insert' | 'update' | 'delete')[] = ['select']
): Promise<Result<Record<string, boolean>>> {
  return withResultHandling(async () => {
    const results: Record<string, boolean> = {};
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return createError<Record<string, boolean>>(
        "Not authenticated", 
        DBStatusCode.UNAUTHORIZED
      );
    }
    
    // Test SELECT policy
    if (operations.includes('select')) {
      try {
        const { error } = await withTimeout(
          supabase.from(table).select('count(*)', { count: 'exact', head: true }),
          5000,
          `SELECT test on ${table}`
        );
        results.select = !error;
      } catch (e) {
        results.select = false;
      }
    }
    
    // Test INSERT policy (with rollback)
    if (operations.includes('insert')) {
      try {
        // Start a transaction
        const { error } = await withTimeout(
          supabase.rpc('test_insert_policy', { table_name: table }),
          5000,
          `INSERT test on ${table}`
        );
        results.insert = !error;
      } catch (e) {
        results.insert = false;
      }
    }
    
    // Test UPDATE policy
    if (operations.includes('update')) {
      try {
        const { error } = await withTimeout(
          supabase.rpc('test_update_policy', { table_name: table }),
          5000,
          `UPDATE test on ${table}`
        );
        results.update = !error;
      } catch (e) {
        results.update = false;
      }
    }
    
    // Test DELETE policy
    if (operations.includes('delete')) {
      try {
        const { error } = await withTimeout(
          supabase.rpc('test_delete_policy', { table_name: table }),
          5000,
          `DELETE test on ${table}`
        );
        results.delete = !error;
      } catch (e) {
        results.delete = false;
      }
    }
    
    return createSuccess(results);
  });
}