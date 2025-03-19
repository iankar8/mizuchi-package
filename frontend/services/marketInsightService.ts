/**
 * Market Insight Service - Provides AI-powered analysis of market data and news
 * 
 * This service uses Mistral AI to analyze financial news and market data,
 * providing curated insights and summaries.
 */

import { MarketTrend, NewsItem } from '../types/market';
import fmpService from './fmpService';
import perplexityService from './perplexityService';
import cacheService from './cacheService';
import errorMonitoringService from './errorMonitoringService';

// Get API key from environment variables
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

/**
 * Interface for curated news item with AI analysis
 */
export interface CuratedNewsItem extends NewsItem {
  importance: 'high' | 'medium' | 'low';
  aiSummary: string;
  marketImpact: string;
  relatedSectors: string[];
}

/**
 * Generate a prompt for news curation
 */
function generateNewsCurationPrompt(newsItems: NewsItem[]): string {
  return `Analyze the following financial news articles and identify the most important ones for investors:

${newsItems.map((item, index) => `
[${index + 1}] Title: ${item.title}
    Source: ${item.source}
    Date: ${item.timestamp}
    Summary: ${item.summary}
    Tickers: ${item.tickers.join(', ')}
`).join('\n')}

For each article, provide:
1. Importance rating (high, medium, or low)
2. A concise 1-2 sentence summary in your own words
3. Potential market impact (1 sentence)
4. Related market sectors affected

Focus on news that has significant market implications or reveals important economic trends.
Format your response as JSON with the following structure for each article:
{
  "curatedNews": [
    {
      "index": 1,
      "importance": "high|medium|low",
      "aiSummary": "concise summary",
      "marketImpact": "potential impact",
      "relatedSectors": ["sector1", "sector2"]
    },
    ...
  ]
}`;
}

/**
 * Call Mistral API for news analysis
 */
async function analyzeMistralNews(newsItems: NewsItem[]): Promise<CuratedNewsItem[]> {
  try {
    // Generate a cache key based on news titles
    const titleHash = newsItems.map(item => item.title.substring(0, 20)).join('|');
    const cacheKey = `news:mistral:${titleHash}`;
    
    // Check cache first
    const cachedAnalysis = cacheService.get<CuratedNewsItem[]>(cacheKey);
    if (cachedAnalysis) {
      return cachedAnalysis;
    }
    
    // Call Mistral API
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst specializing in market news analysis and curation.'
          },
          {
            role: 'user',
            content: generateNewsCurationPrompt(newsItems)
          }
        ],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Mistral response');
    }
    
    const jsonData = JSON.parse(jsonMatch[0]);
    
    // Map the AI analysis back to the original news items
    const curatedNews = newsItems.map((newsItem, i) => {
      const analysis = jsonData.curatedNews.find((item: any) => item.index === i + 1) || {
        importance: 'low',
        aiSummary: '',
        marketImpact: '',
        relatedSectors: []
      };
      
      return {
        ...newsItem,
        importance: analysis.importance || 'low',
        aiSummary: analysis.aiSummary || '',
        marketImpact: analysis.marketImpact || '',
        relatedSectors: analysis.relatedSectors || []
      };
    });
    
    // Sort by importance
    curatedNews.sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    });
    
    // Cache the result
    cacheService.set(cacheKey, curatedNews, { ttl: 60 * 60 * 1000 }); // 1 hour cache
    
    return curatedNews;
  } catch (error) {
    console.error('Error analyzing news with Mistral:', error);
    errorMonitoringService.recordHandledException(
      error instanceof Error ? error : new Error(String(error)),
      'marketInsightService.analyzeMistralNews',
      { severity: 'medium' }
    );
    
    // Return original news items without AI analysis if there's an error
    return newsItems.map(item => ({
      ...item,
      importance: 'medium',
      aiSummary: '',
      marketImpact: '',
      relatedSectors: []
    }));
  }
}

/**
 * Interface for enhanced market trend with AI analysis
 */
export interface EnhancedMarketTrend extends MarketTrend {
  perplexityAnalysis: string;
  mistralInsight: string;
  analysis?: string;
}

/**
 * Generate a prompt for market trend analysis
 */
