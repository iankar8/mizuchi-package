
// Import types from the legacy interface for backward compatibility
import type { Watchlist, WatchlistItem } from "@/services/watchlist.service";
import { getWatchlists } from "./watchlistQueries";
import { getWatchlistWithItems } from "./watchlistItemQueries";
import { createWatchlist, updateWatchlist, deleteWatchlist } from "./watchlistMutations";
import { addItemToWatchlist, updateWatchlistItem, removeItemFromWatchlist } from "./watchlistItemMutations";
import { shareWatchlist, getWatchlistCollaborators, removeCollaborator } from "./watchlistCollaborators";
import { safeGetUserWatchlists, safeGetWatchlistWithItems } from "./safeWatchlistQueries";
import { supabase, withSessionCheck, withTimeout } from "@/utils/supabase/client";

// Type for realtime callbacks
type RealtimeCallback = (payload: any) => void;

// Enable debug mode for detailed logging only in development
const DEBUG = import.meta.env.MODE === 'development';

// Default timeout from environment variable or fallback to 15s
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000; 

// Set timeout values for different operations
const TIMEOUTS = {
  getUserWatchlists: DEFAULT_TIMEOUT,
  getWatchlistItems: DEFAULT_TIMEOUT,
  createWatchlist: DEFAULT_TIMEOUT + 3000, // Give creation a bit more time
  updateWatchlist: DEFAULT_TIMEOUT,
  deleteWatchlist: DEFAULT_TIMEOUT,
};

// Error logging with context
const logError = (context: string, error: any, additionalInfo?: any) => {
  console.error(`[WatchlistService] ${context}:`, error);
  if (DEBUG && additionalInfo) {
    console.error(`[WatchlistService] Additional info for ${context}:`, additionalInfo);
  }
};

// Helper function for retrying failed operations
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  retryDelay: number = 1000,
  operationName: string
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (attempt > 1 && DEBUG) {
        console.log(`[WatchlistService] Retry attempt ${attempt-1} for ${operationName}`);
      }
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is related to RLS policies
      if (error?.code === 'PGRST301') {
        console.error('[WatchlistService] RLS policy error detected, attempting token refresh...');
        // Attempt to refresh the token
        try {
          await supabase.auth.refreshSession();
          console.log('[WatchlistService] Token refreshed, retrying operation...');
        } catch (refreshError) {
          console.error('[WatchlistService] Token refresh failed:', refreshError);
        }
      }
      
      if (attempt <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  logError(`All retry attempts failed for ${operationName}`, lastError);
  throw lastError;
};

// Transform database object to Watchlist interface
const mapToWatchlist = (item: any): Watchlist => {
  if (!item) return null;
  
  return {
    id: item.id,
    name: item.name,
    description: item.description || '',
    owner_id: item.owner_id || item.created_by, // Use owner_id, fall back to created_by for backward compatibility
    is_shared: item.is_public || false, // Map is_public (DB) to is_shared (TypeScript)
    created_at: item.created_at,
    updated_at: item.updated_at,
    last_modified: item.updated_at || item.created_at,
    member_count: item.member_count || 1,
    profiles: item.profiles || null,
    userRole: item.userRole || null
  };
};

