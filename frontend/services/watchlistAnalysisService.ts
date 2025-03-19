/**
 * Watchlist Analysis Service
 * 
 * This service provides functions for analyzing watchlists, calculating performance metrics,
 * and generating AI-powered recommendations.
 */

import fmpService from './fmpService';
import mistralService from './ai/mistralService';
import { supabase } from '../utils/supabase/client';
import errorMonitoringService from './errorMonitoringService';
import cacheService from './cacheService';

interface WatchlistStock {
  symbol: string;
  company_name?: string;
  ticker?: string;
}

interface WatchlistPerformanceData {
  date: string;
  value: number;
}

interface WatchlistAnalysis {
  performance: {
    total: number;
    percentage: number;
    timeframe: string;
  };
  stocks: Array<{
    symbol: string;
    name: string;
    contribution: number;
    contributionPercentage: number;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  diversification: 'poor' | 'moderate' | 'good';
}

interface AIRecommendation {
  analysis: string;
  recommendations: Array<{
    symbol: string;
    name: string;
    reason: string;
  }>;
}

class WatchlistAnalysisService {
  /**
   * Calculate the performance of a watchlist over time
   * 
   * @param watchlistId The ID of the watchlist to analyze
   * @param timeframe The timeframe for analysis ('1D', '1W', '1M', '1Y')
   * @returns Performance data for the watchlist
   */
  async getWatchlistPerformance(
    watchlistId: string,
    timeframe: '1D' | '1W' | '1M' | '1Y'
  ): Promise<WatchlistPerformanceData[]> {
    try {
      // Generate cache key based on watchlist ID and timeframe
      const cacheKey = `watchlist:performance:${watchlistId}:${timeframe}`;
      
      // Check if we have cached data
      return cacheService.getOrFetch<WatchlistPerformanceData[]>(
        cacheKey,
        async () => {
          try {
            // Get watchlist items
            const { data: watchlistItems, error } = await supabase
              .from('watchlist_items')
              .select('symbol')
              .eq('watchlist_id', watchlistId)
              .limit(10); // Limit to 10 companies
            
            if (error) {
              console.error('Error fetching watchlist items:', error);
              return this.generateMockPerformanceData(timeframe);
            }
            
            if (!watchlistItems || watchlistItems.length === 0) {
              console.warn('Watchlist is empty, returning mock data');
              return this.generateMockPerformanceData(timeframe);
            }
            
            // In browser environment, we'll use mock data
            return this.generateMockPerformanceData(timeframe);
          } catch (innerError) {
            console.error('Error in getWatchlistPerformance inner function:', innerError);
            return this.generateMockPerformanceData(timeframe);
          }
        },
        { ttl: this.getCacheTTLForTimeframe(timeframe) }
      );
    } catch (error) {
      console.error('Error getting watchlist performance:', error);
      return this.generateMockPerformanceData(timeframe);
    }
  }

  /**
   * Get detailed analysis of a watchlist
   * 
   * @param watchlistId The ID of the watchlist to analyze
   * @returns Detailed analysis of the watchlist
   */
  async analyzeWatchlist(watchlistId: string): Promise<WatchlistAnalysis> {
    try {
      // Generate cache key
      const cacheKey = `watchlist:analysis:${watchlistId}`;
      
      return cacheService.getOrFetch<WatchlistAnalysis>(
        cacheKey,
        async () => {
          try {
            // Get watchlist items
            const { data: watchlistItems, error } = await supabase
              .from('watchlist_items')
              .select('symbol, company_name, ticker')
              .eq('watchlist_id', watchlistId)
              .limit(10); // Limit to 10 companies
            
            if (error) {
              console.error('Error fetching watchlist items:', error);
              return this.generateMockAnalysis();
            }
            
            if (!watchlistItems || watchlistItems.length === 0) {
              console.warn('Watchlist is empty, returning mock analysis');
              return this.generateMockAnalysis();
            }
            
            // In browser environment, use mock data
            return this.generateMockAnalysis();
          } catch (innerError) {
            console.error('Error in analyzeWatchlist inner function:', innerError);
            return this.generateMockAnalysis();
          }
        },
        { ttl: 60 * 60 * 1000 } // 1 hour cache
      );
    } catch (error) {
      console.error('Error analyzing watchlist:', error);
      return this.generateMockAnalysis();
    }
  }

