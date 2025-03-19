// No need to import supabase since we're using simulated data for now

export interface MarketDataPoint {
  date: string;
  value: number;
}

export interface StockQuote {
  symbol: string;
  company_name: string;
  current_price: number;
  change: number;
  change_percent: number;
  last_updated?: string;
}

export interface TopMover {
  symbol: string;
  company_name: string;
  change_percent: number;
  current_price: number;
  color?: string;
}

class MarketDataService {
  // Fetch historical data for a specific watchlist
  async getWatchlistPerformance(
    watchlistId: string,
    timeframe: "1d" | "1w" | "1m" | "1y" = "1m"
  ): Promise<MarketDataPoint[]> {
    try {
      // In a real implementation, this would query the database for actual watchlist stock data
      // For now, we'll simulate the data with a consistent pattern
      console.log(`Fetching ${timeframe} performance data for watchlist ${watchlistId}`);
      
      // Simulated data generation based on timeframe
      const points: MarketDataPoint[] = [];
      const now = new Date();
      let dataPoints = 0;
      let startDate = new Date();
      
      switch (timeframe) {
        case "1d":
          dataPoints = 24; // Hourly data for a day
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "1w":
          dataPoints = 7; // Daily data for a week
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "1m":
          dataPoints = 30; // Daily data for a month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          dataPoints = 12; // Monthly data for a year
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
      
      // Generate data with a slightly upward trend and some randomness
      let baseValue = 10000;
      for (let i = 0; i < dataPoints; i++) {
        const date = new Date(startDate.getTime() + ((now.getTime() - startDate.getTime()) / dataPoints) * i);
        
        // Create some volatility based on watchlistId to make different watchlists behave differently
        const volatilityFactor = parseInt(watchlistId.substring(0, 8), 16) / 1000000000;
        const randomFactor = (Math.random() - 0.3) * volatilityFactor; // Slight upward bias
        
        baseValue = baseValue * (1 + randomFactor);
        
        points.push({
          date: date.toISOString(),
          value: Math.round(baseValue)
        });
      }
      
      return points;
    } catch (error) {
      console.error('Error fetching watchlist performance:', error);
      return [];
    }
  }
  
  // Get quotes for all stocks in a watchlist
  async getWatchlistQuotes(watchlistId: string): Promise<StockQuote[]> {
    try {
      console.log(`Fetching quotes for watchlist ${watchlistId}`);
      
      // In a real implementation, this would:
      // 1. Get all symbols in the watchlist
      // 2. Fetch real-time quotes for those symbols
      
      // For now, we'll return simulated data
      const mockStocks = [
        { symbol: "AAPL", company_name: "Apple Inc." },
        { symbol: "MSFT", company_name: "Microsoft Corporation" },
        { symbol: "GOOGL", company_name: "Alphabet Inc." },
        { symbol: "AMZN", company_name: "Amazon.com, Inc." },
        { symbol: "META", company_name: "Meta Platforms, Inc." },
        { symbol: "TSLA", company_name: "Tesla, Inc." },
        { symbol: "NVDA", company_name: "NVIDIA Corporation" },
        { symbol: "JPM", company_name: "JPMorgan Chase & Co." },
        { symbol: "V", company_name: "Visa Inc." },
        { symbol: "WMT", company_name: "Walmart Inc." }
      ];
      
      // Add some variety based on watchlistId so different watchlists show different data
      const seed = parseInt(watchlistId.substring(0, 8), 16);
      const mockQuotes: StockQuote[] = mockStocks.map((stock, index) => {
        // Create pseudorandom but consistent changes based on the watchlistId and stock index
        const pseudoRandom = Math.sin(seed + index) * 10000;
        const change = Math.round(pseudoRandom) / 100;
        const changePercent = Math.round(pseudoRandom / 5) / 100;
        
        return {
          ...stock,
          current_price: Math.round((100 + pseudoRandom) * 100) / 100,
          change,
          change_percent: changePercent,
          last_updated: new Date().toISOString()
        };
      });
      
      return mockQuotes;
    } catch (error) {
      console.error('Error fetching watchlist quotes:', error);
      return [];
    }
  }
  
  // Get top movers (gainers and losers) from a watchlist
  async getWatchlistMovers(watchlistId: string): Promise<{
    gainers: TopMover[];
    losers: TopMover[];
  }> {
    try {
      // In a real implementation, this would:
      // 1. Get all quotes for the watchlist
      // 2. Sort by percent change to find gainers and losers
      
      const quotes = await this.getWatchlistQuotes(watchlistId);
      
      // Sort by change percent
      const sortedQuotes = [...quotes].sort((a, b) => 
        b.change_percent - a.change_percent
      );
      
      // Extract top gainers and losers
      const gainers = sortedQuotes
        .filter(quote => quote.change_percent > 0)
        .slice(0, 5)
        .map(quote => ({
          symbol: quote.symbol,
          company_name: quote.company_name,
          change_percent: quote.change_percent,
          current_price: quote.current_price,
          color: 'text-green-500'
        }));
      
      const losers = sortedQuotes
        .filter(quote => quote.change_percent < 0)
        .slice(-5)
        .reverse()
        .map(quote => ({
          symbol: quote.symbol,
          company_name: quote.company_name,
          change_percent: quote.change_percent,
          current_price: quote.current_price,
          color: 'text-red-500'
        }));
      
      return { gainers, losers };
    } catch (error) {
      console.error('Error fetching watchlist movers:', error);
      return { gainers: [], losers: [] };
    }
  }
}

const marketDataService = new MarketDataService();
export default marketDataService;
