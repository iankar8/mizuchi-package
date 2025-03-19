/**
 * Perplexity API Service
 * 
 * This service provides access to Perplexity AI for market research and analysis.
 * Enhanced with standardized Result pattern for research integration.
 */

import cacheService from './cacheService';
import errorMonitoringService from './errorMonitoringService';

// Get API key from environment variables
const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Warning if no API key is found
if (!PERPLEXITY_API_KEY) {
  console.warn('No Perplexity API key found. Set VITE_PERPLEXITY_API_KEY in your environment variables.');
}

/**
 * Result interface for standardized API responses
 */
export interface AIResult {
  content: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
    confidence: number;
  }>;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Perplexity Service class
 */
class PerplexityService {
  /**
   * Search for market trend information using Perplexity
   */
  private async searchMarketTrend(sector: string, trend: 'up' | 'down' | 'mixed', percentage: number): Promise<string> {
  try {
    // Generate a cache key based on the search parameters
    const cacheKey = `perplexity:market:${sector}:${trend}:${percentage.toFixed(2)}`;
    
    // Check cache first
    const cachedResult = cacheService.get<string>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Construct the prompt for Perplexity
    const prompt = `Explain why the ${sector} sector is ${trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'mixed'} by ${percentage.toFixed(2)}% today in exactly 3 concise sentences. 
    First sentence: Identify the primary driver of this movement (specific company news, economic data, etc.).
    Second sentence: Mention key stocks or companies influencing this trend with specific numbers if relevant.
    Third sentence: Briefly note any broader market context, analyst reactions, or future outlook.
    
    Be direct, factual, and investor-focused. Avoid filler phrases and unnecessary context.`;
    
    // Call Perplexity API
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
            content: 'You are a financial analyst specializing in sector analysis. Provide factual, concise explanations for market movements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 150
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Cache the result
    cacheService.set(cacheKey, content, { ttl: 4 * 60 * 60 * 1000 }); // 4 hour cache
    
    return content;
  } catch (error) {
    console.error('Error searching with Perplexity:', error);
    errorMonitoringService.recordHandledException(
      error instanceof Error ? error : new Error(String(error)),
      'perplexityService.searchMarketTrend',
      { severity: 'medium' }
    );
    
    // Return a generic message if there's an error
    return `The ${sector} sector is currently ${trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'showing mixed performance'} by ${percentage.toFixed(2)}%. Market analysts are monitoring this trend.`;
  }
}