function generateMarketTrendPrompt(trends: MarketTrend[], perplexityAnalyses: Record<string, string>): string {
  return `Analyze the following market sector trends and their analyses:

${trends.map((trend, index) => `
[${index + 1}] Sector: ${trend.sector}
    Performance: ${trend.trend === 'up' ? '+' : '-'}${trend.percentage.toFixed(2)}%
    Analysis: ${perplexityAnalyses[trend.sector] || 'No analysis available'}
`).join('\n')}

For each sector, provide a detailed yet concise description that:
1. Explains the key drivers behind the sector's performance
2. Mentions specific companies, products, or technologies influencing the trend
3. References recent earnings reports, institutional investments, or analyst recommendations
4. Explains the broader market implications

Write in a professional financial analyst style - factual, specific, and informative. 
Avoid generic statements like "The sector is up due to strong performance." 
Instead, provide specific details like "AI-related stocks continue to lead market gains following positive earnings reports and increased institutional investment in AI technologies."

Format your response as JSON with the following structure:
{
  "sectorInsights": [
    {
      "sector": "sector name",
      "insight": "your detailed insight here (2-3 sentences)"
    },
    ...
  ],
  "marketOverview": "brief 2-3 sentence overview of the overall market based on these trends"
}`;
}

/**
 * Call Mistral API for market trend analysis
 */
async function analyzeMistralTrends(
  trends: MarketTrend[], 
  perplexityAnalyses: Record<string, string>
): Promise<Record<string, string>> {
  try {
    // Generate a cache key based on trend data
    const trendHash = trends.map(t => `${t.sector}:${t.percentage.toFixed(1)}`).join('|');
    const cacheKey = `trends:mistral:${trendHash}`;
    
    // Check cache first
    const cachedAnalysis = cacheService.get<Record<string, string>>(cacheKey);
    if (cachedAnalysis) {
      return cachedAnalysis;
    }
    
    // Call Mistral API
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'You are a senior financial analyst specializing in market sector analysis. Provide detailed, specific insights that explain market movements with reference to actual companies, products, earnings reports, and institutional activities. Your analysis should be factual, specific, and informative - avoid generic statements and focus on the concrete factors driving market trends.'
          },
          {
            role: 'user',
            content: generateMarketTrendPrompt(trends, perplexityAnalyses)
          }
        ],
        temperature: 0.2,
        max_tokens: 1024
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Mistral response');
    }
    
    const jsonData = JSON.parse(jsonMatch[0]);
    
    // Map the insights to sectors
    const sectorInsights: Record<string, string> = {};
    
    if (jsonData.sectorInsights && Array.isArray(jsonData.sectorInsights)) {
      jsonData.sectorInsights.forEach((item: { sector: string; insight: string }) => {
        sectorInsights[item.sector] = item.insight;
      });
    }
    
    // Add market overview as a special entry
    if (jsonData.marketOverview) {
      sectorInsights['_marketOverview'] = jsonData.marketOverview;
    }
    
    // Cache the result
    cacheService.set(cacheKey, sectorInsights, { ttl: 4 * 60 * 60 * 1000 }); // 4 hour cache
    
    return sectorInsights;
  } catch (error) {
    console.error('Error analyzing trends with Mistral:', error);
    errorMonitoringService.recordHandledException(
      error instanceof Error ? error : new Error(String(error)),
      'marketInsightService.analyzeMistralTrends',
      { severity: 'medium' }
    );
    
    // Return empty insights if there's an error
    return {};
  }
}

/**
 * Market Insight Service class
 */
class MarketInsightService {
  /**
   * Get AI-curated financial news
   */
  async getCuratedNews(limit: number = 10): Promise<CuratedNewsItem[]> {
    try {
      // Get raw news from FMP
      const newsItems = await fmpService.getFinancialNews(limit * 2); // Get more to filter down
      
      // Use Mistral to analyze and curate the news
      const curatedNews = await analyzeMistralNews(newsItems);
      
      // Return top news items based on importance
      return curatedNews.slice(0, limit);
    } catch (error) {
      console.error('Error getting curated news:', error);
      throw new Error('Failed to get curated news');
    }
  }
  
