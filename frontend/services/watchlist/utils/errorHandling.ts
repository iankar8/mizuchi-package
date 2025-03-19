
/**
 * Error handling utilities for watchlist service
 */

// Enable detailed debugging for watchlist operations
const DEBUG = true;

/**
 * Generic try-catch wrapper for service functions with enhanced debugging
 * @param fn - The async function to wrap with error handling
 * @param defaultValue - The default value to return on error
 * @param errorMsg - Optional custom error message
 * @param context - Optional context for detailed debugging
 * @returns The result of the function or the default value if an error occurred
 */
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  defaultValue: T,
  errorMsg = "An error occurred",
  context?: Record<string, any>
): Promise<T> => {
  if (DEBUG) {
    console.log(`[Watchlist Debug] Starting: ${errorMsg}`, context ? context : '');
  }
  
  try {
    const result = await fn();
    
    if (DEBUG) {
      console.log(`[Watchlist Debug] Success: ${errorMsg}`, {
        hasResult: !!result,
        isArray: Array.isArray(result),
        length: Array.isArray(result) ? result.length : undefined,
        type: typeof result
      });
    }
    
    return result;
  } catch (error: any) {
    // Provide detailed error information
    console.error(`[Watchlist Error] ${errorMsg}:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      context
    });
    
    // Check for specific Supabase error codes
    if (error.code === 'PGRST301') {
      console.error('[Watchlist Error] Permission denied - RLS policy may be blocking access');
    } else if (error.code === 'PGRST116') {
      console.error('[Watchlist Error] Table does not exist');
    } else if (error.code?.startsWith('22P02')) {
      console.error('[Watchlist Error] Invalid input syntax or type');
    } else if (error.code === 'PGRST104') {
      console.error('[Watchlist Error] Not authenticated - sign in required');
    }
    
    return defaultValue;
  }
};
