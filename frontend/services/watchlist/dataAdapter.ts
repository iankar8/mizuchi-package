/**
 * Data Adapter Service for Watchlist Module
 * 
 * This service provides a unified interface for both mock and real data sources,
 * enabling gradual transition from mock data to real database data.
 * 
 * Features:
 * - Consistent API for both mock and real data
 * - Feature flag control for data source selection
 * - Graceful fallback to mock data when real data is unavailable
 * - Progressive migration path for components
 */

import { Watchlist, WatchlistItem, WatchlistCollaborator } from '../watchlist.service';
import watchlistService from './index';
import { enhancedTokenManager } from '@/utils/supabase/enhancedTokenManager';

// Import mock data services
const mockWatchlistsPromise = import('@/services/mockWatchlistService');

// Enable debug mode in development
const DEBUG = import.meta.env.MODE === 'development';

// Feature flag for data source selection
// Order of preference: ENV > localStorage > default (real)
const getDataSourcePreference = (): 'real' | 'mock' | 'auto' => {
  // Check environment variable
  if (import.meta.env.VITE_WATCHLIST_DATA_SOURCE) {
    const source = import.meta.env.VITE_WATCHLIST_DATA_SOURCE as string;
    if (['real', 'mock', 'auto'].includes(source)) {
      return source as 'real' | 'mock' | 'auto';
    }
  }
  
  // Check localStorage
  try {
    const stored = localStorage.getItem('mizuchi_data_source_preference');
    if (stored && ['real', 'mock', 'auto'].includes(stored)) {
      return stored as 'real' | 'mock' | 'auto';
    }
  } catch (error) {
    // Ignore localStorage errors
  }
  
  // Default: real data for production, auto for development
  return import.meta.env.MODE === 'production' ? 'real' : 'auto';
};

// Class to track API call performance
class PerformanceTracker {
  private metrics: Record<string, {count: number, totalTime: number, errors: number}> = {};
  
  startOperation(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics[operation]) {
        this.metrics[operation] = { count: 0, totalTime: 0, errors: 0 };
      }
      
      this.metrics[operation].count++;
      this.metrics[operation].totalTime += duration;
    };
  }
  
  recordError(operation: string): void {
    if (!this.metrics[operation]) {
      this.metrics[operation] = { count: 0, totalTime: 0, errors: 0 };
    }
    
    this.metrics[operation].errors++;
  }
  
  getMetrics(): Record<string, {count: number, avgTime: number, errors: number}> {
    const result: Record<string, {count: number, avgTime: number, errors: number}> = {};
    
    Object.entries(this.metrics).forEach(([key, value]) => {
      result[key] = {
        count: value.count,
        avgTime: value.count > 0 ? value.totalTime / value.count : 0,
        errors: value.errors
      };
    });
    
    return result;
  }
}

/**
 * Watchlist Data Adapter Service
 */
class WatchlistDataAdapter {
  private mockDataService: any = null;
  private performanceTracker = new PerformanceTracker();
  private lastRealDataError: Error | null = null;
  private lastErrorTime: number = 0;
  
  constructor() {
    // Preload mock data service
    this.preloadMockService();
  }
  
  /**
   * Preload mock service to reduce latency on first use
   */
  private async preloadMockService(): Promise<void> {
    try {
      this.mockDataService = (await mockWatchlistsPromise).default;
    } catch (error) {
      console.error('[WatchlistAdapter] Error preloading mock service:', error);
    }
  }
  
  /**
   * Determine which data source to use based on preferences and availability
   */
  private async determineDataSource(): Promise<'real' | 'mock'> {
    const preference = getDataSourcePreference();
    
    // If preference is explicit, respect it
    if (preference === 'real') return 'real';
    if (preference === 'mock') return 'mock';
    
    // For 'auto', check if we had a recent error with real data
    const COOLDOWN_PERIOD = 30000; // 30 seconds
    if (this.lastRealDataError && (Date.now() - this.lastErrorTime < COOLDOWN_PERIOD)) {
      if (DEBUG) console.log('[WatchlistAdapter] Recent real data error, using mock data during cooldown');
      return 'mock';
    }
    
    // Check if we have a valid session for the real data
    try {
      const sessionInfo = await enhancedTokenManager.getSessionInfo();
      return sessionInfo.isValid ? 'real' : 'mock';
    } catch (error) {
      if (DEBUG) console.log('[WatchlistAdapter] Error checking session, defaulting to mock data:', error);
      return 'mock';
    }
  }
  
