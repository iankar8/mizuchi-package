/**
 * Mock Watchlist Service
 * 
 * This service provides mock watchlist data with real AI recommendations
 * for demonstration purposes. It integrates with the existing services
 * to ensure realistic data presentation.
 * 
 * BROWSER COMPATIBLE: This service uses localStorage instead of database operations
 * to ensure compatibility with browser environments.
 */

import { v4 as uuidv4 } from 'uuid';
import { Watchlist, WatchlistItem } from '@/types/supabase';
import fmpService from './fmpService';
import perplexityService from './perplexityService';
import mistralService from './ai/mistralService';
import cacheService from './cacheService';
import { supabase } from '@/utils/supabase/client';

// Mock watchlist definitions
const MOCK_WATCHLISTS: Array<{
  name: string;
  description: string;
  stocks: string[];
  sector: string;
}> = [
  {
    name: "Tech Leaders",
    description: "Top technology companies with strong growth potential",
    stocks: ['AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN'],
    sector: 'Technology'
  },
  {
    name: "Dividend Champions",
    description: "Stable companies with strong dividend history",
    stocks: ['JNJ', 'PG', 'KO', 'XOM', 'VZ', 'PFE'],
    sector: 'Financial'
  }
];

// Sector-based stock recommendations
const SECTOR_RECOMMENDATIONS: Record<string, Array<{ symbol: string; reason: string }>> = {
  'Technology': [
    { symbol: 'NVDA', reason: 'Leading AI chip manufacturer with strong growth potential' },
    { symbol: 'AMD', reason: 'Expanding market share in high-performance computing' },
    { symbol: 'AVGO', reason: 'Diversified semiconductor business with strong AI infrastructure presence' },
    { symbol: 'TSLA', reason: 'Innovative technology company with long-term growth potential' }
  ],
  'Financial': [
    { symbol: 'V', reason: 'Global payments leader with strong cash flow and dividend growth' },
    { symbol: 'JPM', reason: 'Well-managed bank with diverse revenue streams' },
    { symbol: 'BLK', reason: 'Asset management giant benefiting from passive investing trends' },
    { symbol: 'GS', reason: 'Investment banking leader with growing consumer business' }
  ],
  'Healthcare': [
    { symbol: 'UNH', reason: 'Healthcare services leader with strong margins and growth' },
    { symbol: 'JNJ', reason: 'Diversified healthcare giant with stable dividend growth' },
    { symbol: 'ABBV', reason: 'Pharmaceutical company with strong pipeline and dividend' },
    { symbol: 'LLY', reason: 'Innovative drug development in diabetes and obesity treatment' }
  ],
  'Consumer': [
    { symbol: 'AMZN', reason: 'E-commerce and cloud computing leader with diverse revenue streams' },
    { symbol: 'COST', reason: 'Warehouse retailer with loyal customer base and consistent growth' },
    { symbol: 'MCD', reason: 'Global fast food leader with strong brand and dividend history' },
    { symbol: 'NKE', reason: 'Leading athletic apparel brand with global growth opportunities' }
  ],
  'Energy': [
    { symbol: 'XOM', reason: 'Integrated energy company with strong dividend history' },
    { symbol: 'CVX', reason: 'Well-managed oil major with balanced portfolio' },
    { symbol: 'NEE', reason: 'Renewable energy leader with regulated utility business' },
    { symbol: 'ENB', reason: 'Energy infrastructure with stable cash flows and high dividend' }
  ]
};

// Diversification insights based on sector concentration
const DIVERSIFICATION_INSIGHTS: Record<string, string> = {
  'Technology': 'Your portfolio is heavily concentrated in the Technology sector. Consider adding stocks from other sectors like Healthcare or Consumer Staples for better diversification.',
  'Financial': 'Your portfolio has significant exposure to Financial stocks. Consider adding Technology or Healthcare stocks to balance sector risk.',
  'Healthcare': 'Your portfolio has good exposure to Healthcare. Consider adding Technology or Consumer stocks to complement your defensive positions.',
  'Consumer': 'Your portfolio has strong consumer sector representation. Consider adding Technology or Financial stocks for growth potential.',
  'Energy': 'Your portfolio has significant energy exposure. Consider adding Technology or Healthcare stocks to reduce commodity price sensitivity.',
  'Balanced': 'Your portfolio has good sector diversification. Continue monitoring sector allocations as market conditions change.'
};

