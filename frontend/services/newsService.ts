/**
 * News Service - Combines FMP and Perplexity API for enhanced financial news
 * 
 * This service fetches financial news from FMP and enhances it with
 * AI-generated insights from Perplexity API.
 */

import { NewsItem } from '../types/market';
import fmpService from './fmpService';
import cacheService from './cacheService';
import errorMonitoringService from './errorMonitoringService';
import perplexityService from './perplexityService';

// Get API key from environment variables
const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * Generate a sentiment analysis prompt for financial news
 */
function generateNewsAnalysisPrompt(newsItem: NewsItem): string {
  return `Analyze the sentiment and potential market impact of this financial news article:
  
Title: ${newsItem.title}
Source: ${newsItem.source}
Summary: ${newsItem.summary}
Related Tickers: ${newsItem.tickers.join(', ')}

Provide a concise sentiment analysis (positive, negative, or neutral) and a brief explanation of potential market impact.
Keep your response under 100 words and focus only on factual analysis.`;
}

/**
 * Call Perplexity API to analyze news sentiment
 */
async function analyzeNewsSentiment(newsItem: NewsItem): Promise<string> {
  try {
    // Check cache first
    const cacheKey = `news:sentiment:${newsItem.title}`;
    const cachedSentiment = cacheService.get<string>(cacheKey);
    
    if (cachedSentiment) {
      return cachedSentiment;
    }
    
    // Call Perplexity API if not in cache
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst specializing in market sentiment analysis.'
          },
          {
            role: 'user',
            content: generateNewsAnalysisPrompt(newsItem)
          }
        ],
        temperature: 0.1,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const sentiment = data.choices[0].message.content.trim();
    
    // Cache the result for 24 hours
    cacheService.set(cacheKey, sentiment, { ttl: 24 * 60 * 60 * 1000 });
    
    return sentiment;
  } catch (error) {
    console.error('Error analyzing news sentiment:', error);
    errorMonitoringService.recordHandledException(
      error instanceof Error ? error : new Error(String(error)),
      'newsService.analyzeNewsSentiment',
      { severity: 'medium' }
    );
    return '';
  }
}

/**
 * News Service class with methods to fetch and enhance financial news
 */
