// Mock implementation of neonWatchlistService for browser environment
// Uses localStorage instead of direct database queries

import { v4 as uuidv4 } from 'uuid';
import { Watchlist, WatchlistItem, Result, DBStatusCode } from '@/types/supabase';

/**
 * Mock implementation of queryWithUser for browser environment
 */
async function mockQueryWithUser(userId: string, query: string, params: any[] = []): Promise<{ data: any[] | null; error: Error | null }> {
  console.log('Mock query executed:', query, params);
  return { data: [], error: null };
}

/**
 * Create a watchlist
 */
async function createWatchlist(
  userId: string,
  name: string,
  description: string = '',
  isShared: boolean = false
): Promise<Result<Watchlist>> {
  try {
    const watchlistId = uuidv4();
    const now = new Date().toISOString();
    
    const watchlist: Watchlist = {
      id: watchlistId,
      name,
      description,
      owner_id: userId,
      is_shared: isShared,
      created_at: now,
      updated_at: now,
      is_public: false,
      last_modified_by: userId
    };
    
    // Store in localStorage
    localStorage.setItem(`watchlist_${watchlistId}`, JSON.stringify(watchlist));
    
    // Update user's watchlists list
    const userWatchlistsKey = `user_watchlists_${userId}`;
    const existingWatchlistsStr = localStorage.getItem(userWatchlistsKey);
    const existingWatchlists = existingWatchlistsStr ? JSON.parse(existingWatchlistsStr) : [];
    
    existingWatchlists.push(watchlistId);
    localStorage.setItem(userWatchlistsKey, JSON.stringify(existingWatchlists));
    
    return {
      data: watchlist,
      error: null,
      status: DBStatusCode.CREATED
    };
  } catch (error) {
    console.error('Error creating watchlist:', error);
    return {
      data: null,
      error: error as Error,
      status: DBStatusCode.SERVER_ERROR
    };
  }
}

/**
 * Get a watchlist by ID
 */
async function getWatchlist(userId: string, watchlistId: string): Promise<Result<Watchlist>> {
  try {
    const watchlistStr = localStorage.getItem(`watchlist_${watchlistId}`);
    
    if (!watchlistStr) {
      return {
        data: null,
        error: new Error('Watchlist not found'),
        status: DBStatusCode.NOT_FOUND
      };
    }
    
    const watchlist = JSON.parse(watchlistStr) as Watchlist;
    
    // Check if user has access to this watchlist
    if (watchlist.owner_id !== userId && !watchlist.is_shared && !watchlist.is_public) {
      return {
        data: null,
        error: new Error('Unauthorized access to watchlist'),
        status: DBStatusCode.UNAUTHORIZED
      };
    }
    
    return {
      data: watchlist,
      error: null,
      status: DBStatusCode.SUCCESS
    };
  } catch (error) {
    console.error('Error getting watchlist:', error);
    return {
      data: null,
      error: error as Error,
      status: DBStatusCode.SERVER_ERROR
    };
  }
}

/**
 * Get all watchlists for a user
 */
async function getWatchlists(userId: string): Promise<Result<Watchlist[]>> {
  try {
    // Get user's watchlist IDs
    const userWatchlistsKey = `user_watchlists_${userId}`;
    const watchlistIdsStr = localStorage.getItem(userWatchlistsKey);
    const watchlistIds = watchlistIdsStr ? JSON.parse(watchlistIdsStr) : [];
    
    const watchlists: Watchlist[] = [];
    
    // Get each watchlist
    for (const watchlistId of watchlistIds) {
      const watchlistStr = localStorage.getItem(`watchlist_${watchlistId}`);
      if (watchlistStr) {
        watchlists.push(JSON.parse(watchlistStr));
      }
    }
    
    // Also get shared watchlists
    const allWatchlistsKeys = Object.keys(localStorage).filter(key => key.startsWith('watchlist_'));
    for (const key of allWatchlistsKeys) {
      const watchlistId = key.replace('watchlist_', '');
      if (!watchlistIds.includes(watchlistId)) {
        const watchlistStr = localStorage.getItem(key);
        if (watchlistStr) {
          const watchlist = JSON.parse(watchlistStr) as Watchlist;
          if (watchlist.is_shared || watchlist.is_public) {
            watchlists.push(watchlist);
          }
        }
      }
    }
    
    return {
      data: watchlists,
      error: null,
      status: DBStatusCode.SUCCESS
    };
  } catch (error) {
    console.error('Error getting watchlists:', error);
    return {
      data: [],
      error: error as Error,
      status: DBStatusCode.SERVER_ERROR
    };
  }
}