  /**
   * Get enhanced market trends with AI analysis
   */
  async getEnhancedMarketTrends(limit: number = 5): Promise<EnhancedMarketTrend[]> {
    try {
      // Get raw market trends from FMP
      const trends = await fmpService.getSectorPerformance();
      
      // Sort by absolute percentage change (highest first)
      trends.sort((a, b) => Math.abs(b.percentage) - Math.abs(a.percentage));
      
      // Take top trends
      const topTrends = trends.slice(0, limit);
      
      // Get Perplexity analyses for each trend
      const perplexityAnalyses = await perplexityService.getMultipleTrendAnalyses(
        topTrends.map(trend => ({
          sector: trend.sector,
          trend: trend.trend,
          percentage: trend.percentage
        }))
      );
      
      // Get Mistral insights based on Perplexity analyses
      const mistralInsights = await analyzeMistralTrends(topTrends, perplexityAnalyses);
      
      // Combine all data
      const enhancedTrends: EnhancedMarketTrend[] = topTrends.map(trend => ({
        ...trend,
        perplexityAnalysis: perplexityAnalyses[trend.sector] || '',
        mistralInsight: mistralInsights[trend.sector] || '',
        analysis: mistralInsights[trend.sector] || perplexityAnalyses[trend.sector] || ''
      }));
      
      return enhancedTrends;
    } catch (error) {
      console.error('Error getting enhanced market trends:', error);
      throw new Error('Failed to get enhanced market trends');
    }
  }
  
  /**
   * Get AI-curated company-specific news
   */
  async getCuratedCompanyNews(symbol: string, limit: number = 5): Promise<CuratedNewsItem[]> {
    try {
      // Get more news items than needed to filter
      const allNews = await fmpService.getFinancialNews(30);
      
      // Filter for news related to the company
      const companyNews = allNews.filter(item => 
        item.tickers.includes(symbol) || 
        item.title.includes(symbol) ||
        item.summary.includes(symbol)
      ).slice(0, limit * 2);
      
      if (companyNews.length === 0) {
        return [];
      }
      
      // Use Mistral to analyze and curate the company news
      const curatedNews = await analyzeMistralNews(companyNews);
      
      // Return top news items based on importance
      return curatedNews.slice(0, limit);
    } catch (error) {
      console.error(`Error getting curated news for ${symbol}:`, error);
      throw new Error(`Failed to get curated news for ${symbol}`);
    }
  }
  
  /**
   * Generate market summary with Mistral
   */
  async getMarketSummary(): Promise<{
    summary: string;
    keyPoints: string[];
    sentiment: 'bullish' | 'bearish' | 'neutral';
  }> {
    try {
      const cacheKey = `market:summary:${new Date().toISOString().split('T')[0]}`;
      
      return cacheService.getOrFetch(
        cacheKey,
        async () => {
          // Gather market data
          const [indices, sectors, news] = await Promise.all([
            fmpService.getMarketIndices(),
            fmpService.getSectorPerformance(),
            fmpService.getFinancialNews(5)
          ]);
          
          // Generate prompt for Mistral
          const prompt = `Generate a concise market summary based on the following data:
          
Market Indices:
${indices.map(index => `${index.name}: ${index.price.toFixed(2)} (${index.change >= 0 ? '+' : ''}${index.change.toFixed(2)}, ${index.changePercent.toFixed(2)}%)`).join('\n')}

Sector Performance:
${sectors.map(sector => `${sector.sector}: ${sector.trend === 'up' ? '+' : '-'}${sector.percentage}%`).join('\n')}

Recent News Headlines:
${news.map(item => `- ${item.title}`).join('\n')}

Provide:
1. A 2-3 sentence market summary
2. 3-4 key points investors should know
3. Overall market sentiment (bullish, bearish, or neutral)

Format your response as JSON:
{
  "summary": "concise summary",
  "keyPoints": ["point1", "point2", "point3"],
  "sentiment": "bullish|bearish|neutral"
}`;
          
          // Call Mistral API
          const response = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
              model: 'mistral-large-latest',
              messages: [
                {
                  role: 'system',
                  content: 'You are a financial analyst providing concise market summaries.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.2,
              max_tokens: 512
            })
          });
          
          if (!response.ok) {
            throw new Error(`Mistral API error: ${response.status}`);
          }
          
          const data = await response.json();
          const content = data.choices[0].message.content;
          
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No valid JSON found in Mistral response');
          }
          
          return JSON.parse(jsonMatch[0]);
        },
        { ttl: 4 * 60 * 60 * 1000 } // 4 hour cache
      );
    } catch (error) {
      console.error('Error generating market summary:', error);
      return {
        summary: 'Unable to generate market summary at this time.',
        keyPoints: ['Market data unavailable'],
        sentiment: 'neutral'
      };
    }
  }
}

// Create and export a singleton instance
const marketInsightService = new MarketInsightService();
export default marketInsightService;
