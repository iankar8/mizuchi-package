// Service for recent searches functionality
import { queryWithUser, withUserTransaction } from '../utils/neondb/rls-helper';

export interface RecentSearch {
  id: string;
  symbol: string;
  company_name: string;
  searched_at: string;
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * Create or update a recent search entry
 */
export async function addRecentSearch(
  userId: string,
  symbol: string,
  companyName: string,
  source: string = 'web',
  metadata: Record<string, any> = {}
): Promise<string | null> {
  try {
    // Use the upsert_recent_search function to create or update the search
    const { data } = await queryWithUser(
      userId,
      'SELECT upsert_recent_search($1, $2, $3, $4, $5) as search_id',
      [userId, symbol, companyName, source, JSON.stringify(metadata)]
    );
    
    return data?.[0]?.search_id || null;
  } catch (error) {
    console.error('Error adding recent search:', error);
    return null;
  }
}

/**
 * Get recent searches for a user
 */
export async function getRecentSearches(
  userId: string,
  limit: number = 5
): Promise<RecentSearch[]> {
  try {
    // Get the most recent searches ordered by searched_at
    const { data } = await queryWithUser(
      userId,
      `SELECT id, symbol, company_name, searched_at, source, metadata
       FROM recent_searches
       WHERE user_id = $1
       ORDER BY searched_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return data as RecentSearch[] || [];
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
}

/**
 * Log extension activity
 */
export async function logExtensionActivity(
  userId: string,
  activityType: string,
  pageUrl?: string,
  details: Record<string, any> = {}
): Promise<string | null> {
  try {
    const { data } = await queryWithUser(
      userId,
      'SELECT log_extension_activity($1, $2, $3, $4) as activity_id',
      [userId, activityType, pageUrl || null, JSON.stringify(details)]
    );
    
    return data?.[0]?.activity_id || null;
  } catch (error) {
    console.error('Error logging extension activity:', error);
    return null;
  }
}

/**
 * Get extension activity
 */
export async function getExtensionActivity(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const { data } = await queryWithUser(
      userId,
      `SELECT id, activity_type, occurred_at, page_url, details
       FROM extension_activity
       WHERE user_id = $1
       ORDER BY occurred_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return data || [];
  } catch (error) {
    console.error('Error getting extension activity:', error);
    return [];
  }
}

/**
 * Bulk insert recent searches
 */
export async function bulkInsertRecentSearches(
  userId: string, 
  searches: Array<{ symbol: string, companyName: string, source: string, metadata?: Record<string, any> }>
): Promise<boolean> {
  try {
    return await withUserTransaction(userId, async (client) => {
      for (const search of searches) {
        await client.query(
          'SELECT upsert_recent_search($1, $2, $3, $4, $5)',
          [
            userId, 
            search.symbol, 
            search.companyName, 
            search.source, 
            JSON.stringify(search.metadata || {})
          ]
        );
      }
      return true;
    });
  } catch (error) {
    console.error('Error bulk inserting recent searches:', error);
    return false;
  }
}

export default {
  addRecentSearch,
  getRecentSearches,
  logExtensionActivity,
  getExtensionActivity,
  bulkInsertRecentSearches
};