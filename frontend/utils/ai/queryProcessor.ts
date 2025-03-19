/**
 * Query Processor Utility
 * 
 * This utility provides functions for decomposing complex research queries,
 * processing them through AI services, and aggregating the results.
 */

import { AIResult } from '@/services/ai/mistralService';
import mistralService from '@/services/ai/mistralService';
import perplexityService from '@/services/perplexityService';
import cacheService from '@/services/cacheService';

// Constants
const MAX_SUBQUERIES = parseInt(import.meta.env.VITE_MAX_SUBQUERIES || '5', 10);
const QUERY_TIMEOUT = parseInt(import.meta.env.VITE_RESEARCH_QUERY_TIMEOUT || '30000', 10);

/**
 * Interface for query processing options
 */
export interface QueryProcessingOptions {
  decompose?: boolean;
  maxSubqueries?: number;
  preferredService?: 'perplexity' | 'mistral' | 'both';
  extractSources?: boolean;
  temperature?: number;
  timeout?: number;
}

/**
 * Interface for query processing result
 */
export interface QueryProcessingResult {
  mainResult: AIResult;
  subResults?: AIResult[];
  decomposedQueries?: string[];
  aggregatedContent?: string;
  metadata: {
    processingTimeMs: number;
    servicesUsed: string[];
    decomposed: boolean;
    subqueriesCount?: number;
  };
}

/**
 * Decompose a complex query into simpler subqueries
 */
export async function decomposeQuery(query: string, maxSubqueries: number = MAX_SUBQUERIES): Promise<string[]> {
  try {
    // Generate a cache key
    const cacheKey = `query:decompose:${query}:${maxSubqueries}`;
    
    // Check cache first
    const cachedResult = cacheService.get<string[]>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Use Mistral to decompose the query
    const prompt = `
    I need to break down this complex research question into ${maxSubqueries} or fewer specific sub-questions that can be researched independently.
    
    Original question: "${query}"
    
    Please provide ONLY a JSON array of strings, each representing a focused sub-question. Do not include any explanation or other text.
    The sub-questions should:
    1. Be self-contained and specific
    2. Cover different aspects of the original question
    3. Be answerable independently
    4. Collectively cover the full scope of the original question
    
    Format your response as a valid JSON array like this: ["Sub-question 1", "Sub-question 2", ...]
    `;
    
    const response = await mistralService.processQuery(prompt, {
      temperature: 0.2,
      extractSources: false
    });
    
    // Extract the JSON array from the response
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse decomposed queries');
    }
    
    const subQueries = JSON.parse(jsonMatch[0]) as string[];
    
    // Limit the number of subqueries
    const limitedSubQueries = subQueries.slice(0, maxSubqueries);
    
    // Cache the result
    cacheService.set(cacheKey, limitedSubQueries, { ttl: 24 * 60 * 60 * 1000 }); // 24 hour cache
    
    return limitedSubQueries;
  } catch (error) {
    console.error('Error decomposing query:', error);
    // Return a simple fallback decomposition
    return [query];
  }
}

/**
 * Aggregate results from multiple subqueries into a coherent response
 */
export async function aggregateResults(
  originalQuery: string,
  subResults: AIResult[],
  subQueries: string[]
): Promise<string> {
  try {
    // Prepare the input for aggregation
    const resultsInput = subResults.map((result, index) => {
      return `Sub-question ${index + 1}: ${subQueries[index]}\nAnswer: ${result.content}\n`;
    }).join('\n');
    
    // Use Mistral to aggregate the results
    const prompt = `
    I need to synthesize the following research findings into a comprehensive answer to the original question.
    
    Original question: "${originalQuery}"
    
    Research findings:
    ${resultsInput}
    
    Please provide a well-structured, comprehensive answer that:
    1. Directly addresses the original question
    2. Integrates all relevant information from the sub-questions
    3. Resolves any contradictions between different sources
    4. Highlights key insights and conclusions
    5. Is organized with clear sections and bullet points where appropriate
    
    Your response should be thorough yet concise, focusing on the most important information.
    `;
    
    const response = await mistralService.processQuery(prompt, {
      temperature: 0.3,
      extractSources: false,
      maxTokens: 1500
    });
    
    return response.content;
  } catch (error) {
    console.error('Error aggregating results:', error);
    // Return a simple concatenation of results as fallback
    return subResults.map((result, index) => {
      return `### ${subQueries[index]}\n\n${result.content}\n\n`;
    }).join('');
  }
}

/**
 * Extract and merge sources from multiple results
 */
export function mergeSources(results: AIResult[]): AIResult['sources'] {
  const allSources: Record<string, AIResult['sources'][0]> = {};
  
  // Collect all sources
  results.forEach(result => {
    if (result.sources) {
      result.sources.forEach(source => {
        // Use URL as unique identifier, or title if URL is not available
        const key = source.url || source.title;
        if (key && !allSources[key]) {
          allSources[key] = source;
        }
      });
    }
  });
  
  return Object.values(allSources);
}

