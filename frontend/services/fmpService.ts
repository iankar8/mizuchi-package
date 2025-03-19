/**
 * Financial Modeling Prep (FMP) API Service
 * 
 * This service provides access to real financial data from FMP,
 * which offers high-quality, reliable market data from SEC sources.
 */

import { MarketIndex, MarketTrend, NewsItem, StockData } from "../types/market";
import errorMonitoringService from "./errorMonitoringService";

// Fetch API key from environment variables with fallback for development
const FMP_API_KEY = import.meta.env.VITE_FMP_API_KEY || "demo";
const BASE_URL = "https://financialmodelingprep.com/api/v3";

// Warning if using demo key in production
if (import.meta.env.MODE === 'production' && !import.meta.env.VITE_FMP_API_KEY) {
  console.warn(
    "WARNING: Using demo FMP API key. Set VITE_FMP_API_KEY env variable in production."
  );
}

import cacheService from './cacheService';

/**
 * Helper function to make API requests to FMP with caching
 */
async function fetchFMP<T>(endpoint: string, params: Record<string, string> = {}, cacheOptions?: {
  ttl?: number;
  bypassCache?: boolean;
}): Promise<T> {
  // Default cache TTLs based on endpoint type
  const getDefaultTTL = () => {
    if (endpoint.includes('/quotes/index')) return 5 * 60 * 1000; // 5 minutes for market indices
    if (endpoint.includes('/sectors-performance')) return 15 * 60 * 1000; // 15 minutes for sector performance
    if (endpoint.includes('/stock_news')) return 30 * 60 * 1000; // 30 minutes for news
    if (endpoint.includes('/historical-price-full')) return 24 * 60 * 60 * 1000; // 24 hours for historical data
    if (endpoint.includes('/profile/')) return 24 * 60 * 60 * 1000; // 24 hours for company profiles
    return 10 * 60 * 1000; // 10 minutes default
  };

  // Generate a cache key based on endpoint and params
  const cacheKey = `fmp:${endpoint}:${JSON.stringify(params)}`;
  const ttl = cacheOptions?.ttl || getDefaultTTL();
  
  // Use the cache service to get or fetch data
  return cacheService.getOrFetch<T>(
    cacheKey,
    async () => {
      try {
        if (!FMP_API_KEY || FMP_API_KEY === 'demo') {
          console.error('[FMP] No valid API key found:', FMP_API_KEY);
          throw new Error('FMP API key not configured');
        }

        // Add API key to all requests
        const queryParams = new URLSearchParams({
          ...params,
          apikey: FMP_API_KEY
        });
        
        const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;
        console.log(`[FMP] Requesting endpoint: ${endpoint}`);

        const response = await fetch(url);
        console.log(`[FMP] Response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[FMP] Error response for ${endpoint}:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            headers: Object.fromEntries(response.headers.entries())
          });
          throw new Error(`FMP API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json() as T;
        console.log(`[FMP] Response data for ${endpoint}:`, {
          dataType: typeof data,
          isArray: Array.isArray(data),
          length: Array.isArray(data) ? data.length : null,
          sample: Array.isArray(data) ? data.slice(0, 1) : data
        });
        return data;
      } catch (error) {
        // Log error to monitoring service
        errorMonitoringService.recordHandledException(
          error instanceof Error ? error : new Error(String(error)),
          'fmpService.fetchFMP',
          { 
            endpoint,
            severity: 'high' 
          }
        );
        throw error;
      }
    },
    {
      ttl,
      storage: 'memory',
    }
  );
}

/**
 * FMP API Service with methods to access financial data
 */
class FMPService {
  /**
   * Get real-time stock quote data
   */
  async getStockQuote(symbol: string): Promise<StockData> {
    try {
      const data = await fetchFMP<Array<{
        symbol: string;
        name: string;
        price: number;
        change: number;
        changesPercentage?: number;
        volume: number;
        marketCap: number;
        pe: number;
        lastDividend?: number;
      }>>(`/quote/${symbol}`);
      
      if (!data || data.length === 0) {
        throw new Error(`No quote data found for symbol: ${symbol}`);
      }
      
      const quote = data[0];
      
      // Calculate percent change if not provided
      const percentChange = quote.changesPercentage !== undefined ? 
        quote.changesPercentage : 
        (quote.price > 0 ? (quote.change / (quote.price - quote.change)) * 100 : 0);
      
      return {
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        change: quote.change,
        percentChange: Number(percentChange.toFixed(2)),
        volume: quote.volume,
        marketCap: quote.marketCap,
        pe: quote.pe,
        dividend: quote.lastDividend || 0
      };
    } catch (error) {
      console.error(`Error fetching stock quote for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get major market indices
   */
  async getMarketIndices(): Promise<MarketIndex[]> {
    try {
      // Fetch all market indices
      const data = await fetchFMP<Array<{
        symbol: string;
        name: string;
        price: number;
        change: number;
        changesPercentage: number;
      }>>('/quotes/index');

      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid market indices data format');
      }

      // Filter for only the three major indices we want
      return data
        .filter(index => [
          '^GSPC',  // S&P 500
          '^DJI',   // Dow Jones
          '^IXIC'   // NASDAQ
        ].includes(index.symbol))
        .map(index => ({
          symbol: index.symbol.replace('^', ''),
          name: index.symbol === '^GSPC' ? 'S&P 500' : 
                index.symbol === '^DJI' ? 'Dow Jones' : 
                index.symbol === '^IXIC' ? 'NASDAQ' : index.name,
          // Format price with dollar sign in the UI, not here
          price: Number(index.price.toFixed(2)),
          change: Number(index.change.toFixed(2)),
          changePercent: Number(index.changesPercentage.toFixed(2))
        }));
    } catch (error) {
      console.error('Error fetching market indices:', error);
      throw new Error('Failed to fetch market indices data');
    }
  }
  
  /**
   * Get sector performance data (market trends)
   */
  async getSectorPerformance(): Promise<MarketTrend[]> {
    try {
      const data = await fetchFMP<Array<{
        sector: string;
        changesPercentage: number;
      }>>('/sectors-performance');
      
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid sector performance data format');
      }

      return data.map(sector => {
        // Handle case where changesPercentage might be a string
        const changeValue = typeof sector.changesPercentage === 'string' ? 
          parseFloat(sector.changesPercentage) : sector.changesPercentage;

        // Validate the parsed value
        if (isNaN(changeValue)) {
          console.error(`Invalid changesPercentage for sector ${sector.sector}:`, sector.changesPercentage);
          return {
            sector: sector.sector,
            trend: 'mixed',
            percentage: 0,
            reason: `${sector.sector} sector data unavailable`
          };
        }

        return {
          sector: sector.sector,
          trend: changeValue > 0 ? "up" : "down",
          percentage: Math.abs(Number(changeValue.toFixed(2))),
          reason: `${sector.sector} sector ${changeValue > 0 ? 'gained' : 'lost'} ${Math.abs(changeValue).toFixed(2)}% today`
        };
      });
    } catch (error) {
      console.error('Error fetching sector performance:', error);
      throw new Error('Failed to fetch sector performance data');
    }
  }
  
  /**
   * Get latest financial news
   */
  async getFinancialNews(limit: number = 10): Promise<NewsItem[]> {
    try {
      const data = await fetchFMP<Array<{
        title: string;
        site: string;
        url: string;
        publishedDate: string;
        text: string;
        image: string;
        tickers: string[];
      }>>('/stock_news', { limit: limit.toString() });
      
      return data.map(item => ({
        title: item.title,
        source: item.site,
        url: item.url,
        timestamp: item.publishedDate,
        summary: item.text.substring(0, 200) + '...', // Truncate long summaries
        image: item.image,
        sentiment: '',
        tickers: item.tickers || []
      }));
    } catch (error) {
      console.error('Error fetching financial news:', error);
      throw error;
    }
  }
  
  /**
   * Get company profile and overview
   */
  async getCompanyProfile(symbol: string): Promise<Record<string, unknown>> {
    try {
      const data = await fetchFMP<Array<Record<string, unknown>>>(`/profile/${symbol}`);
      
      if (!data || data.length === 0) {
        throw new Error(`No company profile found for symbol: ${symbol}`);
      }
      
      return data[0];
    } catch (error) {
      console.error(`Error fetching company profile for ${symbol}:`, error);
      throw error;
    }
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
    try {
      const data = await fetchFMP<Array<{
        symbol: string;
        companyName: string;
        recommendationKey: string;
        recommendationMean: number;
      }>>('/stock/upgrades-downgrades', { limit: limit.toString() });
      
      return data.map(item => ({
        symbol: item.symbol,
        name: item.companyName,
        recommendation: item.recommendationKey,
        score: item.recommendationMean
      }));
    } catch (error) {
      console.error('Error fetching stock recommendations:', error);
      throw error;
    }
  }

  /**
   * Get historical stock data
   */
  /**
   * Get market gainers - stocks with the highest positive change percentage
   */
  async getMarketGainers(limit: number = 10): Promise<Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changesPercentage: number;
    volume?: number;
    marketCap?: number;
  }>> {
    try {
      const data = await fetchFMP<Array<{
        symbol: string;
        name: string;
        price: number;
        change: number;
        changesPercentage: number;
        volume?: number;
        marketCap?: number;
      }>>('/stock_market/gainers', { limit: limit.toString() });
      
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid market gainers data format');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching market gainers:', error);
      throw error;
    }
  }
  
  /**
   * Get market losers - stocks with the highest negative change percentage
   */
  async getMarketLosers(limit: number = 10): Promise<Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changesPercentage: number;
    volume?: number;
    marketCap?: number;
  }>> {
    try {
      const data = await fetchFMP<Array<{
        symbol: string;
        name: string;
        price: number;
        change: number;
        changesPercentage: number;
        volume?: number;
        marketCap?: number;
      }>>('/stock_market/losers', { limit: limit.toString() });
      
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid market losers data format');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching market losers:', error);
      throw error;
    }
  }
  
  /**
   * Get most active stocks by volume
   */
  async getMostActiveStocks(limit: number = 10): Promise<Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changesPercentage: number;
    volume?: number;
    marketCap?: number;
  }>> {

    try {
      const data = await fetchFMP<Array<{
        symbol: string;
        name: string;
        price: number;
        change: number;
        changesPercentage: number;
        volume?: number;
        marketCap?: number;
      }>>('/stock_market/actives', { limit: limit.toString() });
      
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid most active stocks data format');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching most active stocks:', error);
      throw error;
    }
  }

  /**
   * Get stocks by sector
   * 
   * @param sector The sector name to filter stocks by
   * @param limit Maximum number of stocks to return
   * @returns Array of stocks in the specified sector
   */
  async getStocksBySector(sector: string, limit: number = 20): Promise<Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changesPercentage: number;
    volume?: number;
    marketCap?: number;
    sector: string;
  }>> {
    try {
      // First try to get all stocks and filter by sector
      const allStocks = await fetchFMP<Array<{
        symbol: string;
        companyName: string;
        price: number;
        changes: number;
        changesPercentage: number;
        volume?: number;
        marketCap?: number;
        sector: string;
        industry?: string;
      }>>('/stock/list');
      
      if (!allStocks || !Array.isArray(allStocks)) {
        throw new Error(`Failed to fetch stock list`);
      }
      
      // Filter stocks by sector
      const sectorStocks = allStocks
        .filter(stock => 
          stock.sector && 
          stock.sector.toLowerCase() === sector.toLowerCase() && 
          stock.price > 0 && 
          stock.changes !== undefined
        )
        .map(stock => ({
          symbol: stock.symbol,
          name: stock.companyName || stock.symbol,
          price: stock.price || 0,
          change: stock.changes || 0,
          changesPercentage: stock.changesPercentage || 0,
          volume: stock.volume,
          marketCap: stock.marketCap,
          sector: stock.sector
        }))
        .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))
        .slice(0, limit);
      
      if (sectorStocks.length > 0) {
        return sectorStocks;
      }
      
      // Fallback: If no stocks found, try to fetch gainers and filter
      const gainers = await this.getMarketGainers(100);
      const losers = await this.getMarketLosers(100);
      const actives = await this.getMostActiveStocks(100);
      
      // Combine all stocks
      const combinedStocks = [...gainers, ...losers, ...actives];
      
      // Remove duplicates based on symbol
      const uniqueStocks = Array.from(new Map(combinedStocks.map(stock => 
        [stock.symbol, stock]
      )).values());
      
      // Return the top stocks (we don't have sector info, but this is a fallback)
      return uniqueStocks
        .slice(0, limit)
        .map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change: stock.change,
          changesPercentage: stock.changesPercentage,
          volume: stock.volume,
          marketCap: stock.marketCap,
          sector: sector // Use the requested sector
        }));
    } catch (error) {
      console.error(`Error fetching stocks for sector ${sector}:`, error);
      throw error;
    }
  }

  async getHistoricalData(symbol: string, timeframe: 'daily' | 'weekly' | 'monthly' = 'daily', limit: number = 100): Promise<Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      // Determine the correct endpoint based on timeframe
      let endpoint;
      if (timeframe === 'daily') {
        endpoint = `/historical-price-full/${symbol}`;
      } else if (timeframe === 'weekly') {
        endpoint = `/historical-price-full/${symbol}?timeseries=${limit}&serietype=line&resample=weekly`;
      } else if (timeframe === 'monthly') {
        endpoint = `/historical-price-full/${symbol}?timeseries=${limit}&serietype=line&resample=monthly`;
      }
      
      const data = await fetchFMP<{
        symbol: string;
        historical: Array<{
          date: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        }>
      }>(endpoint);
      
      if (!data || !data.historical || !Array.isArray(data.historical)) {
        console.error('Historical data response:', data);
        throw new Error(`No historical data found for symbol: ${symbol}`);
      }
      
      // Limit the results if needed
      return data.historical.slice(0, limit);
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const fmpService = new FMPService();
export default fmpService;
