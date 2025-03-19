
import { supabase } from "@/utils/supabase/client";
import { Watchlist, WatchlistItem, Result } from "@/types/supabase";
import { withSafeArrayQuery, withSafeQuery } from "@/utils/supabase/errorHandlers";
import { createSuccess, createError } from "@/utils/supabase/resultUtils";

// Enable diagnostics logging
const DEBUG = true;

/**
 * Transforms a database watchlist record to our standardized Watchlist interface
 */
const mapToWatchlist = (item: any): Watchlist => {
  if (!item) return null;
  
  return {
    id: item.id,
    name: item.name,
    description: item.description || '',
    owner_id: item.owner_id,
    is_shared: item.is_public || false, // Map is_public (DB) to is_shared (TypeScript)
    created_at: item.created_at,
    updated_at: item.updated_at,
    last_modified: item.updated_at || item.created_at,
    member_count: item.member_count || 1,
    profiles: item.profiles || null,
    userRole: item.userRole || null
  };
};

/**
 * Get all watchlists for the current user (including collaborative ones)
 * with improved error handling using Result<T> pattern
 */
export const getWatchlists = async (): Promise<Result<Watchlist[]>> => {
  if (DEBUG) console.log('[Watchlist] Fetching user watchlists with safe error handling');
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    if (DEBUG) console.error("[Watchlist] Cannot fetch watchlists: No authenticated user");
    return createError("Not authenticated", 401);
  }
  
  // 1. Get user's owned watchlists
  const ownedListsResult = await withSafeArrayQuery(
    async () => supabase
      .from('watchlists')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    'Get owned watchlists',
    20000 // Give it up to 20 seconds
  );
  
  // If we got an error, log it but continue to try collaborative lists
  if (ownedListsResult.error) {
    console.error("[Watchlist] Error fetching owned watchlists:", ownedListsResult.error);
  }
  
  // Safely access owned lists data
  const ownedWatchlists = ownedListsResult.data || [];
  
  if (DEBUG) console.log(`[Watchlist] Found ${ownedWatchlists.length} owned watchlists`);
  
  // 2. Get user's collaborative watchlists
  let collaborativeWatchlists: any[] = [];
  
  try {
    // 2.1. First get the collaboration links
    const collaborationsResult = await withSafeArrayQuery(
      async () => supabase
        .from('watchlist_collaborators')
        .select('watchlist_id')
        .eq('user_id', user.id),
      'Get collaboration links',
      10000
    );
    
    if (collaborationsResult.error) {
      console.error("[Watchlist] Error fetching collaborations:", collaborationsResult.error);
    } else if (collaborationsResult.data && collaborationsResult.data.length > 0) {
      // 2.2. We have collaboration links, fetch the actual watchlists
      const watchlistIds = collaborationsResult.data.map(item => item.watchlist_id);
      
      if (DEBUG) console.log(`[Watchlist] Fetching ${watchlistIds.length} collaborative watchlists`);
      
      const collabListsResult = await withSafeArrayQuery(
        async () => supabase
          .from('watchlists')
          .select('*')
          .in('id', watchlistIds),
        'Get collaborative watchlists',
        15000
      );
      
      if (collabListsResult.error) {
        console.error("[Watchlist] Error fetching collaborative watchlists:", collabListsResult.error);
      } else {
        collaborativeWatchlists = collabListsResult.data || [];
        if (DEBUG) console.log(`[Watchlist] Found ${collaborativeWatchlists.length} collaborative watchlists`);
      }
    }
  } catch (error) {
    console.error("[Watchlist] Exception fetching collaborations:", error);
  }
  
  // 3. Combine, de-duplicate, and transform watchlists
  // No nested access needed with our simplified approach
  const allWatchlists = [
    ...ownedWatchlists,
    ...collaborativeWatchlists
  ].filter(Boolean); // Remove any null/undefined entries
  
  // Remove duplicates based on id
  const uniqueWatchlists = Array.from(
    new Map(allWatchlists.map(list => [list.id, list])).values()
  );
  
  if (DEBUG) console.log(`[Watchlist] Returning ${uniqueWatchlists.length} total watchlists`);
  
  // Transform to match our Watchlist interface
  const transformedWatchlists = uniqueWatchlists.map(mapToWatchlist).filter(Boolean);
  
  return createSuccess(transformedWatchlists);
};

