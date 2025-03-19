import { supabase } from "@/utils/supabase/client";
import marketDataService from "./marketDataService";
import { MarketIndex, MarketTrend, NewsItem, StockData } from "../types/market";
import errorMonitoringService from "./errorMonitoringService";

// Cache for storing data to reduce API calls
const cache: Record<string, { data: unknown; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Unified data service that handles both real and mock data
 * This ensures consistency across the application
 */
class DataService {
  /**
   * Get market indices data
   */
  async getMarketIndices(): Promise<MarketIndex[]> {
    const cacheKey = 'market-indices';
    
    // Check cache first
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
      return cache[cacheKey].data as MarketIndex[];
    }
    
    try {
      // Get real data from Market Data Service
      const realData = await marketDataService.getMarketIndices();
      
      if (!realData || !Array.isArray(realData) || realData.length === 0) {
        throw new Error('Invalid market indices data received from API');
      }
      
      cache[cacheKey] = { data: realData, timestamp: Date.now() };
      return realData;
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'dataService.getMarketIndices',
        { severity: 'high' }
      );
      throw error;
    }
  }
  
  /**
   * Get market trends data
   */
  async getMarketTrends(): Promise<MarketTrend[]> {
    const cacheKey = 'market-trends';
    
    // Check cache first
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
      return cache[cacheKey].data as MarketTrend[];
    }
    
    try {
      // Get real sector performance data from Market Data Service
      const sectorData = await marketDataService.getMarketTrends();
      
      if (!sectorData || !Array.isArray(sectorData)) {
        throw new Error('Invalid sector performance data received from API');
      }
      
      // FMP service already returns data in our MarketTrend format
      const trends = sectorData;
      
      // Sort by absolute percentage change (highest first)
      trends.sort((a, b) => b.percentage - a.percentage);
      
      // Take top 5 sectors with most movement
      const topTrends = trends.slice(0, 5);
      
      cache[cacheKey] = { data: topTrends, timestamp: Date.now() };
      return topTrends;
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'dataService.getMarketTrends',
        { severity: 'high' }
      );
      throw error;
    }
  }
  
  /**
   * Get financial news
   */
  async getFinancialNews(): Promise<NewsItem[]> {
    const cacheKey = 'financial-news';
    
    // Check cache first
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
      return cache[cacheKey].data as NewsItem[];
    }
    
    try {
      // Get real news data from Market Data Service
      const realData = await marketDataService.getFinancialNews();
      
      if (!realData || !Array.isArray(realData) || realData.length === 0) {
        throw new Error('Invalid news data received from API');
      }
      
      // Format the news data consistently
      const formattedNews = realData.map(item => ({
        title: item.title,
        source: item.source,
        url: item.url,
        timestamp: item.timestamp,
        summary: item.summary,
        image: item.image
      }));
      
      cache[cacheKey] = { data: formattedNews, timestamp: Date.now() };
      return formattedNews;
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'dataService.getFinancialNews',
        { severity: 'high' }
      );
      throw error;
    }
  }
  
  /**
   * Get stock data for a symbol
   */
  async getStockData(symbol: string): Promise<StockData | null> {
    const cacheKey = `stock-${symbol}`;
    
    // Check cache first
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
      return cache[cacheKey].data as StockData;
    }
    
    try {
      // Get real stock data from Market Data Service
      const quoteData = await marketDataService.getStockQuote(symbol);
      
      if (!quoteData || !quoteData.symbol) {
        throw new Error(`Failed to get quote data for ${symbol}`);
      }
      
      // Get company data from watchlists and watchlist_items tables
      // First get all watchlist items with this symbol
      const { data: watchlistItems, error } = await supabase
        .from('watchlist_items')
        .select('symbol, notes, watchlist_id')
        .eq('symbol', symbol);
      
      // Default company name
      let companyName = `${quoteData.symbol} Stock`;
      
      // If we have watchlist items, try to get more info from the watchlist
      if (watchlistItems && watchlistItems.length > 0) {
        // Get the first watchlist that contains this symbol
        const watchlistId = watchlistItems[0].watchlist_id;
        
        // Get the watchlist to extract any notes about this symbol
        const { data: watchlist } = await supabase
          .from('watchlists')
          .select('name')
          .eq('id', watchlistId)
          .single();
          
        // If we have notes for this symbol, use them to enhance the display
        if (watchlistItems[0].notes) {
          // Notes might contain company name or other useful info
          companyName = watchlistItems[0].notes.includes(':') 
            ? watchlistItems[0].notes.split(':')[0].trim()
            : companyName;
        }
      }
      
      // Transform FMP data to our StockData format
      const stockData: StockData = {
        symbol: quoteData.symbol,
        name: companyName,
        price: quoteData.price,
        change: quoteData.change,
        percentChange: quoteData.price > 0 ? (quoteData.change / quoteData.price) * 100 : 0,
        volume: quoteData.volume,
        // We don't have these values from our current data sources
        // Will be populated when we have more comprehensive data
        marketCap: undefined,
        pe: undefined,
        dividend: undefined
      };
      
      cache[cacheKey] = { data: stockData, timestamp: Date.now() };
      return stockData;
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'dataService.getStockData',
        { severity: 'medium', symbol }
      );
      throw error;
    }
  }
  
  /**
   * Clear all cached data
   */
  clearCache() {
    Object.keys(cache).forEach(key => {
      delete cache[key];
    });
  }
}

export default new DataService();