/**
 * Update a watchlist
 */
async function updateWatchlist(
  userId: string,
  watchlistId: string,
  updates: Partial<Watchlist>
): Promise<Result<Watchlist>> {
  try {
    // Get the existing watchlist
    const result = await getWatchlist(userId, watchlistId);
    
    if (result.error || !result.data) {
      return result;
    }
    
    const watchlist = result.data;
    
    // Check if user has permission to update
    if (watchlist.owner_id !== userId) {
      return {
        data: null,
        error: new Error('Unauthorized to update watchlist'),
        status: DBStatusCode.UNAUTHORIZED
      };
    }
    
    // Update the watchlist
    const updatedWatchlist: Watchlist = {
      ...watchlist,
      ...updates,
      updated_at: new Date().toISOString(),
      last_modified_by: userId
    };
    
    // Save back to localStorage
    localStorage.setItem(`watchlist_${watchlistId}`, JSON.stringify(updatedWatchlist));
    
    return {
      data: updatedWatchlist,
      error: null,
      status: DBStatusCode.SUCCESS
    };
  } catch (error) {
    console.error('Error updating watchlist:', error);
    return {
      data: null,
      error: error as Error,
      status: DBStatusCode.SERVER_ERROR
    };
  }
}

/**
 * Delete a watchlist
 */
async function deleteWatchlist(userId: string, watchlistId: string): Promise<Result<boolean>> {
  try {
    // Get the existing watchlist
    const result = await getWatchlist(userId, watchlistId);
    
    if (result.error || !result.data) {
      return {
        data: false,
        error: result.error,
        status: result.status
      };
    }
    
    const watchlist = result.data;
    
    // Check if user has permission to delete
    if (watchlist.owner_id !== userId) {
      return {
        data: false,
        error: new Error('Unauthorized to delete watchlist'),
        status: DBStatusCode.UNAUTHORIZED
      };
    }
    
    // Remove from localStorage
    localStorage.removeItem(`watchlist_${watchlistId}`);
    
    // Remove from user's watchlists list
    const userWatchlistsKey = `user_watchlists_${userId}`;
    const watchlistIdsStr = localStorage.getItem(userWatchlistsKey);
    if (watchlistIdsStr) {
      const watchlistIds = JSON.parse(watchlistIdsStr);
      const updatedIds = watchlistIds.filter((id: string) => id !== watchlistId);
      localStorage.setItem(userWatchlistsKey, JSON.stringify(updatedIds));
    }
    
    // Remove all items for this watchlist
    const itemsKey = `watchlist_items_${watchlistId}`;
    localStorage.removeItem(itemsKey);
    
    return {
      data: true,
      error: null,
      status: DBStatusCode.SUCCESS
    };
  } catch (error) {
    console.error('Error deleting watchlist:', error);
    return {
      data: false,
      error: error as Error,
      status: DBStatusCode.SERVER_ERROR
    };
  }
}

/**
 * Add an item to a watchlist
 */
async function addWatchlistItem(
  userId: string,
  watchlistId: string,
  symbol: string,
  notes: string = ''
): Promise<Result<WatchlistItem>> {
  try {
    // Check if user has access to the watchlist
    const watchlistResult = await getWatchlist(userId, watchlistId);
    
    if (watchlistResult.error || !watchlistResult.data) {
      return {
        data: null,
        error: watchlistResult.error,
        status: watchlistResult.status
      };
    }
    
    // Create the item
    const itemId = uuidv4();
    const now = new Date().toISOString();
    
    const item: WatchlistItem = {
      id: itemId,
      watchlist_id: watchlistId,
      symbol,
      notes,
      added_by: userId,
      created_at: now,
      updated_at: now
    };
    
    // Get existing items
    const itemsKey = `watchlist_items_${watchlistId}`;
    const existingItemsStr = localStorage.getItem(itemsKey);
    const existingItems = existingItemsStr ? JSON.parse(existingItemsStr) : [];
    
    // Check if symbol already exists
    const symbolExists = existingItems.some((existingItem: WatchlistItem) => 
      existingItem.symbol === symbol
    );
    
    if (symbolExists) {
      return {
        data: null,
        error: new Error('Symbol already exists in watchlist'),
        status: DBStatusCode.CONFLICT
      };
    }
    
    // Add the new item
    existingItems.push(item);
    localStorage.setItem(itemsKey, JSON.stringify(existingItems));
    
    return {
      data: item,
      error: null,
      status: DBStatusCode.CREATED
    };
  } catch (error) {
    console.error('Error adding watchlist item:', error);
    return {
      data: null,
      error: error as Error,
      status: DBStatusCode.SERVER_ERROR
    };
  }
}

