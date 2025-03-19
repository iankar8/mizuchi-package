import { supabase } from '../../utils/supabase/client';
import { watchlistSecurityService } from './securityService';

/**
 * Security interceptor for watchlist operations
 * This middleware layer adds security checks before database operations
 */
export const securityInterceptor = {
  /**
   * Apply owner-only security check before executing a function
   * @param watchlistId The watchlist ID to check ownership for
   * @param operation The operation to execute if user is the owner
   */
  async withOwnerCheck<T>(watchlistId: string, operation: () => Promise<T>): Promise<T> {
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }
      
      if (!user || !user.user) {
        throw new Error('User not authenticated');
      }
      
      // Check if the user is the owner
      await watchlistSecurityService.assertCanModifyWatchlist(user.user.id, watchlistId);
      
      // If we got here, the user is the owner, so execute the operation
      return await operation();
    } catch (error) {
      // Re-throw the error with a clear message
      if (error instanceof Error) {
        throw new Error(`Security check failed: ${error.message}`);
      }
      throw error;
    }
  },
  
  /**
   * Apply access security check before executing a function
   * @param watchlistId The watchlist ID to check access for
   * @param operation The operation to execute if user has access
   */
  async withAccessCheck<T>(watchlistId: string, operation: () => Promise<T>): Promise<T> {
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }
      
      if (!user || !user.user) {
        throw new Error('User not authenticated');
      }
      
      // Check if the user has access to the watchlist
      await watchlistSecurityService.assertCanAccessWatchlist(user.user.id, watchlistId);
      
      // If we got here, the user has access, so execute the operation
      return await operation();
    } catch (error) {
      // Re-throw the error with a clear message
      if (error instanceof Error) {
        throw new Error(`Security check failed: ${error.message}`);
      }
      throw error;
    }
  }
};
