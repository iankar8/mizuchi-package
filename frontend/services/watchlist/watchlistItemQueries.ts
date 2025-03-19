
import { supabase, withSessionCheck } from "@/utils/supabase/client";
import { Watchlist, WatchlistItem } from "@/types/supabase";
import fmpService from "../fmpService";

// Enable debugging
const DEBUG = true;

// Get a single watchlist by ID with its items
export const getWatchlistWithItems = async (watchlistId: string): Promise<{watchlist: Watchlist | null, items: WatchlistItem[]}> => {
  console.log(`[Watchlist] DETAILED DEBUG: Getting watchlist with ID: ${watchlistId}`);
  return withSessionCheck(async () => {
    try {
      // First, verify user's access to this watchlist
      console.log(`[Watchlist] Getting current user`);
      const { data: auth } = await supabase.auth.getUser();
      console.log(`[Watchlist] Current user:`, auth.user?.id);
      
      // Get the watchlist
      console.log(`[Watchlist] Fetching watchlist ${watchlistId}`);
      const { data: watchlist, error: watchlistError } = await supabase
        .from('watchlists')
        .select(`
          *,
          profiles:created_by(id, full_name, avatar_url, email, created_at, updated_at)
        `)
        .eq('id', watchlistId)
        .single();
        
      if (watchlistError) {
        console.error(`[Watchlist] Error fetching watchlist: ${watchlistId}`, {
          error: watchlistError,
          code: watchlistError.code,
          message: watchlistError.message,
          details: watchlistError.details
        });
        throw watchlistError;
      }
      
      console.log(`[Watchlist] Successfully found watchlist:`, {
        id: watchlist.id,
        name: watchlist.name,
        ownerId: watchlist.created_by
      });
      
      // Get the watchlist items
      console.log(`[Watchlist] Fetching items for watchlist ${watchlistId}`);
      const { data: items, error: itemsError } = await supabase
        .from('watchlist_items')
        .select(`
          *,
          profiles:added_by(id, full_name, avatar_url, email, created_at, updated_at)
        `)
        .eq('watchlist_id', watchlistId)
        .order('created_at', { ascending: false });
        
      if (itemsError) {
        console.error(`[Watchlist] Error fetching items for watchlist: ${watchlistId}`, {
          error: itemsError,
          code: itemsError.code,
          message: itemsError.message,
          details: itemsError.details
        });
        throw itemsError;
      }
      
      // For diagnostics, we'll skip market data to avoid delays
      const enhancedItems = [...(items || [])];
      
      console.log(`[Watchlist] Found ${enhancedItems.length} items for watchlist ${watchlistId}`);
      
      // Transform watchlist to match our interface
      const transformedWatchlist = watchlist ? {
        ...watchlist,
        owner_id: watchlist.created_by || '',
        is_shared: watchlist.is_public || false,
        member_count: 1,  // Default value
        last_modified: watchlist.updated_at || watchlist.created_at
      } as Watchlist : null;
      
      return {
        watchlist: transformedWatchlist,
        items: enhancedItems as WatchlistItem[]
      };
    } catch (error: any) {
      console.error("[Watchlist] Error fetching watchlist with items:", {
        id: watchlistId,
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });
      return {
        watchlist: null,
        items: []
      };
    }
  }, { retries: 1 });
};
