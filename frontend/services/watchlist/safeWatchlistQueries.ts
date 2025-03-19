
import { Watchlist, WatchlistItem, Result } from "@/types/supabase";
import { getWatchlists, getWatchlistWithItems } from "./watchlistQueries";
import { createSuccess, createError } from "@/utils/supabase/resultUtils";
import { ensureArray } from "./utils/safeArrayUtils";

/**
 * @deprecated Not needed with the Result pattern. Use getWatchlists() directly.
 * Backwards compatibility wrapper for getUserWatchlists to ensure it always returns an array
 * @returns An array of watchlists, or an empty array if an error occurred
 */
export const safeGetUserWatchlists = async (): Promise<Watchlist[]> => {
  console.warn('safeGetUserWatchlists is deprecated. Use getWatchlists() directly and handle the Result.');
  
  try {
    const result = await getWatchlists();
    
    if (result.error) {
      console.error(`[Watchlist] Error in safeGetUserWatchlists: ${result.error}`);
      return [];
    }
    
    return ensureArray(result.data);
  } catch (error) {
    console.error('[Watchlist] Exception in safeGetUserWatchlists:', error);
    return [];
  }
};

/**
 * @deprecated Not needed with the Result pattern. Use getWatchlistWithItems() directly.
 * Backwards compatibility wrapper for getWatchlistWithItems to ensure items is always an array
 * @param watchlistId - The ID of the watchlist to fetch
 * @returns An object with the watchlist and its items, or null watchlist and empty items array if an error occurred
 */
export const safeGetWatchlistWithItems = async (watchlistId: string) => {
  console.warn('safeGetWatchlistWithItems is deprecated. Use getWatchlistWithItems() directly and handle the Result.');
  
  try {
    const result = await getWatchlistWithItems(watchlistId);
    
    if (result.error) {
      console.error(`[Watchlist] Error in safeGetWatchlistWithItems: ${result.error}`);
      return {
        watchlist: null,
        items: []
      };
    }
    
    return {
      watchlist: result.data.watchlist,
      items: ensureArray(result.data.items)
    };
  } catch (error) {
    console.error(`[Watchlist] Exception in safeGetWatchlistWithItems for ${watchlistId}:`, error);
    return {
      watchlist: null,
      items: []
    };
  }
};
