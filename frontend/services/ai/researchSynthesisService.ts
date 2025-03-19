/**
 * Research Synthesis Service
 * 
 * This service orchestrates AI-powered research for watchlists by coordinating
 * data from multiple sources (FMP, Perplexity) and processing through Mistral.
 */

import fmpService from '../fmpService';
import perplexityService from '../perplexityService';
import mistralService from './mistralService';
import cacheService from '../cacheService';
import { AIResult } from './mistralService';
import errorMonitoringService from '../errorMonitoringService';

// Types for research requests and responses
export interface ResearchRequest {
  symbol: string;
  includeFinancials?: boolean;
  includeNews?: boolean;
  includeSentiment?: boolean;
  includePricePrediction?: boolean;
}

export interface SymbolResearch {
  symbol: string;
  lastUpdated: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  pricePrediction?: {
    target: number;
    timeframe: string;
    reasoning: string;
  };
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

/**
 * Research Synthesis Service
 * Coordinates data collection and AI processing for stock research
 */
class ResearchSynthesisService {
  /**
   * Generate comprehensive research for a stock symbol
   */
  async getSymbolResearch(request: ResearchRequest): Promise<SymbolResearch | null> {
    const { symbol } = request;
    
    try {
      // Check cache first (30-minute TTL for research)
      const cacheKey = `research:${symbol}:${JSON.stringify(request)}`;
      const cachedResearch = cacheService.get<SymbolResearch>(cacheKey);
      
      if (cachedResearch) {
        return cachedResearch;
      }
      
      // Collect data from multiple sources in parallel
      const [
        companyProfile,
        stockQuote,
        financialNews,
        perplexityResearch
      ] = await Promise.all([
        fmpService.getCompanyProfile(symbol),
        fmpService.getStockQuote(symbol),
        request.includeNews ? fmpService.getCompanyNews(symbol, 5) : null,
        this.getMarketContextFromPerplexity(symbol)
      ]);
      
      // If we couldn't get basic company info, return null
      if (!companyProfile || !stockQuote) {
        console.error(`Could not retrieve basic data for ${symbol}`);
        return null;
      }
      
      // Prepare context for Mistral
      const context = this.prepareResearchContext(
        symbol,
        companyProfile,
        stockQuote,
        financialNews,
        perplexityResearch
      );
      
      // Process with Mistral
      const researchResult = await mistralService.processQuery(context, {
        temperature: 0.1,
        maxTokens: 1500,
        extractSources: true
      });
      
      if (researchResult.error) {
        throw new Error(`Mistral processing error: ${researchResult.error}`);
      }
      
      // Parse AI response into structured format
      const research = this.parseResearchResponse(symbol, researchResult);
      
      // Cache result for 30 minutes
      cacheService.set(cacheKey, research, { ttl: 30 * 60 * 1000 });
      
      return research;
    } catch (error) {
      errorMonitoringService.logError('Research synthesis error', {
        symbol,
        request,
        error
      });
      console.error('Error generating research:', error);
      return null;
    }
  }
  
  /**
   * Get market context from Perplexity
   */
  private async getMarketContextFromPerplexity(symbol: string): Promise<string> {
    try {
      const result = await perplexityService.getCompanyAnalysis(symbol);
      return result.content;
    } catch (error) {
      console.error(`Error getting market context for ${symbol}:`, error);
      return '';
    }
  }
  
  /**
   * Prepare context for Mistral AI processing
   */
  private prepareResearchContext(
    symbol: string,
    companyProfile: any,
    stockQuote: any,
    news: any[] | null,
    perplexityResearch: string
  ): string {
    // Create a detailed prompt with all available data
    let context = `
Please analyze the following information about ${symbol} (${companyProfile.companyName}) and provide a comprehensive research synthesis.

## Company Profile
- Industry: ${companyProfile.industry || 'N/A'}
- Sector: ${companyProfile.sector || 'N/A'}
- Description: ${companyProfile.description || 'N/A'}
- Market Cap: $${(companyProfile.mktCap / 1000000000).toFixed(2)}B
- Beta: ${companyProfile.beta || 'N/A'}

## Current Price Data
- Price: $${stockQuote.price}
- Change: ${stockQuote.change} (${stockQuote.changesPercentage}%)
- 52-Week Range: ${companyProfile.range || 'N/A'}
- PE Ratio: ${stockQuote.pe || 'N/A'}
    `;
    
    // Add news if available
    if (news && news.length > 0) {
      context += `\n## Recent News\n`;
      news.forEach((item, index) => {
        context += `${index + 1}. ${item.title} (${item.publishedDate})\n`;
        context += `   Summary: ${item.text.substring(0, 200)}...\n\n`;
      });
    }
    
    // Add perplexity research if available
    if (perplexityResearch) {
      context += `\n## Market Analysis\n${perplexityResearch}\n`;
    }
    
    // Add instructions for the AI
    context += `
Based on this information, please provide:
1. A concise summary (2-3 sentences)
2. 5-7 key points that investors should know
3. Overall sentiment (bullish, bearish, or neutral) with confidence level
4. Price outlook with reasoning
5. Sources used for this analysis

Format your response in a structured way that can be easily parsed.
`;
    
    return context;
  }
  