class NewsService {
  /**
   * Get high-quality financial news prioritized by importance for investors
   */
  async getImportantNews(limit: number = 10): Promise<NewsItem[]> {
    try {
      // Use cache to minimize API calls
      const cacheKey = `important-news:${limit}`;
      
      return cacheService.getOrFetch<NewsItem[]>(
        cacheKey,
        async () => {
          // Get high-quality news from Perplexity
          const perplexityNews = await perplexityService.getImportantFinancialNews(limit);
          
          // Transform Perplexity news to match NewsItem format
          const formattedPerplexityNews = perplexityNews.map(item => ({
            title: item.headline,
            summary: item.summary,
            source: item.source || 'Perplexity Analysis',
            url: '',  // Perplexity doesn't provide URLs
            image: '', // Perplexity doesn't provide images
            timestamp: new Date().toISOString(),
            tickers: Array.isArray(item.tickers) ? item.tickers : [],
            sentiment: `Impact: ${item.impact || 'Neutral'}. Importance: ${item.importance || 'Medium'}.`,
            isHighQuality: true
          } as NewsItem));
          
          // Get base news from FMP as a fallback
          const fmpNews = await fmpService.getFinancialNews(limit * 2);
          
          // Process FMP news items with sentiment analysis
          const enhancedFmpNewsPromises = fmpNews.map(async (item) => {
            const sentiment = await analyzeNewsSentiment(item);
            return {
              ...item,
              sentiment,
              isHighQuality: false
            };
          });
          
          const enhancedFmpNews = await Promise.all(enhancedFmpNewsPromises);
          
          // Combine and prioritize news
          // 1. First add all high-quality Perplexity news
          // 2. Then add FMP news that don't overlap with Perplexity news
          const combinedNews = [...formattedPerplexityNews];
          
          // Add FMP news that don't have similar titles to Perplexity news
          for (const fmpItem of enhancedFmpNews) {
            // Skip if we already have enough news
            if (combinedNews.length >= limit) break;
            
            // Check if this news item is similar to any Perplexity news
            const isDuplicate = formattedPerplexityNews.some(perplexityItem => 
              this.isSimilarNews(fmpItem, perplexityItem)
            );
            
            if (!isDuplicate) {
              combinedNews.push(fmpItem);
            }
          }
          
          // Limit to requested number of items
          return combinedNews.slice(0, limit);
        },
        { ttl: 60 * 60 * 1000 } // 1 hour cache
      );
    } catch (error) {
      console.error('Error fetching important news:', error);
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'newsService.getImportantNews',
        { severity: 'high' }
      );
      
      // Fallback to regular enhanced news
      return this.getEnhancedNews(limit);
    }
  }
  
  /**
   * Check if two news items are similar based on title and content
   */
  private isSimilarNews(item1: NewsItem, item2: NewsItem): boolean {
    // Simple similarity check based on common words in titles
    const title1Words = item1.title.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const title2Words = item2.title.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    
    // Count common significant words
    const commonWords = title1Words.filter(word => title2Words.includes(word));
    
    // Check ticker overlap
    const tickerOverlap = item1.tickers.some(ticker => item2.tickers.includes(ticker));
    
    // Consider similar if they share significant words or tickers
    return commonWords.length >= 2 || (tickerOverlap && commonWords.length >= 1);
  }
  
  /**
   * Get enhanced financial news with AI-generated sentiment analysis
   * @deprecated Use getImportantNews instead for higher quality results
   */
  async getEnhancedNews(limit: number = 10): Promise<NewsItem[]> {
    try {
      // Use cache to minimize API calls
      const cacheKey = `enhanced-news:${limit}`;
      
      return cacheService.getOrFetch<NewsItem[]>(
        cacheKey,
        async () => {
          // Get base news from FMP
          const newsItems = await fmpService.getFinancialNews(limit);
          
          // Process news items in parallel with sentiment analysis
          const enhancedNewsPromises = newsItems.map(async (item) => {
            const sentiment = await analyzeNewsSentiment(item);
            return {
              ...item,
              sentiment
            };
          });
          
          return Promise.all(enhancedNewsPromises);
        },
        { ttl: 30 * 60 * 1000 } // 30 minute cache
      );
    } catch (error) {
      console.error('Error fetching enhanced news:', error);
      throw new Error('Failed to fetch enhanced news');
    }
  }
  
  /**
   * Get news related to specific symbols
   */
  async getSymbolNews(symbols: string[], limit: number = 5): Promise<NewsItem[]> {
    try {
      const symbolsKey = symbols.sort().join(',');
      const cacheKey = `symbol-news:${symbolsKey}:${limit}`;
      
      return cacheService.getOrFetch<NewsItem[]>(
        cacheKey,
        async () => {
          // Get all news first
          const allNews = await fmpService.getFinancialNews(30); // Get more to filter from
          
          // Filter news related to the requested symbols
          const filteredNews = allNews.filter(item => 
            item.tickers.some(ticker => symbols.includes(ticker))
          ).slice(0, limit);
          
          // Add sentiment analysis
          const enhancedNewsPromises = filteredNews.map(async (item) => {
            const sentiment = await analyzeNewsSentiment(item);
            return {
              ...item,
              sentiment
            };
          });
          
          return Promise.all(enhancedNewsPromises);
        },
        { ttl: 30 * 60 * 1000 } // 30 minute cache
      );
    } catch (error) {
      console.error(`Error fetching news for symbols ${symbols.join(',')}:`, error);
      throw new Error('Failed to fetch symbol news');
    }
  }
  
  /**
   * Clear news cache to force fresh data
   */
  clearNewsCache(): void {
    // Find and clear all news-related cache entries
    const keysToRemove = cacheService.keys()
      .filter(key => 
        typeof key === 'string' && (
          key.startsWith('news:') || 
          key.startsWith('enhanced-news:') || 
          key.startsWith('symbol-news:')
        )
      );
    
    keysToRemove.forEach(key => cacheService.remove(key));
    console.log(`Cleared ${keysToRemove.length} news cache entries`);
  }
}

// Create and export a singleton instance
const newsService = new NewsService();
export default newsService;
