import { supabase } from './client';
import { DBStatusCode } from '@/types/supabase';
import { createError, createSuccess } from './resultUtils';
import { withTimeout } from './client';

// Disable debug mode in production
const DEBUG = import.meta.env.MODE === 'development';

// RLS verification timeout
const VERIFICATION_TIMEOUT = 3000; // 3 seconds

/**
 * Result from RLS policy verification
 */
export type RLSVerificationResult = {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  hasAccess: boolean;
  errorCode?: string;
  errorMessage?: string;
  meta?: any;
};

/**
 * Verifies access to a specific table with a specific operation
 * @param table The table to check
 * @param operation The operation to check (select, insert, update, delete)
 * @param testId Optional ID to check for row-level access
 * @returns Result indicating if the current user has access
 */
export const verifyTableAccess = async (
  table: string, 
  operation: 'select' | 'insert' | 'update' | 'delete',
  testId?: string
): Promise<RLSVerificationResult> => {
  try {
    const result: RLSVerificationResult = {
      table,
      operation,
      hasAccess: false
    };
    
    // Get the current user for logging
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    DEBUG && console.log(`[RLSVerifier] Checking ${operation} access on ${table} table for user ${userId || 'anonymous'}`);
    
    // Different verification logic based on operation
    switch (operation) {
      case 'select': {
        // For select, try to get one row
        const query = supabase
          .from(table)
          .select('id')
          .limit(1);
          
        // If testId is provided, filter by that ID
        if (testId) {
          query.eq('id', testId);
        }
        
        const { data, error } = await withTimeout(
          query,
          VERIFICATION_TIMEOUT,
          `verify_${table}_${operation}`
        );
        
        if (error) {
          result.errorCode = error.code;
          result.errorMessage = error.message;
          
          // Special check for row not found
          if (error.code === 'PGRST116') {
            // This usually means the table exists but no rows match criteria
            // For our purpose, this is still considered "has access"
            result.hasAccess = true;
            result.meta = { note: 'Table exists but no matching rows found' };
          } else if (error.code === 'PGRST301') {
            // This is a policy rejection error
            result.hasAccess = false;
            result.meta = { note: 'Policy rejected access' };
          }
        } else {
          result.hasAccess = true;
        }
        break;
      }
      
      case 'insert': {
        // For insert, we'll use a transaction that we immediately rollback
        // This verifies if the user can insert without actually inserting
        const { error } = await supabase.rpc('verify_insert_access', { 
          table_name: table 
        });
        
        if (error) {
          result.errorCode = error.code;
          result.errorMessage = error.message;
          result.hasAccess = false;
        } else {
          result.hasAccess = true;
        }
        break;
      }
      
      case 'update': {
        // For update, verify if a specific row can be updated
        // We need a valid ID for this test
        if (!testId) {
          result.errorMessage = 'Test ID required for update verification';
          break;
        }
        
        // Use RPC function to check update access
        const { error } = await supabase.rpc('verify_update_access', { 
          table_name: table,
          row_id: testId
        });
        
        if (error) {
          result.errorCode = error.code;
          result.errorMessage = error.message;
          result.hasAccess = false;
        } else {
          result.hasAccess = true;
        }
        break;
      }
      
      case 'delete': {
        // For delete, verify if a specific row can be deleted
        // We need a valid ID for this test
        if (!testId) {
          result.errorMessage = 'Test ID required for delete verification';
          break;
        }
        
        // Use RPC function to check delete access
        const { error } = await supabase.rpc('verify_delete_access', { 
          table_name: table,
          row_id: testId
        });
        
        if (error) {
          result.errorCode = error.code;
          result.errorMessage = error.message;
          result.hasAccess = false;
        } else {
          result.hasAccess = true;
        }
        break;
      }
    }
    
    DEBUG && console.log(
      `[RLSVerifier] ${operation.toUpperCase()} access on ${table}: ${result.hasAccess ? 'GRANTED' : 'DENIED'}`,
      result.errorMessage ? `(${result.errorMessage})` : ''
    );
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[RLSVerifier] Error verifying ${operation} access on ${table}:`, error);
    
    return {
      table,
      operation,
      hasAccess: false,
      errorMessage
    };
  }
};

/**
 * Verifies RLS policies for all operations on critical tables
 * @param tables List of tables to verify
 * @returns Map of verification results for each table and operation
 */
/**
 * Helper function to handle verification timeouts
 */
const withVerificationTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs = VERIFICATION_TIMEOUT,
  defaultValue: T
): Promise<T> => {
  try {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  } catch (error) {
    console.error(`Verification operation timed out:`, error);
    return defaultValue;
  }
};

export const verifyRLSPolicies = async (
  tables: string[] = ['watchlists', 'watchlist_items', 'profiles', 'research_notes']
): Promise<Map<string, RLSVerificationResult[]>> => {
  const results = new Map<string, RLSVerificationResult[]>();
  
  // First, ensure the user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    DEBUG && console.warn('[RLSVerifier] No authenticated user, skipping RLS verification');
    return results;
  }
  
  // Process each table sequentially with proper await to prevent race conditions
  for (const table of tables) {
    const tableResults: RLSVerificationResult[] = [];
    
    // Test select access
    const selectResult = await withVerificationTimeout(
      verifyTableAccess(table, 'select'),
      VERIFICATION_TIMEOUT,
      {
        table,
        operation: 'select',
        hasAccess: false,
        errorMessage: 'Operation timed out'
      }
    );
    tableResults.push(selectResult);
    
    // Test insert access (doesn't need an ID)
    const insertResult = await withVerificationTimeout(
      verifyTableAccess(table, 'insert'),
      VERIFICATION_TIMEOUT,
      {
        table,
        operation: 'insert',
        hasAccess: false,
        errorMessage: 'Operation timed out'
      }
    );
    tableResults.push(insertResult);
    
    // Find a valid ID for update/delete tests
    let testId: string | undefined;
    try {
      const { data } = await withVerificationTimeout(
        supabase.from(table).select('id').limit(1),
        VERIFICATION_TIMEOUT,
        { data: null, error: new Error('Operation timed out') }
      );
        
      if (data && data.length > 0) {
        testId = data[0].id;
        
        // Test update/delete only if we found a valid ID
        if (testId) {
          // Run update test with the found ID
          const updateResult = await withVerificationTimeout(
            verifyTableAccess(table, 'update', testId),
            VERIFICATION_TIMEOUT,
            {
              table,
              operation: 'update',
              hasAccess: false,
              errorMessage: 'Operation timed out'
            }
          );
          tableResults.push(updateResult);
          
          // Run delete test with the found ID
          const deleteResult = await withVerificationTimeout(
            verifyTableAccess(table, 'delete', testId),
            VERIFICATION_TIMEOUT,
            {
              table,
              operation: 'delete',
              hasAccess: false,
              errorMessage: 'Operation timed out'
            }
          );
          tableResults.push(deleteResult);
        }
      } else {
        DEBUG && console.log(`[RLSVerifier] No rows found in ${table} for update/delete tests`);
        
        // Add placeholders for missing tests
        tableResults.push({
          table,
          operation: 'update',
          hasAccess: false,
          errorMessage: 'No rows available for testing'
        });
        
        tableResults.push({
          table,
          operation: 'delete',
          hasAccess: false,
          errorMessage: 'No rows available for testing'
        });
      }
    } catch (error) {
      console.error(`[RLSVerifier] Error finding test ID for ${table}:`, error);
      
      // Add results with no access but indicate error
      tableResults.push({
        table,
        operation: 'update',
        hasAccess: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      
      tableResults.push({
        table,
        operation: 'delete',
        hasAccess: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
    
    results.set(table, tableResults);
  }
  
  return results;
};

/**
 * Diagnoses a specific database error to determine if it's an RLS policy error
 * and suggests actions to fix it
 * @param error The error to diagnose
 * @param context Additional context about the operation that caused the error
 * @returns A result with diagnostic information
 */
export const diagnoseRLSError = async (error: any, context: { 
  table?: string; 
  operation?: 'select' | 'insert' | 'update' | 'delete';
  userId?: string;
}) => {
  // Default error diagnosis
  let isRLSError = false;
  let needsTokenRefresh = false;
  let diagnosis = 'Unknown error';
  let suggestion = 'Check the error details for more information';
  
  if (!error) {
    return createError(
      'No error provided for diagnosis',
      DBStatusCode.BAD_REQUEST
    );
  }
  
  // Check for common RLS error codes
  if (error.code === 'PGRST301') {
    isRLSError = true;
    diagnosis = 'RLS policy rejected the operation';
    suggestion = 'User does not have permission for this operation';
    
    // Check if token refresh might help
    needsTokenRefresh = error.message?.includes('JWT') || 
                        error.message?.includes('Bearer token') ||
                        error.message?.includes('auth.uid()');
    
    if (needsTokenRefresh) {
      suggestion = 'Try refreshing the session token';
    }
  } else if (error.code === '42501') {
    isRLSError = true;
    diagnosis = 'Insufficient privileges for operation';
    suggestion = 'User does not have required database role or permissions';
  } else if (error.code === 'PGRST302') {
    isRLSError = true;
    diagnosis = 'Row-level security violation in multi-table operation';
    suggestion = 'Check that user has access to all related tables';
  }
  
  // If we have table context, try to verify access
  if (context.table && context.operation) {
    try {
      const verificationResult = await verifyTableAccess(
        context.table, 
        context.operation
      );
      
      if (!verificationResult.hasAccess) {
        isRLSError = true;
        diagnosis = `Verified: No ${context.operation} access to ${context.table}`;
        suggestion = 'Check the RLS policies for this table and user role';
      }
    } catch (verifyError) {
      console.error('[RLSDiagnostic] Error during verification:', verifyError);
    }
  }
  
  // Get current user info
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Try refreshing the token if it looks like an auth issue
    if (needsTokenRefresh && user) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError) {
        suggestion = 'Session token refreshed, try the operation again';
      } else {
        suggestion = 'Token refresh failed, user may need to log in again';
      }
    }
  } catch (authError) {
    console.error('[RLSDiagnostic] Error getting user info:', authError);
  }
  
  return createSuccess({
    isRLSError,
    diagnosis,
    suggestion,
    needsTokenRefresh,
    originalError: {
      code: error.code,
      message: error.message,
      details: error.details
    },
    context
  });
};