  /**
   * Fetch high-quality financial news directly from Perplexity
   */
  private async fetchImportantFinancialNews(limit: number = 5): Promise<any[]> {
  try {
    // Generate a cache key
    const cacheKey = `perplexity:important-news:${limit}:${new Date().toISOString().split('T')[0]}`;
    
    // Check cache first
    const cachedResult = cacheService.get<any[]>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Construct the prompt for Perplexity
    const prompt = `What are the ${limit} most important financial news stories investors need to know today? 
    For each news item, provide:
    1. A concise headline (one sentence)
    2. A brief summary (2-3 sentences)
    3. The primary tickers/companies affected
    4. The source of the news
    5. The potential market impact (bullish, bearish, or neutral)
    
    Format your response as a JSON array with objects containing these fields: 
    headline, summary, tickers (array), source, impact (bullish/bearish/neutral), and importance (high/medium/low).
    Do not include any text outside the JSON array.`;
    
    // Call Perplexity API
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
            content: 'You are a financial news curator who identifies the most important financial news for investors. Return only valid JSON.'  
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let newsItems;
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*)\n```/) || 
                        content.match(/```([\s\S]*)```/);
      
      const jsonContent = jsonMatch ? jsonMatch[1] : content;
      newsItems = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Error parsing Perplexity news JSON:', parseError);
      throw new Error('Failed to parse news data from Perplexity');
    }
    
    // Cache the result
    cacheService.set(cacheKey, newsItems, { ttl: 4 * 60 * 60 * 1000 }); // 4 hour cache
    
    return newsItems;
  } catch (error) {
    console.error('Error fetching important news from Perplexity:', error);
    errorMonitoringService.recordHandledException(
      error instanceof Error ? error : new Error(String(error)),
      'perplexityService.fetchImportantFinancialNews',
      { severity: 'medium' }
    );
    
    // Return empty array on error
    return [];
  }
}

  /**
   * Process a research query using Perplexity
   */

  private async processResearchQuery(query: string, options: {
  temperature?: number;
  maxTokens?: number;
  extractSources?: boolean;
} = {}): Promise<AIResult> {
  try {
    const {
      temperature = 0.2,
      maxTokens = 1000,
      extractSources = true
    } = options;
    
    // Generate a cache key based on the query parameters
    const cacheKey = `perplexity:research:${query}:${temperature}:${maxTokens}:${extractSources}`;
    
    // Check cache first
    const cachedResult = cacheService.get<AIResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Construct the prompt for Perplexity
    const systemPrompt = extractSources 
      ? `You are a financial research assistant. Provide detailed, accurate information with sources when available. Format your response to clearly separate facts from analysis. If you cite information, include the source in the format [1]: Source Title (URL).`
      : `You are a financial research assistant. Provide detailed, accurate information based on your knowledge. Format your response to clearly separate facts from analysis.`;
    
    // Call Perplexity API
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract sources if requested
    let sources = [];
    if (extractSources) {
      // Simple regex to extract sources in the format [1]: Title (URL)
      const sourceRegex = /\[(\d+)\]:\s*(.*?)(?:\s*\((https?:\/\/[^\s)]+)\))?/g;
      let match;
      
      while ((match = sourceRegex.exec(content)) !== null) {
        const sourceNumber = match[1];
        const title = match[2].trim();
        const url = match[3] || '';
        
        sources.push({
          title,
          url,
          snippet: `Source [${sourceNumber}]`,
          confidence: 0.8 // Default confidence score
        });
      }
    }
    
    const result: AIResult = {
      content: content,
      sources: sources.length > 0 ? sources : undefined
    };
    
    // Cache the result
    cacheService.set(cacheKey, result, { ttl: 24 * 60 * 60 * 1000 }); // 24 hour cache
    
    return result;
  } catch (error) {
    console.error('Error processing research query with Perplexity:', error);
    errorMonitoringService.recordHandledException(
      error instanceof Error ? error : new Error(String(error)),
      'perplexityService.processResearchQuery',
      { severity: 'medium' }
    );
    
    return {
      content: 'I apologize, but I encountered an error while processing your research query. Please try again later.',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

  /**
   * Get market trend analysis for a specific sector
   */
  async getMarketTrendAnalysis(sector: string, trend: 'up' | 'down' | 'mixed', percentage: number): Promise<string> {
    return this.searchMarketTrend(sector, trend, percentage);
  }
  
  /**
   * Get market trend analyses for multiple sectors in parallel
   */
  async getMultipleTrendAnalyses(sectors: Array<{
    sector: string;
    trend: 'up' | 'down' | 'mixed';
    percentage: number;
  }>): Promise<Record<string, string>> {
    try {
      // Run searches in parallel
      const results = await Promise.all(
        sectors.map(async ({ sector, trend, percentage }) => {
          const analysis = await this.getMarketTrendAnalysis(sector, trend, percentage);
          return { sector, analysis };
        })
      );
      
      // Convert to record
      return results.reduce((acc, { sector, analysis }) => {
        acc[sector] = analysis;
        return acc;
      }, {} as Record<string, string>);
    } catch (error) {
      console.error('Error getting multiple trend analyses:', error);
      throw new Error('Failed to get market trend analyses');
    }
  }
  
  /**
   * Get important financial news for investors
   * 
   * @param limit Number of news items to return
   * @returns Array of important financial news items
   */
  async getImportantFinancialNews(limit: number = 5): Promise<any[]> {
    return this.fetchImportantFinancialNews(limit);
  }

  /**
   * Process a research query
   */
  async processQuery(query: string, options: {
    temperature?: number;
    maxTokens?: number;
    extractSources?: boolean;
  } = {}): Promise<AIResult> {
    return this.processResearchQuery(query, options);
  }
  
  /**
   * Process multiple research queries in parallel
   */
  async processMultipleQueries(queries: string[], options: {
    temperature?: number;
    maxTokens?: number;
    extractSources?: boolean;
  } = {}): Promise<AIResult[]> {
    try {
      // Run queries in parallel
      const results = await Promise.all(
        queries.map(query => this.processQuery(query, options))
      );
      
      return results;
    } catch (error) {
      console.error('Error processing multiple queries:', error);
      throw new Error('Failed to process multiple research queries');
    }
  }
}

// Create and export a singleton instance
const perplexityService = new PerplexityService();
export default perplexityService;