  /**
   * Get watchlists with graceful fallback
   */
  async getWatchlists(): Promise<Watchlist[]> {
    const endOperation = this.performanceTracker.startOperation('getWatchlists');
    
    try {
      const dataSource = await this.determineDataSource();
      
      if (dataSource === 'real') {
        try {
          // Use real data
          const result = await watchlistService.getUserWatchlists();
          endOperation();
          return result;
        } catch (error) {
          // Record the error and fall back to mock data
          this.lastRealDataError = error as Error;
          this.lastErrorTime = Date.now();
          this.performanceTracker.recordError('getWatchlists');
          
          console.error('[WatchlistAdapter] Error getting real watchlists, falling back to mock:', error);
          
          // Ensure mock service is loaded
          if (!this.mockDataService) {
            this.mockDataService = (await mockWatchlistsPromise).default;
          }
          
          const mockResult = await this.mockDataService.getWatchlists();
          endOperation();
          return mockResult.data || [];
        }
      } else {
        // Use mock data directly
        if (!this.mockDataService) {
          this.mockDataService = (await mockWatchlistsPromise).default;
        }
        
        const mockResult = await this.mockDataService.getWatchlists();
        endOperation();
        return mockResult.data || [];
      }
    } catch (error) {
      this.performanceTracker.recordError('getWatchlists');
      console.error('[WatchlistAdapter] Unexpected error in getWatchlists:', error);
      endOperation();
      return [];
    }
  }
  
  /**
   * Get watchlist with items with graceful fallback
   */
  async getWatchlistWithItems(watchlistId: string): Promise<{watchlist: Watchlist | null, items: WatchlistItem[]}> {
    const endOperation = this.performanceTracker.startOperation('getWatchlistWithItems');
    
    try {
      const dataSource = await this.determineDataSource();
      
      if (dataSource === 'real') {
        try {
          // Use real data
          const result = await watchlistService.getWatchlistWithItems(watchlistId);
          endOperation();
          return result;
        } catch (error) {
          // Record the error and fall back to mock data
          this.lastRealDataError = error as Error;
          this.lastErrorTime = Date.now();
          this.performanceTracker.recordError('getWatchlistWithItems');
          
          console.error('[WatchlistAdapter] Error getting real watchlist items, falling back to mock:', error);
          
          // Ensure mock service is loaded
          if (!this.mockDataService) {
            this.mockDataService = (await mockWatchlistsPromise).default;
          }
          
          // First get the watchlist
          const mockWatchlist = await this.mockDataService.getWatchlists();
          const watchlist = mockWatchlist.data?.find((w: Watchlist) => w.id === watchlistId) || null;
          
          // Then get the items
          const mockItems = await this.mockDataService.getWatchlistItems(watchlistId);
          
          endOperation();
          return {
            watchlist,
            items: mockItems.data || []
          };
        }
      } else {
        // Use mock data directly
        if (!this.mockDataService) {
          this.mockDataService = (await mockWatchlistsPromise).default;
        }
        
        // First get the watchlist
        const mockWatchlist = await this.mockDataService.getWatchlists();
        const watchlist = mockWatchlist.data?.find((w: Watchlist) => w.id === watchlistId) || null;
        
        // Then get the items
        const mockItems = await this.mockDataService.getWatchlistItems(watchlistId);
        
        endOperation();
        return {
          watchlist,
          items: mockItems.data || []
        };
      }
    } catch (error) {
      this.performanceTracker.recordError('getWatchlistWithItems');
      console.error('[WatchlistAdapter] Unexpected error in getWatchlistWithItems:', error);
      endOperation();
      return { watchlist: null, items: [] };
    }
  }
  
