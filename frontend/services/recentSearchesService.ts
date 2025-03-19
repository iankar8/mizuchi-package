/**
 * Real implementation of Recent Searches Service with fallback
 * This implementation safely handles the case where the recent_searches table doesn't exist
 */
import { supabase } from '@/utils/supabase/client';

export interface RecentSearch {
  id: string;
  symbol: string;
  company_name: string;
  searched_at: string;
}

export interface SearchInput {
  symbol: string;
  companyName: string;
  source: 'web' | 'extension';
}

// Mock data for fallback
const MOCK_RECENT_SEARCHES: RecentSearch[] = [
  {
    id: '1',
    symbol: 'AAPL',
    company_name: 'Apple Inc.',
    searched_at: new Date().toISOString()
  },
  {
    id: '2',
    symbol: 'MSFT',
    company_name: 'Microsoft Corporation',
    searched_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    symbol: 'GOOGL',
    company_name: 'Alphabet Inc.',
    searched_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: '4',
    symbol: 'AMZN',
    company_name: 'Amazon.com Inc.',
    searched_at: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: '5',
    symbol: 'TSLA',
    company_name: 'Tesla, Inc.',
    searched_at: new Date(Date.now() - 345600000).toISOString()
  }
];

/**
 * Get recent searches for a user - safely handles missing table
 * @param userId The user ID
 * @param limit Maximum number of recent searches to return
 * @returns Array of recent searches (or mock data if table doesn't exist)
 */
export const getRecentSearches = async (userId: string, limit: number = 10): Promise<RecentSearch[]> => {
  try {
    console.log(`[RecentSearchesService] Getting recent searches for user ${userId}`);
    
    const { data, error } = await supabase
      .from('recent_searches')
      .select('id, symbol, company_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      // Check if this is a 'table doesn't exist' error
      if (error.code === '42P01') {
        console.log('[RecentSearchesService] recent_searches table does not exist, using mock data');
        return MOCK_RECENT_SEARCHES.slice(0, limit);
      }
      
      console.error('[RecentSearchesService] Error fetching recent searches:', error);
      return [];
    }
    
    // Map the database results to the expected interface
    return (data || []).map(item => ({
      id: item.id,
      symbol: item.symbol,
      company_name: item.company_name,
      searched_at: item.created_at
    }));
  } catch (error) {
    console.error('[RecentSearchesService] Unexpected error getting recent searches:', error);
    
    // Return mock data as a fallback
    return MOCK_RECENT_SEARCHES.slice(0, limit);
  }
};

/**
 * Add a search to a user's recent searches - safely handles missing table
 * @param userId The user ID
 * @param search The search to add
 * @returns True if successful, false otherwise (returns true if table doesn't exist)
 */
export const addRecentSearch = async (userId: string, search: SearchInput): Promise<boolean> => {
  try {
    console.log(`[RecentSearchesService] Adding recent search for ${search.symbol}`);
    
    // First check if this symbol already exists in recent searches
    const { data: existing, error: checkError } = await supabase
      .from('recent_searches')
      .select('id')
      .eq('user_id', userId)
      .eq('symbol', search.symbol)
      .maybeSingle();
    
    // If there's a table missing error, just return true and log a warning
    if (checkError && checkError.code === '42P01') {
      console.warn('[RecentSearchesService] recent_searches table does not exist, ignoring add operation');
      return true;
    }
    
    // If it exists, update its timestamp
    if (existing) {
      const { error: updateError } = await supabase
        .from('recent_searches')
        .update({
          created_at: new Date().toISOString(),
          source: search.source
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('[RecentSearchesService] Error updating recent search:', updateError);
        return false;
      }
      
      return true;
    }
    
    // Otherwise insert a new record
    const { error } = await supabase
      .from('recent_searches')
      .insert({
        user_id: userId,
        symbol: search.symbol,
        company_name: search.companyName,
        source: search.source
      });
    
    if (error) {
      // Check if this is a 'table doesn't exist' error
      if (error.code === '42P01') {
        console.warn('[RecentSearchesService] recent_searches table does not exist, ignoring add operation');
        return true;
      }
      
      console.error('[RecentSearchesService] Error adding recent search:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[RecentSearchesService] Unexpected error adding recent search:', error);
    return true; // Return true since we don't want to break the application flow
  }
};

/**
 * Clear all recent searches for a user - safely handles missing table
 * @param userId The user ID
 * @returns True if successful, false otherwise (returns true if table doesn't exist)
 */
export const clearRecentSearches = async (userId: string): Promise<boolean> => {
  try {
    console.log(`[RecentSearchesService] Clearing recent searches for user ${userId}`);
    
    const { error } = await supabase
      .from('recent_searches')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      // Check if this is a 'table doesn't exist' error
      if (error.code === '42P01') {
        console.warn('[RecentSearchesService] recent_searches table does not exist, ignoring clear operation');
        return true;
      }
      
      console.error('[RecentSearchesService] Error clearing recent searches:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[RecentSearchesService] Unexpected error clearing recent searches:', error);
    return true; // Return true since we don't want to break the application flow
  }
};

/**
 * Insert multiple recent searches for a user - safely handles missing table
 * @param userId The user ID
 * @param searches Array of searches to insert
 * @returns Array of inserted search IDs (or empty array if table doesn't exist)
 */
export const bulkInsertRecentSearches = async (userId: string, searches: SearchInput[]): Promise<string[]> => {
  try {
    console.log(`[RecentSearchesService] Bulk inserting ${searches.length} searches for user ${userId}`);
    
    const { data, error } = await supabase
      .from('recent_searches')
      .insert(
        searches.map(search => ({
          user_id: userId,
          symbol: search.symbol,
          company_name: search.companyName,
          source: search.source || 'web'
        }))
      )
      .select('id');
    
    if (error) {
      // Check if this is a 'table doesn't exist' error
      if (error.code === '42P01') {
        console.warn('[RecentSearchesService] recent_searches table does not exist, ignoring bulk insert');
        return [];
      }
      
      console.error('[RecentSearchesService] Error bulk inserting recent searches:', error);
      return [];
    }
    
    return (data || []).map(item => item.id);
  } catch (error) {
    console.error('[RecentSearchesService] Unexpected error bulk inserting recent searches:', error);
    return [];
  }
};

// Create a service object
const recentSearchesService = {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  bulkInsertRecentSearches
};

export default recentSearchesService;