import { supabase } from '../utils/supabase/client';
import fmpService from './fmpService';
import errorMonitoringService from './errorMonitoringService';
import cacheService from './cacheService';
import { securityInterceptor } from './watchlist/securityInterceptor';

// Types
export interface Watchlist {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
  owner_id: string;
  created_by: string;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  ticker?: string;
  company_name?: string;
  notes?: string;
  created_at: string;
  added_by: string;
}

export interface WatchlistMember {
  id: string;
  watchlist_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

// Cache keys
const CACHE_KEYS = {
  COMPANY_INFO: 'company_info',
  WATCHLIST: 'watchlist',
  WATCHLIST_ITEMS: 'watchlist_items',
};

/**
 * Service for managing watchlists and related operations
 */
export const watchlistService = {
  /**
   * Create a new watchlist
   */
  async createWatchlist(
    name: string,
    isPublic: boolean = false,
    description?: string
  ): Promise<{ watchlist: Watchlist | null; error: Error | null }> {
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }
      
      if (!user || !user.user) {
        throw new Error('User not authenticated');
      }
      
      const userId = user.user.id;
      
      const { data, error } = await supabase
        .from('watchlists')
        .insert({
          name,
          is_public: isPublic,
          description,
          created_by: userId,
          owner_id: userId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return { watchlist: data as Watchlist, error: null };
    } catch (error) {
      errorMonitoringService.captureException(error);
      return { watchlist: null, error: error as Error };
    }
  },
  
  /**
   * Get a watchlist by ID - includes security check for access
   */
  async getWatchlist(watchlistId: string): Promise<{ watchlist: Watchlist | null; error: Error | null }> {
    try {
      // Apply security check through interceptor
      return await securityInterceptor.withAccessCheck(watchlistId, async () => {
        // Check cache first
        const cachedWatchlist = await cacheService.get<Watchlist>(`${CACHE_KEYS.WATCHLIST}:${watchlistId}`);
        if (cachedWatchlist) {
          return { watchlist: cachedWatchlist, error: null };
        }
        
        const { data, error } = await supabase
          .from('watchlists')
          .select('*')
          .eq('id', watchlistId)
          .single();
        
        if (error) {
          throw error;
        }
        
        // Cache the result
        await cacheService.set(`${CACHE_KEYS.WATCHLIST}:${watchlistId}`, data, { ttl: 60 * 5 }); // 5 minutes
        
        return { watchlist: data as Watchlist, error: null };
      });
    } catch (error) {
      errorMonitoringService.captureException(error);
      return { watchlist: null, error: error as Error };
    }
  },
  
  /**
   * Get watchlist items - includes security check for access control
   */
  async getWatchlistItems(watchlistId: string): Promise<{ items: WatchlistItem[]; error: Error | null }> {
    try {
      // Apply security check through interceptor
      return await securityInterceptor.withAccessCheck(watchlistId, async () => {
        // Check cache first
        const cachedItems = await cacheService.get<WatchlistItem[]>(`${CACHE_KEYS.WATCHLIST_ITEMS}:${watchlistId}`);
        if (cachedItems) {
          return { items: cachedItems, error: null };
        }
        
        const { data, error } = await supabase
          .from('watchlist_items')
          .select('*')
          .eq('watchlist_id', watchlistId)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        // Cache the result
        await cacheService.set(`${CACHE_KEYS.WATCHLIST_ITEMS}:${watchlistId}`, data, { ttl: 60 * 5 }); // 5 minutes
        
        return { items: data as WatchlistItem[], error: null };
      });
    } catch (error) {
      errorMonitoringService.captureException(error);
      return { items: [], error: error as Error };
    }
  },
  
  /**
   * Add an item to a watchlist - includes security check for ownership
   */
  async addWatchlistItem(
    watchlistId: string,
    symbol: string,
    notes?: string
  ): Promise<{ item: WatchlistItem | null; error: Error | null }> {
    try {
      // Apply security check through interceptor (must be owner)
      return await securityInterceptor.withOwnerCheck(watchlistId, async () => {
        const { data: user, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw userError;
        }
        
        if (!user || !user.user) {
          throw new Error('User not authenticated');
        }
        
        const userId = user.user.id;
        
        // Get company information from FMP API
        const companyInfo = await this.getCompanyInfo(symbol);
        
        // Define the item data with required fields
        const itemData = {
          watchlist_id: watchlistId,
          symbol: symbol,
          notes,
          added_by: userId,
          created_at: new Date().toISOString(),
          // Add company name and ticker if available
          ...(companyInfo ? {
            company_name: companyInfo.name,
            ticker: companyInfo.symbol
          } : {})
        };
        
        const { data, error } = await supabase
          .from('watchlist_items')
          .insert(itemData)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        return { item: data as WatchlistItem, error: null };
      });
    } catch (error) {
      errorMonitoringService.captureException(error);
      return { item: null, error: error as Error };
    }
  },
  
  /**
   * Remove an item from a watchlist - includes security check for ownership
   */
  async removeWatchlistItem(itemId: string, watchlistId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      // Apply security check through interceptor (must be owner)
      return await securityInterceptor.withOwnerCheck(watchlistId, async () => {
        const { error } = await supabase
          .from('watchlist_items')
          .delete()
          .eq('id', itemId);
        
        if (error) {
          throw error;
        }
        
        // Invalidate cache
        await cacheService.remove(`${CACHE_KEYS.WATCHLIST_ITEMS}:${watchlistId}`);
        
        return { success: true, error: null };
      });
    } catch (error) {
      errorMonitoringService.captureException(error);
      return { success: false, error: error as Error };
    }
  },
  