  /**
   * Get watchlist collaborators with graceful fallback
   */
  async getWatchlistCollaborators(watchlistId: string): Promise<WatchlistCollaborator[]> {
    const endOperation = this.performanceTracker.startOperation('getWatchlistCollaborators');
    
    try {
      const dataSource = await this.determineDataSource();
      
      if (dataSource === 'real') {
        try {
          // Use real data
          const result = await watchlistService.getWatchlistCollaborators(watchlistId);
          endOperation();
          return result;
        } catch (error) {
          // Record the error and fall back to mock data
          this.lastRealDataError = error as Error;
          this.lastErrorTime = Date.now();
          this.performanceTracker.recordError('getWatchlistCollaborators');
          
          console.error('[WatchlistAdapter] Error getting real collaborators, falling back to mock:', error);
          
          // Ensure mock service is loaded
          if (!this.mockDataService) {
            this.mockDataService = (await mockWatchlistsPromise).default;
          }
          
          const mockResult = await this.mockDataService.getWatchlistMembers(watchlistId);
          endOperation();
          return mockResult.data || [];
        }
      } else {
        // Use mock data directly
        if (!this.mockDataService) {
          this.mockDataService = (await mockWatchlistsPromise).default;
        }
        
        const mockResult = await this.mockDataService.getWatchlistMembers(watchlistId);
        endOperation();
        return mockResult.data || [];
      }
    } catch (error) {
      this.performanceTracker.recordError('getWatchlistCollaborators');
      console.error('[WatchlistAdapter] Unexpected error in getWatchlistCollaborators:', error);
      endOperation();
      return [];
    }
  }
  
  /**
   * Create watchlist with graceful fallback
   */
  async createWatchlist(data: {
    name: string;
    description?: string;
    is_shared?: boolean;
  }): Promise<Watchlist | null> {
    const endOperation = this.performanceTracker.startOperation('createWatchlist');
    
    try {
      const dataSource = await this.determineDataSource();
      
      if (dataSource === 'real') {
        try {
          // Use real data
          const result = await watchlistService.createWatchlist(data);
          endOperation();
          return result;
        } catch (error) {
          // Record the error and fall back to mock data
          this.lastRealDataError = error as Error;
          this.lastErrorTime = Date.now();
          this.performanceTracker.recordError('createWatchlist');
          
          console.error('[WatchlistAdapter] Error creating real watchlist, falling back to mock:', error);
          
          // Ensure mock service is loaded
          if (!this.mockDataService) {
            this.mockDataService = (await mockWatchlistsPromise).default;
          }
          
          const mockResult = await this.mockDataService.createWatchlist(
            data.name, 
            data.is_shared || false
          );
          endOperation();
          return mockResult.watchlist || null;
        }
      } else {
        // Use mock data directly
        if (!this.mockDataService) {
          this.mockDataService = (await mockWatchlistsPromise).default;
        }
        
        const mockResult = await this.mockDataService.createWatchlist(
          data.name, 
          data.is_shared || false
        );
        endOperation();
        return mockResult.watchlist || null;
      }
    } catch (error) {
      this.performanceTracker.recordError('createWatchlist');
      console.error('[WatchlistAdapter] Unexpected error in createWatchlist:', error);
      endOperation();
      return null;
    }
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceTracker.getMetrics();
  }
  
  /**
   * Get adapter status including data source preference
   */
  getStatus() {
    return {
      preference: getDataSourcePreference(),
      mockServiceLoaded: !!this.mockDataService,
      lastError: this.lastRealDataError ? {
        message: this.lastRealDataError.message,
        time: this.lastErrorTime,
        age: Date.now() - this.lastErrorTime
      } : null,
      metrics: this.performanceTracker.getMetrics()
    };
  }
  
  /**
   * Set data source preference (persisted to localStorage)
   */
  setDataSourcePreference(preference: 'real' | 'mock' | 'auto'): void {
    try {
      localStorage.setItem('mizuchi_data_source_preference', preference);
      if (DEBUG) console.log(`[WatchlistAdapter] Data source preference set to: ${preference}`);
    } catch (error) {
      console.error('[WatchlistAdapter] Error setting data source preference:', error);
    }
  }
}

// Export singleton instance
export const watchlistDataAdapter = new WatchlistDataAdapter();

// Export status check function
export const getAdapterStatus = () => watchlistDataAdapter.getStatus();

// Export preference setter
export const setDataSourcePreference = 
  (preference: 'real' | 'mock' | 'auto') => watchlistDataAdapter.setDataSourcePreference(preference);