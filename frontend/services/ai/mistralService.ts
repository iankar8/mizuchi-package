/**
 * Mistral AI Service
 * 
 * This service provides access to Mistral AI for research query processing.
 */

import cacheService from '../cacheService';
import errorMonitoringService from '../errorMonitoringService';

// Get API key from environment variables
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Warning if no API key is found
if (!MISTRAL_API_KEY) {
  console.warn('No Mistral API key found. Set VITE_MISTRAL_API_KEY in your environment variables.');
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
 * Process a research query through Mistral AI
 */
async function processResearchQuery(query: string, options: {
  temperature?: number;
  maxTokens?: number;
  extractSources?: boolean;
} = {}): Promise<AIResult> {
  try {
    const {
      temperature = 0.1,
      maxTokens = 1000,
      extractSources = true
    } = options;

    // Generate a cache key based on the query parameters
    const cacheKey = `mistral:research:${query}:${temperature}:${maxTokens}:${extractSources}`;
    
    // Check cache first
    const cachedResult = cacheService.get<AIResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Construct the prompt for Mistral
    const systemPrompt = extractSources 
      ? `You are a financial research assistant. Provide detailed, accurate information with sources when available. Format your response to clearly separate facts from analysis. If you cite information, include the source.`
      : `You are a financial research assistant. Provide detailed, accurate information based on your knowledge. Format your response to clearly separate facts from analysis.`;
    
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
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract sources if requested
    let sources = [];
    if (extractSources) {
      sources = extractSourcesFromContent(content);
    }
    
    const result: AIResult = {
      content: content,
      sources: sources.length > 0 ? sources : undefined
    };
    
    // Cache the result
    cacheService.set(cacheKey, result, { ttl: 24 * 60 * 60 * 1000 }); // 24 hour cache
    
    return result;
  } catch (error) {
    console.error('Error processing research query with Mistral:', error);
    errorMonitoringService.recordHandledException(
      error instanceof Error ? error : new Error(String(error)),
      'mistralService.processResearchQuery',
      { severity: 'medium' }
    );
    
    return {
      content: 'I apologize, but I encountered an error while processing your research query. Please try again later.',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Extract sources from content using pattern matching
 */
function extractSourcesFromContent(content: string): Array<{
  title: string;
  url: string;
  snippet: string;
  confidence: number;
}> {
  const sources = [];
  
  // Look for source patterns like [1]: Title (URL)
  const sourceRegex = /\[(\d+)\]:\s*(.*?)(?:\s*\((https?:\/\/[^\s)]+)\))?/g;
  let match;
  
  while ((match = sourceRegex.exec(content)) !== null) {
    const sourceNumber = match[1];
    const title = match[2].trim();
    const url = match[3] || '';
    
    // Find the snippet where this source is referenced
    const referenceRegex = new RegExp(`\\[${sourceNumber}\\]`, 'g');
    const contentBeforeReference = content.substring(0, match.index);
    const lastParagraphIndex = contentBeforeReference.lastIndexOf('\n\n');
    const snippet = contentBeforeReference.substring(lastParagraphIndex !== -1 ? lastParagraphIndex : 0).trim();
    
    sources.push({
      title,
      url,
      snippet,
      confidence: 0.8 // Default confidence score
    });
  }
  
  return sources;
}

/**
 * Mistral Service class
 */
class MistralService {
  /**
   * Process a research query
   */
  async processQuery(query: string, options: {
    temperature?: number;
    maxTokens?: number;
    extractSources?: boolean;
  } = {}): Promise<AIResult> {
    return processResearchQuery(query, options);
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
const mistralService = new MistralService();
export default mistralService;