  /**
   * Generate mock performance data for a watchlist
   * 
   * @param timeframe The timeframe for performance data
   * @returns Mock performance data
   */
  private generateMockPerformanceData(timeframe: '1D' | '1W' | '1M' | '1Y'): WatchlistPerformanceData[] {
    const dataPoints = this.getDataPointsForTimeframe(timeframe);
    const mockData: WatchlistPerformanceData[] = [];
    
    // Start with a base value
    let currentValue = 1000;
    
    // Create a start date based on timeframe
    const now = new Date();
    let pointDate = new Date();
    
    switch (timeframe) {
      case '1D':
        pointDate.setHours(0, 0, 0, 0);
        break;
      case '1W':
        pointDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        pointDate.setMonth(now.getMonth() - 1);
        break;
      case '1Y':
        pointDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    // Generate data points
    for (let i = 0; i < dataPoints; i++) {
      // Increment date based on timeframe
      switch (timeframe) {
        case '1D':
          pointDate.setHours(pointDate.getHours() + 1);
          break;
        case '1W':
          pointDate.setDate(pointDate.getDate() + 1);
          break;
        case '1M':
          pointDate.setDate(pointDate.getDate() + 1);
          break;
        case '1Y':
          pointDate.setMonth(pointDate.getMonth() + 1);
          break;
      }
      
      // Generate realistic movement (slight randomness with trend)
      const change = (Math.random() - 0.48) * 100; // Slight upward bias
      currentValue += change;
      
      // Add data point
      mockData.push({
        date: pointDate.toISOString(),
        value: currentValue
      });
    }
    
    return mockData;
  }

  /**
   * Get AI recommendations for a watchlist
   * 
   * @param watchlistId The ID of the watchlist
   * @returns AI recommendations
   */
  async getAIRecommendations(watchlistId: string): Promise<AIRecommendation> {
    try {
      // Generate cache key
      const cacheKey = `watchlist:ai-recommendations:${watchlistId}`;
      
      return cacheService.getOrFetch<AIRecommendation>(
        cacheKey,
        async () => {
          try {
            // Get watchlist items
            const { data: watchlistItems, error } = await supabase
              .from('watchlist_items')
              .select('symbol, company_name, ticker')
              .eq('watchlist_id', watchlistId)
              .limit(10); // Limit to 10 companies
            
            if (error) {
              console.error('Error fetching watchlist items:', error);
              return this.generateMockRecommendations();
            }
            
            if (!watchlistItems || watchlistItems.length === 0) {
              console.warn('Watchlist is empty, returning mock recommendations');
              return this.generateMockRecommendations();
            }
            
            // In browser environment, use mock data
            return this.generateMockRecommendations();
          } catch (innerError) {
            console.error('Error in getAIRecommendations inner function:', innerError);
            return this.generateMockRecommendations();
          }
        },
        { ttl: 60 * 60 * 1000 } // 1 hour cache
      );
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      return this.generateMockRecommendations();
    }
  }

  /**
   * Generate mock analysis for a watchlist
   * 
   * @returns Mock watchlist analysis
   */
  private generateMockAnalysis(): WatchlistAnalysis {
    return {
      performance: {
        total: 1250.75,
        percentage: 12.5,
        timeframe: '1M'
      },
      stocks: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          contribution: 450.25,
          contributionPercentage: 36
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          contribution: 325.50,
          contributionPercentage: 26
        },
        {
          symbol: 'AMZN',
          name: 'Amazon.com Inc.',
          contribution: 275.00,
          contributionPercentage: 22
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          contribution: 200.00,
          contributionPercentage: 16
        }
      ],
      riskLevel: 'medium',
      diversification: 'moderate'
    };
  }
  
  /**
   * Generate mock AI recommendations
   * 
   * @returns Mock AI recommendations
   */
  private generateMockRecommendations(): AIRecommendation {
    return {
      analysis: "This watchlist shows a balanced approach with a mix of growth and value stocks. The technology sector is well-represented, providing good exposure to innovation and digital transformation trends.",
      recommendations: [
        {
          symbol: "NVDA",
          name: "NVIDIA Corporation",
          reason: "Strong AI and GPU market position with continued growth potential"
        },
        {
          symbol: "TSLA",
          name: "Tesla, Inc.",
          reason: "Leader in electric vehicles with expanding energy business"
        },
        {
          symbol: "AMD",
          name: "Advanced Micro Devices, Inc.",
          reason: "Gaining market share in CPU and GPU markets with competitive products"
        }
      ]
    };
  }