// Mock watchlist service
const mockWatchlistService = {
  /**
   * Create mock watchlists for the current user
   * Uses localStorage instead of database operations for browser compatibility
   */
  async createMockWatchlists(): Promise<Watchlist[]> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return [];
      }
      
      const userId = user.id;
      console.log(`Creating mock watchlists for user: ${userId}`);
      
      const createdWatchlists: Watchlist[] = [];
      
      // Check if we already have watchlists in localStorage
      const existingWatchlistsStr = localStorage.getItem(`mock_watchlists_${userId}`);
      if (existingWatchlistsStr) {
        try {
          const existingWatchlists = JSON.parse(existingWatchlistsStr);
          if (Array.isArray(existingWatchlists) && existingWatchlists.length > 0) {
            console.log('Found existing mock watchlists in localStorage');
            return existingWatchlists as Watchlist[];
          }
        } catch (e) {
          console.warn('Error parsing existing watchlists from localStorage:', e);
        }
      }
      
      // Create each watchlist
      for (const mockWatchlist of MOCK_WATCHLISTS) {
        console.log(`Creating watchlist: ${mockWatchlist.name}`);
        
        // Create watchlist in localStorage
        const watchlistId = uuidv4();
        const now = new Date().toISOString();
        
        // Create a complete watchlist object with all required fields
        const completeWatchlist: Watchlist = {
          id: watchlistId,
          name: mockWatchlist.name,
          description: mockWatchlist.description,
          owner_id: userId,
          is_shared: false,
          created_at: now,
          updated_at: now,
          is_public: false,
          last_modified_by: userId
        };
        
        // Store in localStorage
        localStorage.setItem(`mock_watchlist_${watchlistId}`, JSON.stringify(completeWatchlist));
        createdWatchlists.push(completeWatchlist);
        
        // Add stocks to watchlist
        await this.addStocksToWatchlist(watchlistId, mockWatchlist.stocks, userId);
        
        // Add AI analysis
        await this.addAIAnalysisToWatchlist(watchlistId, mockWatchlist.stocks, mockWatchlist.sector);
      }
      
      // Store all watchlists in a single key for easy retrieval
      localStorage.setItem(`mock_watchlists_${userId}`, JSON.stringify(createdWatchlists));
      
      return createdWatchlists;
    } catch (error) {
      console.error('Error creating mock watchlists:', error);
      return [];
    }
  },
  
  /**
   * Add stocks to a watchlist
   * Uses localStorage for browser compatibility
   */
  async addStocksToWatchlist(watchlistId: string, symbols: string[], userId: string): Promise<void> {
    // Get existing items or initialize empty array
    let existingItems: WatchlistItem[] = [];
    const existingItemsStr = localStorage.getItem(`mock_watchlist_items_${watchlistId}`);
    if (existingItemsStr) {
      try {
        existingItems = JSON.parse(existingItemsStr);
      } catch (e) {
        console.warn(`Error parsing existing items for watchlist ${watchlistId}:`, e);
      }
    }
    
    for (const symbol of symbols) {
      try {
        // Check if symbol already exists in the watchlist
        if (existingItems.some(item => item.symbol === symbol)) {
          console.log(`Symbol ${symbol} already exists in watchlist ${watchlistId}`);
          continue;
        }
        
        // Fetch real stock data
        const stockData = await fmpService.getStockQuote(symbol);
        const companyProfile = await fmpService.getCompanyProfile(symbol);
        
        if (!stockData || !companyProfile) {
          console.warn(`Skipping ${symbol} due to missing data`);
          continue;
        }
        
        // Create the watchlist item
        const itemData: WatchlistItem = {
          id: uuidv4(),
          watchlist_id: watchlistId,
          symbol: symbol,
          added_by: userId,
          notes: `${companyProfile.companyName || symbol}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Add to the items array
        existingItems.push(itemData);
        
        // Store individual item for direct access
        const mockItemKey = `mock_watchlist_item_${watchlistId}_${symbol}`;
        localStorage.setItem(mockItemKey, JSON.stringify(itemData));
        console.log(`Added ${symbol} to watchlist in localStorage`); 
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
      }
    }
    
    // Save the updated items array
    localStorage.setItem(`mock_watchlist_items_${watchlistId}`, JSON.stringify(existingItems));
  },
  
  /**
   * Add AI analysis to a watchlist
   * Uses localStorage for browser compatibility
   */
  async addAIAnalysisToWatchlist(watchlistId: string, symbols: string[], sector: string): Promise<void> {
    try {
      // Generate recommendations (filter out symbols already in the watchlist)
      const existingSymbols = new Set(symbols);
      const recommendations = (SECTOR_RECOMMENDATIONS[sector] || SECTOR_RECOMMENDATIONS['Technology'])
        .filter(rec => !existingSymbols.has(rec.symbol))
        .slice(0, 3);
      
      // Generate sector breakdown
      const sectorBreakdown = [
        { sector, percentage: 100 }
      ];
      
      // Get diversification insight
      const diversificationInsight = DIVERSIFICATION_INSIGHTS[sector] || DIVERSIFICATION_INSIGHTS['Balanced'];
      
      // In browser environment, we'll use localStorage to simulate storing the analysis
      // instead of using the database directly
      try {
        const mockAnalysisKey = `mock_watchlist_analysis_${watchlistId}`;
        const analysisData = {
          id: uuidv4(),
          watchlist_id: watchlistId,
          analysis_type: 'diversification',
          content: {
            analysis: diversificationInsight,
            sectorBreakdown: sectorBreakdown,
            recommendations: recommendations
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        localStorage.setItem(mockAnalysisKey, JSON.stringify(analysisData));
        console.log('Stored mock analysis in localStorage:', mockAnalysisKey);
      } catch (storageError) {
        console.error('Error storing in localStorage:', storageError);
      }
    } catch (error) {
      console.error('Error adding AI analysis:', error);
    }
  },
  
  /**
   * Get AI recommendations for a watchlist
   * Uses localStorage for browser compatibility
   */
  async getWatchlistRecommendations(watchlistId: string): Promise<Array<{ symbol: string; reason: string }>> {
    // Check cache first
    const cacheKey = `mock_watchlist_recommendations_${watchlistId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (error) {
        console.error('Error parsing cached recommendations:', error);
      }
    }
    
    // Get the watchlist to determine its sector
    const watchlistData = localStorage.getItem(`mock_watchlist_${watchlistId}`);
    let sector = 'Technology'; // Default sector
    
    if (watchlistData) {
      try {
        const watchlist = JSON.parse(watchlistData);
        // Find the matching mock watchlist to get the sector
        const mockWatchlist = MOCK_WATCHLISTS.find(mw => mw.name === watchlist.name);
        if (mockWatchlist) {
          sector = mockWatchlist.sector;
        }
      } catch (error) {
        console.error('Error parsing watchlist data:', error);
      }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return recommendations based on the watchlist's sector
    const mockRecommendations = SECTOR_RECOMMENDATIONS[sector] || SECTOR_RECOMMENDATIONS['Technology'] || [];
    
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(mockRecommendations));
    
    return mockRecommendations;
  },
  
  /**
   * Get diversification analysis for a watchlist
   * Uses localStorage for browser compatibility
   */
  async getDiversificationAnalysis(watchlistId: string): Promise<{
    analysis: string;
    sectorBreakdown: Array<{ sector: string; percentage: number }>;
  }> {
    // Check cache first
    const cacheKey = `mock_watchlist_diversification_${watchlistId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (error) {
        console.error('Error parsing cached diversification analysis:', error);
      }
    }
    
    // Get the watchlist to determine its sector
    const watchlistData = localStorage.getItem(`mock_watchlist_${watchlistId}`);
    let sector = 'Technology'; // Default sector
    
    if (watchlistData) {
      try {
        const watchlist = JSON.parse(watchlistData);
        // Find the matching mock watchlist to get the sector
        const mockWatchlist = MOCK_WATCHLISTS.find(mw => mw.name === watchlist.name);
        if (mockWatchlist) {
          sector = mockWatchlist.sector;
        }
      } catch (error) {
        console.error('Error parsing watchlist data:', error);
      }
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate sector breakdown based on the watchlist's main sector
    let sectorBreakdown;
    
    if (sector === 'Technology') {
      sectorBreakdown = [
        { sector: 'Technology', percentage: 60 },
        { sector: 'Financial', percentage: 20 },
        { sector: 'Healthcare', percentage: 10 },
        { sector: 'Consumer', percentage: 10 }
      ];
    } else if (sector === 'Financial') {
      sectorBreakdown = [
        { sector: 'Financial', percentage: 55 },
        { sector: 'Technology', percentage: 25 },
        { sector: 'Consumer', percentage: 15 },
        { sector: 'Energy', percentage: 5 }
      ];
    } else {
      // Balanced portfolio for other sectors
      sectorBreakdown = [
        { sector: sector, percentage: 40 },
        { sector: 'Technology', percentage: 30 },
        { sector: 'Financial', percentage: 20 },
        { sector: 'Healthcare', percentage: 10 }
      ];
    }
    
    // Get the analysis based on the dominant sector
    const dominantSector = sectorBreakdown.reduce((prev, current) => 
      (prev.percentage > current.percentage) ? prev : current
    );
    
    const analysis = DIVERSIFICATION_INSIGHTS[dominantSector.sector] || DIVERSIFICATION_INSIGHTS['Balanced'];
    
    const result = { analysis, sectorBreakdown };
    
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(result));
    
    return result;
  }
};

export default mockWatchlistService;