/**
 * Process a research query with optional decomposition and aggregation
 */
export async function processResearchQuery(
  query: string,
  options: QueryProcessingOptions = {}
): Promise<QueryProcessingResult> {
  const startTime = Date.now();
  
  const {
    decompose = true,
    maxSubqueries = MAX_SUBQUERIES,
    preferredService = 'both',
    extractSources = true,
    temperature = 0.2,
    timeout = QUERY_TIMEOUT
  } = options;
  
  // Set up a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query processing timed out')), timeout);
  });
  
  try {
    // Process with timeout
    const result = await Promise.race([
      processQueryWithStrategy(query, {
        decompose,
        maxSubqueries,
        preferredService,
        extractSources,
        temperature
      }),
      timeoutPromise
    ]);
    
    const endTime = Date.now();
    result.metadata.processingTimeMs = endTime - startTime;
    
    return result;
  } catch (error) {
    console.error('Error processing research query:', error);
    
    // Return a basic error result
    return {
      mainResult: {
        content: 'I apologize, but I encountered an error while processing your research query. Please try again later.',
        error: error instanceof Error ? error.message : String(error)
      },
      metadata: {
        processingTimeMs: Date.now() - startTime,
        servicesUsed: [],
        decomposed: false
      }
    };
  }
}

/**
 * Internal function to process query with the selected strategy
 */
async function processQueryWithStrategy(
  query: string,
  options: QueryProcessingOptions
): Promise<QueryProcessingResult> {
  const {
    decompose,
    maxSubqueries,
    preferredService,
    extractSources,
    temperature
  } = options;
  
  const servicesUsed: string[] = [];
  let decomposedQueries: string[] | undefined;
  let subResults: AIResult[] | undefined;
  
  // If decomposition is enabled, break down the query
  if (decompose) {
    decomposedQueries = await decomposeQuery(query, maxSubqueries);
    
    // If we have multiple subqueries, process them
    if (decomposedQueries.length > 1) {
      // Process each subquery
      if (preferredService === 'mistral') {
        servicesUsed.push('mistral');
        subResults = await mistralService.processMultipleQueries(decomposedQueries, {
          extractSources,
          temperature
        });
      } else if (preferredService === 'perplexity') {
        // Adapt to use Perplexity for multiple queries if needed
        servicesUsed.push('perplexity');
        // This is a placeholder - we would need to implement this in perplexityService
        subResults = await Promise.all(decomposedQueries.map(async (subQuery) => {
          const result = await perplexityService.getMarketTrendAnalysis('general', 'mixed', 0);
          return { content: result };
        }));
      } else {
        // Use both services alternately for different subqueries
        servicesUsed.push('mistral', 'perplexity');
        subResults = await Promise.all(decomposedQueries.map(async (subQuery, index) => {
          if (index % 2 === 0) {
            return mistralService.processQuery(subQuery, { extractSources, temperature });
          } else {
            const result = await perplexityService.getMarketTrendAnalysis('general', 'mixed', 0);
            return { content: result };
          }
        }));
      }
      
      // Aggregate the results
      const aggregatedContent = await aggregateResults(query, subResults, decomposedQueries);
      
      // Merge sources
      const mergedSources = mergeSources(subResults);
      
      return {
        mainResult: {
          content: aggregatedContent,
          sources: mergedSources
        },
        subResults,
        decomposedQueries,
        aggregatedContent,
        metadata: {
          servicesUsed,
          decomposed: true,
          subqueriesCount: decomposedQueries.length,
          processingTimeMs: 0 // Will be set later
        }
      };
    }
  }
  
  // If we're not decomposing or only have one subquery, process directly
  let mainResult: AIResult;
  
  if (preferredService === 'mistral') {
    servicesUsed.push('mistral');
    mainResult = await mistralService.processQuery(query, {
      extractSources,
      temperature
    });
  } else if (preferredService === 'perplexity') {
    servicesUsed.push('perplexity');
    const content = await perplexityService.getMarketTrendAnalysis('general', 'mixed', 0);
    mainResult = { content };
  } else {
    // Use both services and combine results
    servicesUsed.push('mistral', 'perplexity');
    const mistralResult = await mistralService.processQuery(query, {
      extractSources,
      temperature
    });
    
    // For now, just use the Mistral result
    mainResult = mistralResult;
  }
  
  return {
    mainResult,
    metadata: {
      servicesUsed,
      decomposed: false,
      processingTimeMs: 0 // Will be set later
    }
  };
}

// Export a default object with all functions
export default {
  processResearchQuery,
  decomposeQuery,
  aggregateResults,
  mergeSources
};