  /**
   * Parse AI response into structured format
   */
  private parseResearchResponse(symbol: string, result: AIResult): SymbolResearch {
    // Extract sections from the AI response
    const lines = result.content.split('\n');
    
    // Default structure
    const research: SymbolResearch = {
      symbol,
      lastUpdated: new Date().toISOString(),
      summary: '',
      keyPoints: [],
      sentiment: 'neutral',
      confidence: 0.5,
      sources: result.sources || []
    };
    
    // Parse sections (simplified parsing logic - can be enhanced)
    let currentSection = '';
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('## Summary') || trimmedLine.startsWith('Summary:')) {
        currentSection = 'summary';
        continue;
      } else if (trimmedLine.startsWith('## Key Points') || trimmedLine.startsWith('Key Points:')) {
        currentSection = 'keyPoints';
        continue;
      } else if (trimmedLine.startsWith('## Sentiment') || trimmedLine.startsWith('Sentiment:')) {
        currentSection = 'sentiment';
        continue;
      } else if (trimmedLine.startsWith('## Price Outlook') || trimmedLine.startsWith('Price Outlook:')) {
        currentSection = 'priceOutlook';
        continue;
      } else if (trimmedLine.startsWith('## Sources') || trimmedLine.startsWith('Sources:')) {
        currentSection = 'sources';
        continue;
      }
      
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        switch (currentSection) {
          case 'summary':
            research.summary += (research.summary ? ' ' : '') + trimmedLine;
            break;
          case 'keyPoints':
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || 
                (trimmedLine.match(/^\d+\./) && trimmedLine.length > 3)) {
              research.keyPoints.push(trimmedLine.replace(/^[- *\d.]+\s*/, ''));
            }
            break;
          case 'sentiment':
            if (trimmedLine.toLowerCase().includes('bullish')) {
              research.sentiment = 'bullish';
            } else if (trimmedLine.toLowerCase().includes('bearish')) {
              research.sentiment = 'bearish';
            }
            
            // Extract confidence percentage if present
            const confidenceMatch = trimmedLine.match(/(\d+)%/);
            if (confidenceMatch) {
              research.confidence = parseInt(confidenceMatch[1]) / 100;
            }
            break;
          case 'priceOutlook':
            if (!research.pricePrediction) {
              research.pricePrediction = {
                target: 0,
                timeframe: '',
                reasoning: ''
              };
            }
            
            // Extract price target if present
            const priceMatch = trimmedLine.match(/\$(\d+(\.\d+)?)/);
            if (priceMatch) {
              research.pricePrediction.target = parseFloat(priceMatch[1]);
            }
            
            // Extract timeframe if present
            const timeframeMatch = trimmedLine.match(/(short[- ]term|mid[- ]term|long[- ]term|\d+\s+(day|week|month|year)s?)/i);
            if (timeframeMatch) {
              research.pricePrediction.timeframe = timeframeMatch[0];
            }
            
            research.pricePrediction.reasoning += (research.pricePrediction.reasoning ? ' ' : '') + trimmedLine;
            break;
        }
      }
    }
    
    return research;
  }
  
  /**
   * Generate watchlist recommendations based on a stock
   */
  async getWatchlistRecommendations(symbol: string, userId: string): Promise<Array<{ name: string, reason: string }>> {
    try {
      // Get stock details
      const companyProfile = await fmpService.getCompanyProfile(symbol);
      
      if (!companyProfile) {
        return [];
      }
      
      // Prepare context for AI
      const context = `
Based on the following stock:
- Symbol: ${symbol}
- Company: ${companyProfile.companyName}
- Industry: ${companyProfile.industry || 'N/A'}
- Sector: ${companyProfile.sector || 'N/A'}

Please suggest 3-5 watchlist categories this stock could belong to. For each suggestion, provide:
1. A concise watchlist name (2-4 words)
2. A brief reason why this stock fits in that watchlist category

Format as a numbered list with name and reason clearly labeled.
      `;
      
      // Process with Mistral
      const result = await mistralService.processQuery(context, {
        temperature: 0.7, // Higher temperature for creative recommendations
        maxTokens: 500
      });
      
      if (result.error) {
        throw new Error(`AI processing error: ${result.error}`);
      }
      
      // Parse recommendations
      return this.parseWatchlistRecommendations(result.content);
    } catch (error) {
      console.error('Error generating watchlist recommendations:', error);
      return [];
    }
  }
  
  /**
   * Parse watchlist recommendations from AI response
   */
  private parseWatchlistRecommendations(content: string): Array<{ name: string, reason: string }> {
    const recommendations: Array<{ name: string, reason: string }> = [];
    const lines = content.split('\n');
    
    let currentName = '';
    let currentReason = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for numbered list items
      const listItemMatch = trimmedLine.match(/^\d+\.\s+(.*)/);
      if (listItemMatch) {
        // If we have a previous item, save it
        if (currentName && currentReason) {
          recommendations.push({
            name: currentName,
            reason: currentReason
          });
        }
        
        // Reset for new item
        currentName = '';
        currentReason = '';
        continue;
      }
      
      // Extract name and reason
      const nameMatch = trimmedLine.match(/name:?\s+(.*)/i);
      if (nameMatch) {
        currentName = nameMatch[1];
        continue;
      }
      
      const reasonMatch = trimmedLine.match(/reason:?\s+(.*)/i);
      if (reasonMatch) {
        currentReason = reasonMatch[1];
        continue;
      }
      
      // If line contains a colon, it might be a name/reason pair
      const colonSplit = trimmedLine.split(':');
      if (colonSplit.length === 2) {
        const key = colonSplit[0].toLowerCase().trim();
        const value = colonSplit[1].trim();
        
        if (key.includes('name') || key.includes('watchlist')) {
          currentName = value;
        } else if (key.includes('reason') || key.includes('why')) {
          currentReason = value;
        }
      }
    }
    
    // Add the last item if we have one
    if (currentName && currentReason) {
      recommendations.push({
        name: currentName,
        reason: currentReason
      });
    }
    
    return recommendations;
  }
}

// Create singleton instance
const researchSynthesisService = new ResearchSynthesisService();
export default researchSynthesisService;