/**
 * Get all items in a watchlist
 */
async function getWatchlistItems(userId: string, watchlistId: string): Promise<Result<WatchlistItem[]>> {
  try {
    // Check if user has access to the watchlist
    const watchlistResult = await getWatchlist(userId, watchlistId);
    
    if (watchlistResult.error || !watchlistResult.data) {
      return {
        data: [],
        error: watchlistResult.error,
        status: watchlistResult.status
      };
    }
    
    // Get items
    const itemsKey = `watchlist_items_${watchlistId}`;
    const itemsStr = localStorage.getItem(itemsKey);
    const items = itemsStr ? JSON.parse(itemsStr) : [];
    
    return {
      data: items,
      error: null,
      status: DBStatusCode.SUCCESS
    };
  } catch (error) {
    console.error('Error getting watchlist items:', error);
    return {
      data: [],
      error: error as Error,
      status: DBStatusCode.SERVER_ERROR
    };
  }
}

/**
 * Remove an item from a watchlist
 */
async function removeWatchlistItem(
  userId: string,
  watchlistId: string,
  itemId: string
): Promise<Result<boolean>> {
  try {
    // Check if user has access to the watchlist
    const watchlistResult = await getWatchlist(userId, watchlistId);
    
    if (watchlistResult.error || !watchlistResult.data) {
      return {
        data: false,
        error: watchlistResult.error,
        status: watchlistResult.status
      };
    }
    
    // Get existing items
    const itemsKey = `watchlist_items_${watchlistId}`;
    const itemsStr = localStorage.getItem(itemsKey);
    
    if (!itemsStr) {
      return {
        data: false,
        error: new Error('Item not found'),
        status: DBStatusCode.NOT_FOUND
      };
    }
    
    const items = JSON.parse(itemsStr);
    
    // Find the item
    const itemIndex = items.findIndex((item: WatchlistItem) => item.id === itemId);
    
    if (itemIndex === -1) {
      return {
        data: false,
        error: new Error('Item not found'),
        status: DBStatusCode.NOT_FOUND
      };
    }
    
    // Remove the item
    items.splice(itemIndex, 1);
    localStorage.setItem(itemsKey, JSON.stringify(items));
    
    return {
      data: true,
      error: null,
      status: DBStatusCode.SUCCESS
    };
  } catch (error) {
    console.error('Error removing watchlist item:', error);
    return {
      data: false,
      error: error as Error,
      status: DBStatusCode.SERVER_ERROR
    };
  }
}

/**
 * Update a watchlist item
 */
async function updateWatchlistItem(
  userId: string,
  watchlistId: string,
  itemId: string,
  updates: Partial<WatchlistItem>
): Promise<Result<WatchlistItem>> {
  try {
    // Check if user has access to the watchlist
    const watchlistResult = await getWatchlist(userId, watchlistId);
    
    if (watchlistResult.error || !watchlistResult.data) {
      return {
        data: null,
        error: watchlistResult.error,
        status: watchlistResult.status
      };
    }
    
    // Get existing items
    const itemsKey = `watchlist_items_${watchlistId}`;
    const itemsStr = localStorage.getItem(itemsKey);
    
    if (!itemsStr) {
      return {
        data: null,
        error: new Error('Item not found'),
        status: DBStatusCode.NOT_FOUND
      };
    }
    
    const items = JSON.parse(itemsStr);
    
    // Find the item
    const itemIndex = items.findIndex((item: WatchlistItem) => item.id === itemId);
    
    if (itemIndex === -1) {
      return {
        data: null,
        error: new Error('Item not found'),
        status: DBStatusCode.NOT_FOUND
      };
    }
    
    // Update the item
    const item = items[itemIndex];
    const updatedItem = {
      ...item,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    items[itemIndex] = updatedItem;
    localStorage.setItem(itemsKey, JSON.stringify(items));
    
    return {
      data: updatedItem,
      error: null,
      status: DBStatusCode.SUCCESS
    };
  } catch (error) {
    console.error('Error updating watchlist item:', error);
    return {
      data: null,
      error: error as Error,
      status: DBStatusCode.SERVER_ERROR
    };
  }
}

export const mockNeonWatchlistService = {
  createWatchlist,
  getWatchlist,
  getWatchlists,
  updateWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  getWatchlistItems,
  removeWatchlistItem,
  updateWatchlistItem
};

export default mockNeonWatchlistService;
