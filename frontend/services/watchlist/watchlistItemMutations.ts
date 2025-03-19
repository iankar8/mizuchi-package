
import { supabase } from "@/utils/supabase/client";
import { Result, WatchlistItem, DBStatusCode } from "@/types/supabase";
import { 
  createSuccess, 
  createError, 
  createNotFoundError, 
  mapSupabaseResponse,
  withResultHandling
} from "@/utils/supabase/resultUtils";

// Add an item to a watchlist
export const addItemToWatchlist = async (
  watchlistId: string, 
  symbol: string, 
  notes?: string
): Promise<Result<WatchlistItem>> => {
  return withResultHandling(async () => {
    // Get the current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return createError<WatchlistItem>(
        "User not authenticated", 
        DBStatusCode.UNAUTHORIZED
      );
    }
    
    // First check if the watchlist exists and user has access
    const { data: watchlistData, error: watchlistError } = await supabase
      .from('watchlists')
      .select('id')
      .eq('id', watchlistId)
      .single();
      
    if (watchlistError) {
      if (watchlistError.code === 'PGRST116') {
        return createNotFoundError<WatchlistItem>('Watchlist', watchlistId);
      }
      
      // Handle permission error
      if (watchlistError.code === 'PGRST301') {
        return createError<WatchlistItem>(
          "You don't have permission to add items to this watchlist", 
          DBStatusCode.RLS_ERROR
        );
      }
      
      return createError<WatchlistItem>(
        watchlistError.message, 
        DBStatusCode.QUERY_ERROR
      );
    }
    
    // Check for duplicate symbol in the watchlist
    const { data: existingItems, error: checkError } = await supabase
      .from('watchlist_items')
      .select('id, symbol')
      .eq('watchlist_id', watchlistId)
      .eq('symbol', symbol.toUpperCase());
      
    if (checkError) {
      return createError<WatchlistItem>(
        "Error checking for duplicate items",
        DBStatusCode.QUERY_ERROR
      );
    }
    
    if (existingItems && existingItems.length > 0) {
      return createError<WatchlistItem>(
        `Symbol ${symbol.toUpperCase()} already exists in this watchlist`,
        DBStatusCode.VALIDATION_ERROR,
        { existingItem: existingItems[0] }
      );
    }
    
    // Add the item
    const response = await supabase
      .from('watchlist_items')
      .insert({
        watchlist_id: watchlistId,
        symbol: symbol.toUpperCase(),
        added_by: user.id,
        notes
      })
      .select()
      .single();
      
    return mapSupabaseResponse<any, WatchlistItem>(response);
  });
};

// Update a watchlist item
export const updateWatchlistItem = async (
  itemId: string, 
  updates: Partial<WatchlistItem>
): Promise<Result<boolean>> => {
  return withResultHandling(async () => {
    // First check if the item exists and user has access
    const { data: itemData, error: itemError } = await supabase
      .from('watchlist_items')
      .select('id')
      .eq('id', itemId)
      .single();
      
    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return createNotFoundError<boolean>('Watchlist item', itemId);
      }
      
      // Handle permission error
      if (itemError.code === 'PGRST301') {
        return createError<boolean>(
          "You don't have permission to update this watchlist item", 
          DBStatusCode.RLS_ERROR
        );
      }
      
      return createError<boolean>(
        itemError.message, 
        DBStatusCode.QUERY_ERROR
      );
    }
    
    // Perform the update
    const { error } = await supabase
      .from('watchlist_items')
      .update(updates)
      .eq('id', itemId);
      
    if (error) {
      return createError<boolean>(
        error.message,
        DBStatusCode.QUERY_ERROR,
        { code: error.code }
      );
    }
    
    return createSuccess(true);
  });
};

// Remove an item from a watchlist
export const removeItemFromWatchlist = async (itemId: string): Promise<Result<boolean>> => {
  return withResultHandling(async () => {
    // First check if the item exists and user has access
    const { data: itemData, error: itemError } = await supabase
      .from('watchlist_items')
      .select('id, watchlist_id')
      .eq('id', itemId)
      .single();
      
    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return createNotFoundError<boolean>('Watchlist item', itemId);
      }
      
      // Handle permission error
      if (itemError.code === 'PGRST301') {
        return createError<boolean>(
          "You don't have permission to remove this watchlist item", 
          DBStatusCode.RLS_ERROR
        );
      }
      
      return createError<boolean>(
        itemError.message, 
        DBStatusCode.QUERY_ERROR
      );
    }
    
    // Perform the delete
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('id', itemId);
      
    if (error) {
      return createError<boolean>(
        error.message,
        DBStatusCode.QUERY_ERROR,
        { code: error.code }
      );
    }
    
    return createSuccess(true);
  });
};