  /**
   * Get company information from FMP API
   */
  async getCompanyInfo(symbol: string): Promise<{ name: string; symbol: string } | null> {
    try {
      // Check cache first
      const cacheKey = `${CACHE_KEYS.COMPANY_INFO}:${symbol}`;
      const cachedInfo = await cacheService.get<{ name: string; symbol: string }>(cacheKey);
      
      if (cachedInfo) {
        return cachedInfo;
      }
      
      // Fetch from FMP API
      const companyProfile = await fmpService.getCompanyProfile(symbol);
      
      if (!companyProfile || !companyProfile.length) {
        return null;
      }
      
      const company = companyProfile[0] as any;
      const result = {
        name: company.companyName,
        symbol: company.symbol
      };
      
      // Cache the result for 24 hours (company info doesn't change often)
      await cacheService.set(cacheKey, result, { ttl: 60 * 60 * 24 });
      
      return result;
    } catch (error) {
      errorMonitoringService.captureException(error);
      return null;
    }
  },
  
  /**
   * Subscribe to watchlist changes - includes security check for access
   */
  async subscribeToWatchlist(watchlistId: string, callback: (payload: any) => void): Promise<{ unsubscribe: () => void }> {
    // First verify that the user has access to this watchlist
    try {
      await securityInterceptor.withAccessCheck(watchlistId, async () => true);
      
      const channel = supabase
        .channel(`watchlist-${watchlistId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'watchlists',
            filter: `id=eq.${watchlistId}`
          }, 
          callback
        )
        .subscribe();
      
      return {
        unsubscribe: () => {
          channel.unsubscribe();
        }
      };
    } catch (error) {
      errorMonitoringService.captureException(error);
      throw new Error(`Security check failed: ${error instanceof Error ? error.message : 'Access denied'}`);
    }
  },
  
  /**
   * Subscribe to watchlist items changes - includes security check for access
   */
  async subscribeToWatchlistItems(watchlistId: string, callback: (payload: any) => void): Promise<{ unsubscribe: () => void }> {
    // First verify that the user has access to this watchlist
    try {
      await securityInterceptor.withAccessCheck(watchlistId, async () => true);
      
      const channel = supabase
        .channel(`watchlist-items-${watchlistId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'watchlist_items',
            filter: `watchlist_id=eq.${watchlistId}`
          }, 
          callback
        )
        .subscribe();
      
      return {
        unsubscribe: () => {
          channel.unsubscribe();
        }
      };
    } catch (error) {
      errorMonitoringService.captureException(error);
      throw new Error(`Security check failed: ${error instanceof Error ? error.message : 'Access denied'}`);
    }
  },
  
  /**
   * Update existing watchlist items with company information - includes security check for access
   * This operation doesn't require owner permissions since it's only updating metadata
   */
  async updateWatchlistItemsWithCompanyInfo(watchlistId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      // Apply security check through interceptor (only needs access)
      return await securityInterceptor.withAccessCheck(watchlistId, async () => {
        // Get all items for the watchlist
        // Note: getWatchlistItems already has access check, but it's fine since our interceptor is idempotent
        const { items, error } = await this.getWatchlistItems(watchlistId);
        
        if (error) {
          throw error;
        }
        
        // Update each item with company info
        for (const item of items) {
          if (!item.company_name || !item.ticker) {
            const companyInfo = await this.getCompanyInfo(item.symbol);
            
            if (companyInfo) {
              await supabase
                .from('watchlist_items')
                .update({
                  company_name: companyInfo.name,
                  ticker: companyInfo.symbol,
                  // Include these fields to satisfy TypeScript
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.id);
            }
          }
        }
        
        // Invalidate cache
        await cacheService.remove(`${CACHE_KEYS.WATCHLIST_ITEMS}:${watchlistId}`);
        
        return { success: true, error: null };
      });
    } catch (error) {
      errorMonitoringService.captureException(error);
      return { success: false, error: error as Error };
    }
  }
};

export default watchlistService;
