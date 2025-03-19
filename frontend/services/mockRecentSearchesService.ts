// Mock service for recent searches functionality for browser environment
// Uses localStorage instead of database queries

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
    const searchId = `search_${Date.now()}`;
    const newSearch: RecentSearch = {
      id: searchId,
      symbol,
      company_name: companyName,
      searched_at: new Date().toISOString(),
      source,
      metadata
    };
    
    // Get existing searches
    const storageKey = `recent_searches_${userId}`;
    const existingSearchesStr = localStorage.getItem(storageKey);
    const existingSearches: RecentSearch[] = existingSearchesStr 
      ? JSON.parse(existingSearchesStr) 
      : [];
    
    // Check if this symbol already exists
    const existingIndex = existingSearches.findIndex(s => s.symbol === symbol);
    
    if (existingIndex >= 0) {
      // Update existing search
      existingSearches[existingIndex] = {
        ...existingSearches[existingIndex],
        searched_at: new Date().toISOString(),
        company_name: companyName,
        source,
        metadata
      };
    } else {
      // Add new search
      existingSearches.unshift(newSearch);
    }
    
    // Keep only the most recent 20 searches
    const updatedSearches = existingSearches.slice(0, 20);
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedSearches));
    
    return searchId;
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
    // Get from localStorage
    const storageKey = `recent_searches_${userId}`;
    const searchesStr = localStorage.getItem(storageKey);
    
    if (!searchesStr) {
      return generateMockSearches();
    }
    
    const searches: RecentSearch[] = JSON.parse(searchesStr);
    
    // Return limited number of searches
    return searches.slice(0, limit);
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return generateMockSearches();
  }
}

/**
 * Generate mock searches for initial display
 */
function generateMockSearches(): RecentSearch[] {
  return [
    {
      id: "1",
      symbol: "AAPL",
      company_name: "Apple Inc.",
      searched_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
    },
    {
      id: "2",
      symbol: "NVDA",
      company_name: "NVIDIA Corporation",
      searched_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 minutes ago
    },
    {
      id: "3",
      symbol: "TSLA",
      company_name: "Tesla, Inc.",
      searched_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
    },
    {
      id: "4",
      symbol: "MSFT",
      company_name: "Microsoft Corporation",
      searched_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() // 3 hours ago
    },
    {
      id: "5",
      symbol: "AMZN",
      company_name: "Amazon.com, Inc.",
      searched_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
    }
  ];
}

/**
 * Log extension activity (mock implementation)
 */
export async function logExtensionActivity(
  userId: string,
  activityType: string,
  pageUrl?: string,
  details: Record<string, any> = {}
): Promise<string | null> {
  try {
    const activityId = `activity_${Date.now()}`;
    const newActivity = {
      id: activityId,
      activity_type: activityType,
      occurred_at: new Date().toISOString(),
      page_url: pageUrl,
      details
    };
    
    // Get existing activity
    const storageKey = `extension_activity_${userId}`;
    const existingActivityStr = localStorage.getItem(storageKey);
    const existingActivity = existingActivityStr 
      ? JSON.parse(existingActivityStr) 
      : [];
    
    // Add new activity
    existingActivity.unshift(newActivity);
    
    // Keep only the most recent 50 activities
    const updatedActivity = existingActivity.slice(0, 50);
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedActivity));
    
    return activityId;
  } catch (error) {
    console.error('Error logging extension activity:', error);
    return null;
  }
}

/**
 * Get extension activity (mock implementation)
 */
export async function getExtensionActivity(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    // Get from localStorage
    const storageKey = `extension_activity_${userId}`;
    const activityStr = localStorage.getItem(storageKey);
    
    if (!activityStr) {
      return [];
    }
    
    const activity = JSON.parse(activityStr);
    
    // Return limited number of activities
    return activity.slice(0, limit);
  } catch (error) {
    console.error('Error getting extension activity:', error);
    return [];
  }
}

/**
 * Bulk insert recent searches (mock implementation)
 */
export async function bulkInsertRecentSearches(
  userId: string, 
  searches: Array<{ symbol: string, companyName: string, source: string, metadata?: Record<string, any> }>
): Promise<boolean> {
  try {
    for (const search of searches) {
      await addRecentSearch(
        userId,
        search.symbol,
        search.companyName,
        search.source,
        search.metadata || {}
      );
    }
    return true;
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
