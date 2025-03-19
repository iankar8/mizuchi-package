import axios from 'axios';

// Types for FMP API responses
export interface CompanyProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: number;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dcfDiff: number;
  dcf: number;
  image: string;
  ipoDate: string;
  defaultImage: boolean;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isAdr: boolean;
  isFund: boolean;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

export interface FinancialStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  [key: string]: any; // For various financial metrics
}

export interface MarketMover {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

class FMPService {
  private baseUrl = 'https://financialmodelingprep.com/api/v3';
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';
    if (!this.apiKey) {
      console.warn('FMP API key is missing. Set NEXT_PUBLIC_FMP_API_KEY in your environment variables.');
    }
  }
  
  /**
   * Get company profile information
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
      const data = await this.get<CompanyProfile[]>(`/profile/${symbol}`);
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error(`Error fetching company profile for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Get latest stock quote
   */
  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const data = await this.get<StockQuote[]>(`/quote/${symbol}`);
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Get income statement data
   */
  async getIncomeStatement(symbol: string, period: 'quarter' | 'annual' = 'annual', limit: number = 4): Promise<FinancialStatement[]> {
    try {
      return await this.get<FinancialStatement[]>(`/income-statement/${symbol}?period=${period}&limit=${limit}`);
    } catch (error) {
      console.error(`Error fetching income statement for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Get balance sheet data
   */
  async getBalanceSheet(symbol: string, period: 'quarter' | 'annual' = 'annual', limit: number = 4): Promise<FinancialStatement[]> {
    try {
      return await this.get<FinancialStatement[]>(`/balance-sheet-statement/${symbol}?period=${period}&limit=${limit}`);
    } catch (error) {
      console.error(`Error fetching balance sheet for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Get cash flow statement data
   */
  async getCashFlowStatement(symbol: string, period: 'quarter' | 'annual' = 'annual', limit: number = 4): Promise<FinancialStatement[]> {
    try {
      return await this.get<FinancialStatement[]>(`/cash-flow-statement/${symbol}?period=${period}&limit=${limit}`);
    } catch (error) {
      console.error(`Error fetching cash flow statement for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Get historical stock prices
   */
  async getHistoricalPrices(symbol: string, from: string, to: string, resolution: '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour' | 'daily' = 'daily'): Promise<any[]> {
    try {
      return await this.get<any[]>(`/historical-price-full/${symbol}?from=${from}&to=${to}&timeseries=true`);
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Get company news
   */
  async getCompanyNews(symbol: string, limit: number = 10): Promise<any[]> {
    try {
      return await this.get<any[]>(`/stock_news?tickers=${symbol}&limit=${limit}`);
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Get market movers (gainers and losers)
   */
  async getMarketMovers(limit: number = 10): Promise<{ gainers: MarketMover[], losers: MarketMover[] }> {
    try {
      const [gainers, losers] = await Promise.all([
        this.get<MarketMover[]>(`/gainers?limit=${limit}`),
        this.get<MarketMover[]>(`/losers?limit=${limit}`)
      ]);
      
      return {
        gainers: gainers || [],
        losers: losers || []
      };
    } catch (error) {
      console.error('Error fetching market movers:', error);
      return { gainers: [], losers: [] };
    }
  }
  
  /**
   * Get SEC filings for a company
   */
  async getSECFilings(symbol: string, limit: number = 10): Promise<any[]> {
    try {
      return await this.get<any[]>(`/sec_filings/${symbol}?limit=${limit}`);
    } catch (error) {
      console.error(`Error fetching SEC filings for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Generic GET request handler
   */
  private async get<T>(endpoint: string): Promise<T> {
    try {
      const response = await axios.get(
        `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${this.apiKey}`
      );
      return response.data as T;
    } catch (error) {
      console.error(`Error in FMP API request: ${endpoint}`, error);
      throw error;
    }
  }
}

// Create singleton instance
const fmpService = new FMPService();
export default fmpService;
