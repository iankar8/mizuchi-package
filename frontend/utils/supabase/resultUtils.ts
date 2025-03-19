import { Result, DBStatusCode } from "@/types/supabase";

/**
 * Creates a successful result with data
 * @param data The data to return
 * @param meta Optional metadata
 * @returns A Result object with data and no error
 */
export function createSuccess<T>(data: T, meta?: Record<string, any>): Result<T> {
  return {
    data,
    error: null,
    status: DBStatusCode.SUCCESS,
    meta
  };
}

/**
 * Creates an error result with consistent structure
 * @param message Error message
 * @param status Error status code
 * @param meta Optional metadata
 * @returns A Result object with error and no data
 */
export function createError<T>(message: string, status = DBStatusCode.SERVER_ERROR, meta?: Record<string, any>): Result<T> {
  return {
    data: null,
    error: message,
    status,
    meta
  };
}

/**
 * Creates an RLS error result specifically for permission issues
 * @param message Error message
 * @param meta Optional metadata
 * @returns A Result object for RLS errors
 */
export function createRLSError<T>(message: string, meta?: Record<string, any>): Result<T> {
  return createError<T>(
    message || "Permission denied - RLS policy preventing access",
    DBStatusCode.RLS_ERROR,
    meta
  );
}

/**
 * Creates a not found error result
 * @param resource Resource that was not found (e.g., "watchlist")
 * @param id Optional ID of the resource
 * @returns A Result object for not found errors
 */
export function createNotFoundError<T>(resource: string, id?: string): Result<T> {
  const message = id 
    ? `${resource} with ID ${id} not found` 
    : `${resource} not found`;
  
  return createError<T>(message, DBStatusCode.NOT_FOUND);
}

/**
 * Creates a timeout error result
 * @param operation The operation that timed out
 * @param timeoutMs The timeout duration in milliseconds
 * @returns A Result object for timeout errors
 */
export function createTimeoutError<T>(operation: string, timeoutMs: number): Result<T> {
  return createError<T>(
    `Operation "${operation}" timed out after ${timeoutMs}ms`,
    DBStatusCode.TIMEOUT_ERROR,
    { operation, timeoutMs }
  );
}

/**
 * Safely wraps a function that may throw exceptions into a Result
 * @param fn Function to execute
 * @param defaultStatus Default status code for errors
 * @returns A Result with either the function's result or an error
 */
export async function withResultHandling<T>(
  fn: () => Promise<T>,
  defaultStatus = DBStatusCode.SERVER_ERROR
): Promise<Result<T>> {
  try {
    const data = await fn();
    return createSuccess(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Try to determine appropriate status code
    let status = defaultStatus;
    
    if (errorMessage.includes('timed out')) {
      status = DBStatusCode.TIMEOUT_ERROR;
    } else if (errorMessage.includes('permission denied') || errorMessage.includes('PGRST301')) {
      status = DBStatusCode.RLS_ERROR;
    } else if (errorMessage.includes('not found') || errorMessage.includes('PGRST116')) {
      status = DBStatusCode.NOT_FOUND;
    } else if (errorMessage.includes('not authenticated') || errorMessage.includes('JWT')) {
      status = DBStatusCode.UNAUTHORIZED;
    }
    
    return createError(errorMessage, status, { original: error });
  }
}

/**
 * Maps a Supabase data/error response to our standardized Result type
 * @param response Supabase response with data and error
 * @param errorMessage Custom error message (optional)
 * @returns A standardized Result object
 */
export function mapSupabaseResponse<T, R = T>(
  response: { data: T | null; error: any },
  transform?: (data: T) => R
): Result<R> {
  if (response.error) {
    // Map Supabase error codes to our status codes
    let status = DBStatusCode.QUERY_ERROR;
    
    if (response.error.code === 'PGRST301') {
      status = DBStatusCode.RLS_ERROR;
    } else if (response.error.code === 'PGRST116') {
      status = DBStatusCode.NOT_FOUND;
    } else if (response.error.code?.includes('22P02')) {
      status = DBStatusCode.VALIDATION_ERROR;
    } else if (response.error.code?.includes('PGRST104')) {
      status = DBStatusCode.UNAUTHORIZED;
    }
    
    return createError<R>(
      response.error.message || 'Database operation failed',
      status,
      { code: response.error.code, details: response.error.details }
    );
  }
  
  if (response.data === null || response.data === undefined) {
    return createSuccess<R>(null as R);
  }
  
  // Transform data if transformer provided
  const transformedData = transform ? transform(response.data) : response.data as unknown as R;
  return createSuccess(transformedData);
}

/**
 * Determines if a Result represents a success
 * @param result The Result to check
 * @returns True if the result is successful
 */
export function isSuccess<T>(result: Result<T>): boolean {
  return !result.error && result.status !== undefined && result.status >= 200 && result.status < 300;
}

/**
 * Determines if a Result represents an error
 * @param result The Result to check
 * @returns True if the result is an error
 */
export function isError<T>(result: Result<T>): boolean {
  return !!result.error;
}