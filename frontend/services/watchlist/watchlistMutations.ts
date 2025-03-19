
import { supabase, withSessionCheck } from "@/utils/supabase/client";
import { Watchlist, Result, DBStatusCode } from "@/types/supabase";
import { 
  createSuccess, 
  createError, 
  createRLSError, 
  mapSupabaseResponse 
} from "@/utils/supabase/resultUtils";
import { 
  mapDatabaseFields, 
  watchlistFieldMappings 
} from "@/utils/supabase/dbUtils";

// Enable debug mode for detailed logging
const DEBUG = true;

// Error logging with context
const logError = (context: string, error: any, additionalInfo?: any) => {
  console.error(`[WatchlistMutations] ${context}:`, error);
  if (DEBUG && additionalInfo) {
    console.error(`[WatchlistMutations] Additional info for ${context}:`, additionalInfo);
  }
};

// Helper function to transform database object to Watchlist interface
// This is now consistent with the field mapping utility
const mapToWatchlist = (item: any): Watchlist => {
  if (!item) return null;
  
  return mapDatabaseFields<Watchlist>({
    ...item,
    member_count: item.member_count || 1,
    last_modified: item.updated_at || item.created_at,
  }, watchlistFieldMappings);
};

// Create a new watchlist with standardized result pattern
export const createWatchlist = async (watchlistData: { 
  name: string; 
  description?: string; 
  is_public?: boolean; 
}): Promise<Result<Watchlist>> => {
  return withSessionCheck(async () => {
    try {
      if (DEBUG) console.log('[WatchlistMutations] Creating watchlist:', watchlistData);
      
      // Get the current user ID - should be authenticated due to withSessionCheck
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        logError("Error getting current user", userError || new Error("No user found"));
        return createError<Watchlist>(
          "User authentication failed: " + (userError?.message || "No user found"),
          DBStatusCode.UNAUTHORIZED
        );
      }
      
      // Validate input
      if (!watchlistData.name || watchlistData.name.trim() === '') {
        return createError<Watchlist>(
          "Watchlist name is required",
          DBStatusCode.VALIDATION_ERROR
        );
      }
      
      // Insert the watchlist with proper DB field names
      const response = await supabase
        .from('watchlists')
        .insert({
          name: watchlistData.name,
          description: watchlistData.description,
          created_by: user.id,
          is_public: watchlistData.is_public ?? false // Use is_public for DB
        })
        .select()
        .single();
      
      // Use utility to map Supabase response to our standard Result
      return mapSupabaseResponse<any, Watchlist>(
        response,
        (data) => mapToWatchlist(data)
      );
    } catch (error: any) {
      logError("Exception creating watchlist", error);
      return createError<Watchlist>(
        error.message || "Unknown error creating watchlist",
        DBStatusCode.SERVER_ERROR,
        { original: error }
      );
    }
  }, { retries: 1 }); // Allow one retry for auth issues
};

// Update a watchlist with standardized result pattern
export const updateWatchlist = async (
  watchlistId: string, 
  updates: Partial<Watchlist>
): Promise<Result<boolean>> => {
  return withSessionCheck(async () => {
    try {
      if (DEBUG) console.log(`[WatchlistMutations] Updating watchlist: ${watchlistId}`);
      
      // Validate input
      if (!watchlistId) {
        return createError<boolean>(
          "Watchlist ID is required",
          DBStatusCode.VALIDATION_ERROR
        );
      }
      
      // Use utility to convert interface fields to database fields
      const dbUpdates = mapDatabaseFields(updates, watchlistFieldMappings);
      
      // Remove metadata fields that shouldn't be updated directly
      ['id', 'created_at', 'updated_at', 'last_modified', 'member_count'].forEach(field => {
        if (field in dbUpdates) {
          delete dbUpdates[field];
        }
      });
      
      // Make the update
      const response = await supabase
        .from('watchlists')
        .update(dbUpdates)
        .eq('id', watchlistId);
      
      if (response.error) {
        logError(`Error updating watchlist ${watchlistId}`, response.error, { updates });
        
        // Use our map utility to convert to standard result
        return mapSupabaseResponse(response, () => false);
      }
      
      return createSuccess(true);
    } catch (error: any) {
      logError(`Error updating watchlist ${watchlistId}`, error);
      return createError<boolean>(
        error.message || `Failed to update watchlist ${watchlistId}`,
        DBStatusCode.SERVER_ERROR
      );
    }
  }, { retries: 1 }); // Allow one retry for auth issues
};

// Delete a watchlist with standardized result pattern
export const deleteWatchlist = async (watchlistId: string): Promise<Result<boolean>> => {
  return withSessionCheck(async () => {
    try {
      if (DEBUG) console.log(`[WatchlistMutations] Deleting watchlist: ${watchlistId}`);
      
      // Validate input
      if (!watchlistId) {
        return createError<boolean>(
          "Watchlist ID is required", 
          DBStatusCode.VALIDATION_ERROR
        );
      }
      
      // Delete the watchlist
      const response = await supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId);
      
      if (response.error) {
        logError(`Error deleting watchlist ${watchlistId}`, response.error);
        
        // Check if it's a "not found" error
        if (response.error.code === 'PGRST116') {
          return createError<boolean>(
            `Watchlist with ID ${watchlistId} not found`,
            DBStatusCode.NOT_FOUND
          );
        }
        
        // Use our map utility to convert to standard result
        return mapSupabaseResponse(response, () => false);
      }
      
      return createSuccess(true);
    } catch (error: any) {
      logError(`Error deleting watchlist ${watchlistId}`, error);
      return createError<boolean>(
        error.message || `Failed to delete watchlist ${watchlistId}`,
        DBStatusCode.SERVER_ERROR
      );
    }
  }, { retries: 1 }); // Allow one retry for auth issues
};