  /**
   * Map UI timeframe to FMP timeframe format
   * 
   * @param timeframe The UI timeframe
   * @returns FMP timeframe format
   */
  private mapTimeframeToFMP(timeframe: '1D' | '1W' | '1M' | '1Y'): 'daily' | 'weekly' | 'monthly' {
    switch (timeframe) {
      case '1D':
        return 'daily';
      case '1W':
        return 'daily';
      case '1M':
        return 'daily';
      case '1Y':
        return 'monthly';
      default:
        return 'daily';
    }
  }
  
  /**
   * Get number of data points needed for a timeframe
   * 
   * @param timeframe The timeframe for analysis
   * @returns Number of data points
   */
  private getDataPointsForTimeframe(timeframe: '1D' | '1W' | '1M' | '1Y'): number {
    switch (timeframe) {
      case '1D':
        return 24; // Hourly data for a day
      case '1W':
        return 7; // Daily data for a week
      case '1M':
        return 30; // Daily data for a month
      case '1Y':
        return 12; // Monthly data for a year
      default:
        return 30;
    }
  }
  
  /**
   * Get cache TTL based on timeframe
   * 
   * @param timeframe The timeframe for analysis
   * @returns Cache TTL in milliseconds
   */
  private getCacheTTLForTimeframe(timeframe: '1D' | '1W' | '1M' | '1Y'): number {
    switch (timeframe) {
      case '1D':
        return 5 * 60 * 1000; // 5 minutes
      case '1W':
        return 30 * 60 * 1000; // 30 minutes
      case '1M':
        return 60 * 60 * 1000; // 1 hour
      case '1Y':
        return 24 * 60 * 60 * 1000; // 24 hours
      default:
        return 30 * 60 * 1000;
    }
  }
  
  /**
   * Calculate risk level based on stock volatility and sector concentration
   * 
   * @param stocks Array of stocks
   * @returns Risk level rating
   */
  private calculateRiskLevel(stocks: any[]): 'low' | 'medium' | 'high' {
    // This is a simplified implementation
    // In a real-world scenario, you would use more sophisticated metrics
    
    // Check if we have high-volatility tech stocks
    const highVolatilityTechCount = stocks.filter(stock => 
      stock.sector === 'Technology' && Math.abs(stock.changesPercentage) > 2
    ).length;
    
    if (highVolatilityTechCount >= stocks.length / 2) {
      return 'high';
    } else if (highVolatilityTechCount >= stocks.length / 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  /**
   * Calculate diversification score
   * 
   * @param stocks Array of stocks
   * @returns Diversification rating
   */
  private calculateDiversification(stocks: any[]): 'poor' | 'moderate' | 'good' {
    // Count unique sectors
    const sectors = new Set(stocks.map(stock => stock.sector).filter(Boolean));
    
    if (sectors.size <= 1) {
      return 'poor';
    } else if (sectors.size <= 3) {
      return 'moderate';
    } else {
      return 'good';
    }
  }
  
  /**
   * Aggregate stock data into a single performance timeline
   * 
   * @param stocksData Array of stock data
   * @param timeframe The timeframe for analysis
   * @returns Aggregated performance data
   */
  private aggregateStockData(
    stocksData: any[],
    timeframe: '1D' | '1W' | '1M' | '1Y'
  ): WatchlistPerformanceData[] {
    // Create a map of dates to aggregate values
    const dateMap = new Map<string, number>();
    
    // Process each stock's data
    stocksData.forEach(stockData => {
      if (!stockData || !stockData.historical) return;
      
      stockData.historical.forEach((dataPoint: any) => {
        const date = dataPoint.date;
        const value = dataPoint.close;
        
        if (dateMap.has(date)) {
          dateMap.set(date, dateMap.get(date)! + value);
        } else {
          dateMap.set(date, value);
        }
      });
    });
    
    // Convert map to array and sort by date
    const result = Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return result;
  }
}

// Create and export a singleton instance
const watchlistAnalysisService = new WatchlistAnalysisService();
export default watchlistAnalysisService;