// Service for watchlist operations - refactored for better organization
const watchlistService = {
  // Safe watchlist queries that guarantee arrays with timeout handling
  getUserWatchlists: async (): Promise<Watchlist[]> => {
    console.log('[WatchlistService] Getting user watchlists with session check');
    
    return withSessionCheck(async () => {
      try {
        // First explicitly verify we have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.access_token) {
          console.error('[WatchlistService] No valid session found, refreshing token');
          // Attempt to refresh the token
          try {
            await supabase.auth.refreshSession();
            console.log('[WatchlistService] Token refreshed, proceeding with watchlist fetch');
          } catch (refreshError) {
            console.error('[WatchlistService] Failed to refresh token:', refreshError);
            throw new Error('Authentication issue: Session expired or invalid');
          }
        } else {
          console.log('[WatchlistService] Valid session found, proceeding with watchlist fetch');
        }
        
        // Try the safe method first with retry mechanism
        try {
          return await withRetry(
            () => withTimeout(safeGetUserWatchlists(), TIMEOUTS.getUserWatchlists, 'getUserWatchlists'),
            2,
            1000,
            'getUserWatchlists'
          );
        } catch (safeError) {
          // If the safe method fails, try direct database access
          console.warn('[WatchlistService] Safe method failed, trying direct access:', safeError);
          
          // Get current user - session should be valid due to withSessionCheck
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            console.warn('[WatchlistService] No authenticated user found');
            return [];
          }
          
          // Direct database query
          const { data, error } = await supabase
            .from('watchlists')
            .select('*')
            .eq('owner_id', user.id);
          
          if (error) {
            logError('Database error in getUserWatchlists', error, {
              code: error.code,
              message: error.message,
              userId: user.id
            });
            
            if (error.code === 'PGRST301') {
              logError('RLS policy error - permission denied', error);
            }
            
            throw error;
          }
          
          // Transform database objects to match Watchlist interface
          const watchlists = Array.isArray(data) 
            ? data.map(mapToWatchlist).filter(Boolean) 
            : [];
          
          return watchlists;
        }
      } catch (error) {
        logError('Error getting watchlists', error);
        return [];
      }
    });
  },
  
  getWatchlistWithItems: async (watchlistId: string) => {
    console.log(`[WatchlistService] Getting watchlist ${watchlistId} with items`);
    
    return withSessionCheck(async () => {
      try {
        const result = await withTimeout(
          safeGetWatchlistWithItems(watchlistId), 
          TIMEOUTS.getWatchlistItems, 
          'getWatchlistWithItems'
        );
        
        if (result.watchlist) {
          result.watchlist = mapToWatchlist(result.watchlist);
        }
        
        return result;
      } catch (error) {
        logError(`Error getting watchlist ${watchlistId}`, error);
        return { watchlist: null, items: [] };
      }
    });
  },
  
  // Original functions still available for direct access if needed
  getRawWatchlists: async (): Promise<Watchlist[]> => {
    console.log('[WatchlistService] Getting raw watchlists with session check');
    
    return withSessionCheck(async () => {
      try {
        // Try standard method first
        try {
          return await withTimeout(getWatchlists(), TIMEOUTS.getUserWatchlists, 'getRawWatchlists');
        } catch (timeoutError) {
          // If timeout occurs, try direct database access
          console.warn('[WatchlistService] Standard method timed out, trying direct access');
          
          // Get current user - session should be valid due to withSessionCheck
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            console.warn('[WatchlistService] No authenticated user found for raw watchlists');
            return [];
          }
          
          // Direct database query
          const { data, error } = await supabase
            .from('watchlists')
            .select('*')
            .eq('owner_id', user.id);
          
          if (error) {
            throw error;
          }
          
          if (DEBUG) console.log('[WatchlistService] Direct access found', data?.length || 0, 'watchlists');
          
          // Transform database objects to match Watchlist interface
          const watchlists = Array.isArray(data) 
            ? data.map(mapToWatchlist).filter(Boolean) 
            : [];
          
          return watchlists;
        }
      } catch (error) {
        logError("Error in getRawWatchlists", error);
        return [];
      }
    });
  },
  
  getRawWatchlistWithItems: async (watchlistId: string) => {
    console.log(`[WatchlistService] Getting raw watchlist ${watchlistId} with session check`);
    
    return withSessionCheck(async () => {
      try {
        const result = await withTimeout(
          getWatchlistWithItems(watchlistId), 
          TIMEOUTS.getWatchlistItems, 
          'getRawWatchlistWithItems'
        );
        
        if (result.watchlist) {
          result.watchlist = mapToWatchlist(result.watchlist);
        }
        
        return result;
      } catch (error) {
        logError(`Error getting raw watchlist ${watchlistId}`, error);
        return { watchlist: null, items: [] };
      }
    });
  },
  
  // Realtime subscriptions with retry logic
  subscribeToWatchlist: (watchlistId: string, callback: RealtimeCallback) => {
    console.log(`[WatchlistService] Setting up subscription for watchlist ${watchlistId}`);
    
    let subscription: any;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Function to create and subscribe to a channel
    const setupSubscription = () => {
      try {
        // Clean up previous subscription if it exists
        if (subscription) {
          try {
            supabase.removeChannel(subscription);
          } catch (cleanupError) {
            if (DEBUG) console.warn(`[WatchlistService] Error cleaning up previous subscription:`, cleanupError);
          }
        }
        
        // Set up realtime subscription for the specific watchlist with enhanced configuration
        subscription = supabase
          .channel(`watchlist-${watchlistId}`, {
            config: {
              broadcast: { self: true },
              presence: { key: '' },
              // Enable private channel with RLS protection
              private: true,
            }
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'watchlists',
            filter: `id=eq.${watchlistId}`
          }, (payload) => {
            if (DEBUG) console.log(`[WatchlistService] Watchlist ${watchlistId} changed:`, payload);
            callback(payload);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`[WatchlistService] Successfully subscribed to watchlist ${watchlistId}`);
              // Reset retry count on successful subscription
              retryCount = 0;
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`[WatchlistService] Error subscribing to watchlist ${watchlistId}`);
              
              // Attempt to retry subscription
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                console.log(`[WatchlistService] Retrying subscription (${retryCount}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms...`);
                
                // Clear any existing timeout
                if (retryTimeout) clearTimeout(retryTimeout);
                
                // Set up retry with exponential backoff
                retryTimeout = setTimeout(() => {
                  setupSubscription();
                }, RETRY_DELAY_MS * Math.pow(2, retryCount - 1));
              } else {
                console.error(`[WatchlistService] Max retries (${MAX_RETRIES}) reached for watchlist ${watchlistId}`);
              }
            }
          });
      } catch (error) {
        logError(`Error setting up subscription for watchlist ${watchlistId}`, error);
        
        // Attempt to retry subscription
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`[WatchlistService] Retrying subscription (${retryCount}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms...`);
          
          // Clear any existing timeout
          if (retryTimeout) clearTimeout(retryTimeout);
          
          // Set up retry with exponential backoff
          retryTimeout = setTimeout(() => {
            setupSubscription();
          }, RETRY_DELAY_MS * Math.pow(2, retryCount - 1));
        }
      }
    };
    
    // Initial setup
    setupSubscription();
    
    // Return unsubscribe function
    return () => {
      console.log(`[WatchlistService] Cleaning up subscription for watchlist ${watchlistId}`);
      
      // Clear any pending retry timeout
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      
      // Remove the channel if it exists
      if (subscription) {
        try {
          supabase.removeChannel(subscription);
        } catch (cleanupError) {
          console.warn(`[WatchlistService] Error cleaning up subscription:`, cleanupError);
        }
      }
    };
  },
  
  subscribeToAllWatchlists: (callback: RealtimeCallback) => {
    console.log('[WatchlistService] Setting up subscription for all watchlists');
    
    try {
      // Set up realtime subscription for all watchlists with enhanced configuration
      const subscription = supabase
        .channel('all-watchlists', {
          config: {
            broadcast: { self: true },
            presence: { key: '' },
            // Enable private channel with RLS protection
            private: true,
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'watchlists'
        }, (payload) => {
          console.log('[WatchlistService] Watchlist changed:', payload);
          callback(payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[WatchlistService] Successfully subscribed to all watchlists');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[WatchlistService] Error subscribing to all watchlists');
          }
        });
      
      // Return unsubscribe function
      return () => {
        console.log('[WatchlistService] Cleaning up subscription for all watchlists');
        supabase.removeChannel(subscription);
      };
    } catch (error) {
      logError('Error setting up subscription for all watchlists', error);
      // Return a no-op function in case of error
      return () => {};
    }
  },
  
  subscribeToWatchlistItems: (watchlistId: string, callback: RealtimeCallback) => {
    console.log(`[WatchlistService] Setting up items subscription for watchlist ${watchlistId}`);
    
    try {
      // Set up realtime subscription for the items in a specific watchlist with enhanced configuration
      const subscription = supabase
        .channel(`watchlist-items-${watchlistId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: '' },
            // Enable private channel with RLS protection
            private: true,
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'watchlist_items',
          filter: `watchlist_id=eq.${watchlistId}`
        }, (payload) => {
          console.log(`[WatchlistService] Watchlist item changed for ${watchlistId}:`, payload);
          callback(payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[WatchlistService] Successfully subscribed to items for watchlist ${watchlistId}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[WatchlistService] Error subscribing to items for watchlist ${watchlistId}`);
          }
        });
      
      // Return unsubscribe function
      return () => {
        console.log(`[WatchlistService] Cleaning up items subscription for watchlist ${watchlistId}`);
        supabase.removeChannel(subscription);
      };
    } catch (error) {
      logError(`Error setting up items subscription for watchlist ${watchlistId}`, error);
      // Return a no-op function in case of error
      return () => {};
    }
  },
  
  // Watchlist mutations with proper field mapping
  createWatchlist: async (watchlistData: { 
    name: string; 
    description?: string; 
    is_shared?: boolean;
    symbols?: string[] 
  }): Promise<Watchlist> => {
    console.log('[WatchlistService] Creating watchlist with session check');
    
    try {
      // Use the standardized createWatchlist function that returns a Result
      const result = await createWatchlist({
        name: watchlistData.name,
        description: watchlistData.description,
        is_public: watchlistData.is_shared
      });
      
      // Check if the operation was successful
      if (result.error) {
        // Handle the error consistently
        const error = new Error(result.error);
        // Add status to the error
        (error as any).status = result.status;
        (error as any).meta = result.meta;
        
        logError('Error creating watchlist', error, { 
          status: result.status,
          meta: result.meta
        });
        
        throw error;
      }
      
      // If we got here, the operation was successful
      if (!result.data) {
        throw new Error('No data returned when creating watchlist');
      }
      
      // Add symbols if provided
      if (watchlistData.symbols && watchlistData.symbols.length > 0 && result.data.id) {
        console.log(`[WatchlistService] Adding ${watchlistData.symbols.length} symbols to new watchlist ${result.data.id}`);
        
        // Add each symbol to the watchlist
        try {
          for (const symbol of watchlistData.symbols) {
            // We don't await inside the loop to add items in parallel
            // Skip failed additions but continue with the rest
            addItemToWatchlist(result.data.id, symbol).catch(err => {
              console.error(`[WatchlistService] Error adding symbol ${symbol} to watchlist:`, err);
            });
          }
          console.log(`[WatchlistService] Started adding symbols to watchlist ${result.data.id}`);
        } catch (error) {
          console.error(`[WatchlistService] Error adding symbols to watchlist:`, error);
          // We continue even if adding symbols fails - the watchlist was created successfully
        }
      }
      
      return result.data;
    } catch (error) {
      logError('Error creating watchlist', error);
      throw error;
    }
  },
  
  // Use wrapped versions of the imported functions to ensure proper session handling
  updateWatchlist: async (watchlistId: string, updates: Partial<Watchlist>): Promise<boolean> => {
    console.log(`[WatchlistService] Updating watchlist ${watchlistId} with session check`);
    
    try {
      // Use the standardized updateWatchlist function that returns a Result
      const result = await updateWatchlist(watchlistId, updates);
      
      // Check if the operation was successful
      if (result.error) {
        // Handle the error consistently
        const error = new Error(result.error);
        // Add status to the error
        (error as any).status = result.status;
        (error as any).meta = result.meta;
        
        logError(`Error updating watchlist ${watchlistId}`, error, { 
          status: result.status,
          meta: result.meta
        });
        
        throw error;
      }
      
      // If we got here, the operation was successful
      return result.data ?? false;
    } catch (error) {
      logError(`Error updating watchlist ${watchlistId}`, error);
      throw error;
    }
  },
  
  deleteWatchlist: async (watchlistId: string): Promise<boolean> => {
    console.log(`[WatchlistService] Deleting watchlist ${watchlistId} with session check`);
    
    try {
      // Use the standardized deleteWatchlist function that returns a Result
      const result = await deleteWatchlist(watchlistId);
      
      // Check if the operation was successful
      if (result.error) {
        // Handle the error consistently
        const error = new Error(result.error);
        // Add status to the error
        (error as any).status = result.status;
        (error as any).meta = result.meta;
        
        logError(`Error deleting watchlist ${watchlistId}`, error, { 
          status: result.status,
          meta: result.meta
        });
        
        throw error;
      }
      
      // If we got here, the operation was successful
      return result.data ?? false;
    } catch (error) {
      logError(`Error deleting watchlist ${watchlistId}`, error);
      throw error;
    }
  },
  
  // Watchlist item mutations with session check
  addItemToWatchlist: async (watchlistId: string, symbol: string, notes?: string): Promise<WatchlistItem | null> => {
    console.log(`[WatchlistService] Adding item to watchlist ${watchlistId} with session check`);
    
    try {
      const result = await addItemToWatchlist(watchlistId, symbol, notes);
      
      // Check if the operation was successful
      if (result.error) {
        // Handle the error consistently
        const error = new Error(result.error);
        // Add status to the error
        (error as any).status = result.status;
        (error as any).meta = result.meta;
        
        logError(`Error adding item to watchlist ${watchlistId}`, error, { 
          symbol,
          status: result.status,
          meta: result.meta
        });
        
        throw error;
      }
      
      // If we got here, the operation was successful
      return result.data;
    } catch (error) {
      logError(`Error adding item to watchlist ${watchlistId}`, error, { symbol });
      throw error;
    }
  },
  
  updateWatchlistItem: async (itemId: string, updates: Partial<WatchlistItem>): Promise<boolean> => {
    console.log(`[WatchlistService] Updating watchlist item ${itemId} with session check`);
    
    try {
      const result = await updateWatchlistItem(itemId, updates);
      
      // Check if the operation was successful
      if (result.error) {
        // Handle the error consistently
        const error = new Error(result.error);
        // Add status to the error
        (error as any).status = result.status;
        (error as any).meta = result.meta;
        
        logError(`Error updating watchlist item ${itemId}`, error, { 
          status: result.status,
          meta: result.meta
        });
        
        throw error;
      }
      
      // If we got here, the operation was successful
      return result.data ?? false;
    } catch (error) {
      logError(`Error updating watchlist item ${itemId}`, error);
      throw error;
    }
  },
  
  removeItemFromWatchlist: async (itemId: string): Promise<boolean> => {
    console.log(`[WatchlistService] Removing watchlist item ${itemId} with session check`);
    
    try {
      const result = await removeItemFromWatchlist(itemId);
      
      // Check if the operation was successful
      if (result.error) {
        // Handle the error consistently
        const error = new Error(result.error);
        // Add status to the error
        (error as any).status = result.status;
        (error as any).meta = result.meta;
        
        logError(`Error removing watchlist item ${itemId}`, error, { 
          status: result.status,
          meta: result.meta
        });
        
        throw error;
      }
      
      // If we got here, the operation was successful
      return result.data ?? false;
    } catch (error) {
      logError(`Error removing watchlist item ${itemId}`, error);
      throw error;
    }
  },
  
  // Collaboration functions with session check
  shareWatchlist: async (watchlistId: string, userEmail: string, permissionLevel: 'view' | 'edit' | 'admin' = 'view'): Promise<boolean> => {
    console.log(`[WatchlistService] Sharing watchlist ${watchlistId} with ${userEmail} (${permissionLevel})`);
    
    try {
      const result = await shareWatchlist(watchlistId, userEmail, permissionLevel);
      
      // Check if the operation was successful
      if (result.error) {
        // Handle the error consistently
        const error = new Error(result.error);
        // Add status to the error
        (error as any).status = result.status;
        (error as any).meta = result.meta;
        
        logError(`Error sharing watchlist ${watchlistId}`, error, { 
          userEmail, 
          permissionLevel,
          status: result.status,
          meta: result.meta
        });
        
        throw error;
      }
      
      // If we got here, the operation was successful
      return result.data ?? false;
    } catch (error) {
      logError(`Error sharing watchlist ${watchlistId}`, error, { userEmail, permissionLevel });
      throw error;
    }
  },
  
  getWatchlistCollaborators: async (watchlistId: string) => {
    console.log(`[WatchlistService] Getting collaborators for watchlist ${watchlistId}`);
    
    try {
      const result = await getWatchlistCollaborators(watchlistId);
      
      // Check if the operation was successful
      if (result.error) {
        // Handle the error consistently
        logError(`Error getting collaborators for watchlist ${watchlistId}`, new Error(result.error), { 
          status: result.status,
          meta: result.meta
        });
        
        return [];
      }
      
      // If we got here, the operation was successful
      return result.data ?? [];
    } catch (error) {
      logError(`Error getting collaborators for watchlist ${watchlistId}`, error);
      return [];
    }
  },
  
  removeCollaborator: async (collaboratorId: string): Promise<boolean> => {
    console.log(`[WatchlistService] Removing collaborator ${collaboratorId}`);
    
    try {
      const result = await removeCollaborator(collaboratorId);
      
      // Check if the operation was successful
      if (result.error) {
        // Handle the error consistently
        const error = new Error(result.error);
        // Add status to the error
        (error as any).status = result.status;
        (error as any).meta = result.meta;
        
        logError(`Error removing collaborator ${collaboratorId}`, error, { 
          status: result.status,
          meta: result.meta
        });
        
        throw error;
      }
      
      // If we got here, the operation was successful
      return result.data ?? false;
    } catch (error) {
      logError(`Error removing collaborator ${collaboratorId}`, error);
      throw error;
    }
  }
};

export default watchlistService;
