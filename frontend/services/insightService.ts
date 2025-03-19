/**
 * Insight Service - Generates financial insights and visualization recommendations using LLMs
 * 
 * This service connects FMP financial data with Mistral API to generate
 * data-driven insights and visualization recommendations.
 */

import fmpService from './fmpService';
import errorMonitoringService from './errorMonitoringService';

// Get API key from environment variables
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

/**
 * Interface for insight request parameters
 */
interface InsightRequest {
  dataType: 'market-index' | 'sector-performance' | 'stock';
  symbol?: string;
  timeframe?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
}

/**
 * Interface for insight response
 */
export interface InsightResponse {
  summary: string;
  trends: string[];
  visualizationRecommendation: {
    type: 'line' | 'bar' | 'candlestick' | 'area' | 'pie';
    title: string;
    description: string;
    dataPoints?: Array<{
      label: string;
      value: number;
      color?: string;
    }>;
    config?: Record<string, unknown>;
  };
  actionableInsights: string[];
}

/**
 * Generate a prompt for the LLM based on financial data
 */
function generatePrompt(data: any, request: InsightRequest): string {
  let prompt = `You are a financial analyst AI assistant. Analyze the following ${request.dataType} data and provide insights:\n\n`;
  
  prompt += `Data: ${JSON.stringify(data, null, 2)}\n\n`;
  
  prompt += `Please provide the following in JSON format:
1. A concise summary of the data (1-2 sentences)
2. Key trends identified (3-5 bullet points)
3. A visualization recommendation with type, title, description, and configuration
4. Actionable insights for investors (2-3 points)

The visualization should be one of: line, bar, candlestick, area, or pie chart.
Response should be valid JSON with the following structure:
{
  "summary": "string",
  "trends": ["string"],
  "visualizationRecommendation": {
    "type": "string",
    "title": "string",
    "description": "string",
    "config": {}
  },
  "actionableInsights": ["string"]
}`;

  return prompt;
}

/**
 * Parse the LLM response to extract the JSON
 */
function parseResponse(response: string): InsightResponse {
  try {
    // Extract JSON from response (in case the LLM adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const jsonStr = jsonMatch[0];
    return JSON.parse(jsonStr) as InsightResponse;
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    throw new Error('Failed to parse insight response');
  }
}

/**
 * Call Mistral API with the generated prompt
 */
async function callMistralAPI(prompt: string): Promise<string> {
  try {
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
            content: 'You are a financial analysis assistant that provides insights and visualization recommendations based on financial data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Mistral API:', error);
    errorMonitoringService.recordHandledException(
      error instanceof Error ? error : new Error(String(error)),
      'insightService.callMistralAPI',
      { severity: 'high' }
    );
    throw new Error('Failed to generate insights');
  }
}

/**
 * Insight Service class with methods to generate insights from financial data
 */
class InsightService {
  /**
   * Generate insights for market index data
   */
  async getMarketIndexInsights(symbol: string, timeframe: 'daily' | 'weekly' | 'monthly' = 'daily', limit: number = 30): Promise<InsightResponse> {
    try {
      // Get current market index data
      const indices = await fmpService.getMarketIndices();
      const indexData = indices.find(index => index.symbol === symbol);
      
      if (!indexData) {
        throw new Error(`Market index ${symbol} not found`);
      }
      
      // Get historical data for the index
      const historicalData = await fmpService.getHistoricalData(symbol, timeframe, limit);
      
      // Combine current and historical data
      const data = {
        current: indexData,
        historical: historicalData
      };
      
      // Generate prompt and call LLM
      const prompt = generatePrompt(data, { 
        dataType: 'market-index', 
        symbol, 
        timeframe, 
        limit 
      });
      
      const llmResponse = await callMistralAPI(prompt);
      return parseResponse(llmResponse);
    } catch (error) {
      console.error('Error generating market index insights:', error);
      throw new Error('Failed to generate market index insights');
    }
  }
  
  /**
   * Generate insights for sector performance data
   */
  async getSectorPerformanceInsights(): Promise<InsightResponse> {
    try {
      // Get sector performance data
      const sectorData = await fmpService.getSectorPerformance();
      
      // Generate prompt and call LLM
      const prompt = generatePrompt(sectorData, { dataType: 'sector-performance' });
      const llmResponse = await callMistralAPI(prompt);
      
      return parseResponse(llmResponse);
    } catch (error) {
      console.error('Error generating sector performance insights:', error);
      throw new Error('Failed to generate sector performance insights');
    }
  }
  
  /**
   * Generate insights for individual stock data
   */
  async getStockInsights(symbol: string, timeframe: 'daily' | 'weekly' | 'monthly' = 'daily', limit: number = 30): Promise<InsightResponse> {
    try {
      // Get current stock data
      const stockData = await fmpService.getStockQuote(symbol);
      
      // Get historical data for the stock
      const historicalData = await fmpService.getHistoricalData(symbol, timeframe, limit);
      
      // Combine current and historical data
      const data = {
        current: stockData,
        historical: historicalData
      };
      
      // Generate prompt and call LLM
      const prompt = generatePrompt(data, { 
        dataType: 'stock', 
        symbol, 
        timeframe, 
        limit 
      });
      
      const llmResponse = await callMistralAPI(prompt);
      return parseResponse(llmResponse);
    } catch (error) {
      console.error('Error generating stock insights:', error);
      throw new Error('Failed to generate stock insights');
    }
  }
}

// Create and export a singleton instance
const insightService = new InsightService();
export default insightService;