/**
 * Check if the watchlist tables exist and have proper structure
 * @returns Result object with diagnosis results
 */
export const diagnoseWatchlistTables = async (): Promise<Result<any>> => {
  if (DEBUG) console.log('[Watchlist] Diagnosing watchlist database tables');
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (DEBUG) console.log('[Watchlist] Auth check complete:', { authenticated: !!user, error: userError });
  
  if (!user || userError) {
    return createError(
      userError?.message || 'Not authenticated',
      401,
      { authenticated: false }
    );
  }
  
  // Check each table
  const tables = ['watchlists', 'watchlist_items', 'watchlist_collaborators'];
  const results: Record<string, any> = {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email
    }
  };
  
  // Check tables one by one to avoid overwhelming the connection
  for (const table of tables) {
    if (DEBUG) console.log(`[Watchlist] Checking table: ${table}`);
    
    const tableResult = await withSafeQuery(
      async () => supabase
        .from(table as any)
        .select('count')
        .limit(1),
      `Check ${table} table exists`,
      5000
    );
    
    results[`${table}Table`] = !tableResult.error;
    
    if (tableResult.error) {
      results[`${table}Error`] = {
        message: tableResult.error,
        status: tableResult.status
      };
    }
    
    // Add a small delay between table checks
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  if (DEBUG) console.log('[Watchlist] Table diagnostic results:', results);
  
  return createSuccess(results);
};

/**
 * Get a specific watchlist with all its items
 * @param watchlistId ID of the watchlist to retrieve
 * @returns Result containing the watchlist and its items
 */
export const getWatchlistWithItems = async (
  watchlistId: string
): Promise<Result<{ watchlist: Watchlist | null, items: WatchlistItem[] }>> => {
  if (DEBUG) console.log(`[Watchlist] Getting watchlist ${watchlistId} with items`);
  
  try {
    // 1. Get the watchlist with profiles joined
    const watchlistResult = await withSafeQuery(
      async () => supabase
        .from('watchlists')
        .select(`
          *,
          profiles(id, full_name, avatar_url, email, created_at, updated_at)
        `)
        .eq('id', watchlistId)
        .single(),
      `Get watchlist ${watchlistId}`,
      15000
    );
    
    if (watchlistResult.error) {
      console.error(`[Watchlist] Error fetching watchlist ${watchlistId}:`, watchlistResult.error);
      return createSuccess({ watchlist: null, items: [] });
    }
    
    // Transform watchlist to match our interface
    const watchlist = watchlistResult.data ? mapToWatchlist(watchlistResult.data) : null;
    
    // 2. Get the watchlist items
    const itemsResult = await withSafeArrayQuery(
      async () => supabase
        .from('watchlist_items')
        .select('*')
        .eq('watchlist_id', watchlistId)
        .order('created_at', { ascending: false }),
      `Get items for watchlist ${watchlistId}`,
      15000
    );
    
    if (itemsResult.error) {
      console.error(`[Watchlist] Error fetching items for watchlist ${watchlistId}:`, itemsResult.error);
      // Return the watchlist even if we couldn't get items
      return createSuccess({ 
        watchlist, 
        items: [] 
      });
    }
    
    return createSuccess({ 
      watchlist, 
      items: itemsResult.data || [] 
    });
  } catch (error) {
    console.error(`[Watchlist] Unexpected error in getWatchlistWithItems(${watchlistId}):`, error);
    return createError(
      error instanceof Error ? error.message : String(error),
      500,
      { watchlistId }
    );
  }
};
