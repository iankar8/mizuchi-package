/**
 * Market Data Service
 * 
 * This service provides unified access to market data from FMP API.
 * It replaces the Alpha Vantage service with FMP API for all market data needs.
 */

import fmpService from "./fmpService";
import cacheService from "./cacheService";
import errorMonitoringService from "./errorMonitoringService";
import { MarketIndex, MarketTrend, NewsItem, StockData } from "../types/market";

// Cache options interface from cacheService
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'local'; // Type of storage (memory or localStorage)
}

// Cache TTL configuration
const CACHE_TTL = {
  QUOTES: 60 * 1000, // 1 minute
  INDICES: 5 * 60 * 1000, // 5 minutes
  NEWS: 15 * 60 * 1000, // 15 minutes
  TRENDS: 10 * 60 * 1000 // 10 minutes
};

// Helper to create cache options with TTL
const createCacheOptions = (ttl: number): CacheOptions => ({
  ttl,
  storage: 'memory'
});

class MarketDataService {
  /**
   * Get real-time stock quote
   */
  async getStockQuote(symbol: string): Promise<StockData> {
    const cacheKey = `stock-quote-${symbol}`;
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        const quote = await fmpService.getStockQuote(symbol);
        // Ensure percentChange is included
        return {
          ...quote,
          percentChange: quote.percentChange || 0
        };
      },
      createCacheOptions(CACHE_TTL.QUOTES)
    );
  }
  
  /**
   * Get multiple stock quotes
   */
  async getMultipleQuotes(symbols: string[]): Promise<Record<string, StockData>> {
    // Use Promise.all to fetch multiple quotes concurrently
    const promises = symbols.map(symbol => this.getStockQuote(symbol));
    const quotes = await Promise.all(promises);
    
    // Convert array of quotes to a record keyed by symbol
    return quotes.reduce((acc, quote) => {
      acc[quote.symbol] = quote;
      return acc;
    }, {} as Record<string, StockData>);
  }
  
  /**
   * Get major market indices
   */
  async getMarketIndices(): Promise<MarketIndex[]> {
    const cacheKey = 'market-indices';
    
    return cacheService.getOrFetch(
      cacheKey,
      () => fmpService.getMarketIndices(),
      createCacheOptions(CACHE_TTL.INDICES)
    );
  }
  
  /**
   * Get financial news
   */
  async getFinancialNews(limit: number = 10): Promise<NewsItem[]> {
    const cacheKey = `financial-news-${limit}`;
    
    return cacheService.getOrFetch(
      cacheKey,
      () => fmpService.getFinancialNews(limit),
      createCacheOptions(CACHE_TTL.NEWS)
    );
  }
  
  /**
   * Get market trends data (sector performance)
   */
  async getMarketTrends(): Promise<MarketTrend[]> {
    const cacheKey = 'market-trends';
    
    return cacheService.getOrFetch(
      cacheKey,
      () => fmpService.getSectorPerformance(),
      createCacheOptions(CACHE_TTL.TRENDS)
    );
  }

  /**
   * Get news for a specific ticker
   */
  async getTickerNews(ticker: string, limit: number = 5): Promise<NewsItem[]> {
    const cacheKey = `ticker-news-${ticker}-${limit}`;
    
    try {
      return await cacheService.getOrFetch(
        cacheKey,
        async () => {
          const news = await fmpService.getFinancialNews(limit * 2);
          // Filter news items that mention the ticker
          return news.filter(item => 
            item.tickers?.includes(ticker.toUpperCase()) || 
            item.title.includes(ticker.toUpperCase())
          ).slice(0, limit);
        },
        createCacheOptions(CACHE_TTL.NEWS)
      );
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'marketDataService.getTickerNews',
        { ticker, severity: 'medium' }
      );
      return [];
    }
  }
  

  
  /**
   * Get market gainers (top performing stocks)
   */
  async getMarketGainers(limit: number = 10): Promise<StockData[]> {
    const cacheKey = `market-gainers-${limit}`;
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        const gainers = await fmpService.getMarketGainers(limit);
        return gainers.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          price: Number(stock.price.toFixed(2)),
          change: Number(stock.change.toFixed(2)),
          percentChange: Number(stock.changesPercentage.toFixed(2)),
          volume: stock.volume,
          marketCap: stock.marketCap
        }));
      },
      createCacheOptions(CACHE_TTL.QUOTES)
    );
  }

  /**
   * Get market losers (worst performing stocks)
   */
  async getMarketLosers(limit: number = 10): Promise<StockData[]> {
    const cacheKey = `market-losers-${limit}`;
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        const losers = await fmpService.getMarketLosers(limit);
        return losers.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          price: Number(stock.price.toFixed(2)),
          change: Number(stock.change.toFixed(2)),
          percentChange: Number(stock.changesPercentage.toFixed(2)),
          volume: stock.volume,
          marketCap: stock.marketCap
        }));
      },
      createCacheOptions(CACHE_TTL.QUOTES)
    );
  }

  /**
   * Get most active stocks by volume
   */
  async getMostActiveStocks(limit: number = 10): Promise<StockData[]> {
    const cacheKey = `most-active-stocks-${limit}`;
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        const activeStocks = await fmpService.getMostActiveStocks(limit);
        return activeStocks.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          price: Number(stock.price.toFixed(2)),
          change: Number(stock.change.toFixed(2)),
          percentChange: Number(stock.changesPercentage.toFixed(2)),
          volume: stock.volume,
          marketCap: stock.marketCap
        }));
      },
      createCacheOptions(CACHE_TTL.QUOTES)
    );
  }

  /**
   * Get all market movers (gainers, losers, and most active)
   */
  async getAllMarketMovers(limit: number = 5): Promise<{
    gainers: StockData[];
    losers: StockData[];
    mostActive: StockData[];
  }> {
    try {
      const [gainers, losers, mostActive] = await Promise.all([
        this.getMarketGainers(limit),
        this.getMarketLosers(limit),
        this.getMostActiveStocks(limit)
      ]);

      return {
        gainers,
        losers,
        mostActive
      };
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'marketDataService.getAllMarketMovers',
        { severity: 'medium' }
      );
      return {
        gainers: [],
        losers: [],
        mostActive: []
      };
    }
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(symbol: string): Promise<Record<string, unknown>> {
    const cacheKey = `company-profile-${symbol}`;
    
    return cacheService.getOrFetch(
      cacheKey,
      () => fmpService.getCompanyProfile(symbol),
      createCacheOptions(CACHE_TTL.INDICES)
    );
  }

  /**
   * Get stock recommendations
   */
  async getStockRecommendations(limit: number = 10): Promise<Array<{
    symbol: string;
    name: string;
    recommendation: string;
    score: number;
  }>> {
    const cacheKey = `stock-recommendations-${limit}`;
    
    return cacheService.getOrFetch(
      cacheKey,
      () => fmpService.getStockRecommendations(limit),
      createCacheOptions(CACHE_TTL.QUOTES)
    );
  }

  /**
   * Get historical stock data
   */
  async getHistoricalData(
    symbol: string, 
    timeframe: 'daily' | 'weekly' | 'monthly' = 'daily', 
    limit: number = 100
  ): Promise<Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    const cacheKey = `historical-data-${symbol}-${timeframe}-${limit}`;
    
    return cacheService.getOrFetch(
      cacheKey,
      () => fmpService.getHistoricalData(symbol, timeframe, limit),
      createCacheOptions(CACHE_TTL.QUOTES)
    );
  }

  /**
   * Get stocks by sector
   */
  async getSectorStocks(sector: string, limit: number = 20): Promise<StockData[]> {
    const cacheKey = `sector-stocks-${sector}-${limit}`;
    
    try {
      return await cacheService.getOrFetch(
        cacheKey,
        async () => {
          const stocks = await fmpService.getStocksBySector(sector, limit);
          return stocks.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            price: Number(stock.price.toFixed(2)),
            change: Number(stock.change.toFixed(2)),
            percentChange: Number(stock.changesPercentage.toFixed(2)),
            volume: stock.volume,
            marketCap: stock.marketCap
          }));
        },
        createCacheOptions(CACHE_TTL.QUOTES)
      );
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'marketDataService.getSectorStocks',
        { sector, severity: 'medium' }
      );
      return [];
    }
  }
}

// Create and export a singleton instance
const marketDataService = new MarketDataService();
export default marketDataService;
