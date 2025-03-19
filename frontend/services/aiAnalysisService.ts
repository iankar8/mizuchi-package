import { supabase } from "../integrations/supabase/client";

// Types for AI analysis
export interface MarketAnalysis {
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  keyPoints: string[];
  risks: string[];
  opportunities: string[];
}

export interface StockAnalysis {
  symbol: string;
  name: string;
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  keyPoints: string[];
  technicalAnalysis: string;
  fundamentalAnalysis: string;
  newsImpact: string;
}

export interface MarketInsight {
  title: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  sentiment: 'bullish' | 'neutral' | 'bearish';
  tickers?: string[];
  category: 'economy' | 'sector' | 'stock' | 'trend';
  time_horizon: 'short_term' | 'medium_term' | 'long_term';
}

// Load API keys from environment variables
const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY || ""; 
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY || "";

// Check if API keys are available
if (import.meta.env.MODE === 'production' && (!PERPLEXITY_API_KEY || !MISTRAL_API_KEY)) {
  console.warn(
    "WARNING: AI analysis services require API keys. Set VITE_PERPLEXITY_API_KEY and VITE_MISTRAL_API_KEY env variables in production."
  );
}

// Service for AI-powered market and stock analysis
const aiAnalysisService = {
  // Get market analysis using Perplexity API
  getMarketAnalysis: async (): Promise<MarketAnalysis> => {
    try {
      // In production, this would be a call to a Supabase Edge Function
      // to protect the API key
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "sonar-medium-online",
          messages: [
            {
              role: "system",
              content: "You are a financial analyst assistant. Provide concise market analysis based on the latest data."
            },
            {
              role: "user",
              content: "Provide a brief analysis of the current market conditions. Include a summary, sentiment (bullish, bearish, or neutral), key points, risks, and opportunities. Format as JSON."
            }
          ],
          options: {
            temperature: 0.2,
            max_tokens: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the response content as JSON
      // The AI will return a JSON string that we need to parse
      try {
        const analysisText = data.choices[0].message.content;
        const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                         analysisText.match(/{[\s\S]*}/);
        
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : analysisText;
        const analysis = JSON.parse(jsonStr);
        
        return {
          summary: analysis.summary || "Market analysis unavailable",
          sentiment: analysis.sentiment || "neutral",
          keyPoints: analysis.keyPoints || [],
          risks: analysis.risks || [],
          opportunities: analysis.opportunities || []
        };
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        
        // Fallback to a default response if parsing fails
        return {
          summary: "Unable to retrieve market analysis at this time.",
          sentiment: "neutral",
          keyPoints: ["Data currently unavailable"],
          risks: [],
          opportunities: []
        };
      }
    } catch (error) {
      console.error("Error fetching market analysis:", error);
      
      // Return a default response in case of error
      return {
        summary: "Unable to retrieve market analysis at this time.",
        sentiment: "neutral",
        keyPoints: ["Service temporarily unavailable"],
        risks: [],
        opportunities: []
      };
    }
  },

  // Get stock analysis using Mistral API
  getStockAnalysis: async (symbol: string, companyName: string): Promise<StockAnalysis> => {
    try {
      // In production, this would be a call to a Supabase Edge Function
      // to protect the API key
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: [
            {
              role: "system",
              content: "You are a financial analyst assistant. Provide concise stock analysis based on the latest data."
            },
            {
              role: "user",
              content: `Provide a brief analysis of ${companyName} (${symbol}). Include a summary, sentiment (bullish, bearish, or neutral), key points, technical analysis, fundamental analysis, and news impact. Format as JSON.`
            }
          ],
          temperature: 0.2,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the response content as JSON
      try {
        const analysisText = data.choices[0].message.content;
        const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                         analysisText.match(/{[\s\S]*}/);
        
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : analysisText;
        const analysis = JSON.parse(jsonStr);
        
        return {
          symbol,
          name: companyName,
          summary: analysis.summary || `Analysis for ${symbol} unavailable`,
          sentiment: analysis.sentiment || "neutral",
          keyPoints: analysis.keyPoints || [],
          technicalAnalysis: analysis.technicalAnalysis || "Technical analysis unavailable",
          fundamentalAnalysis: analysis.fundamentalAnalysis || "Fundamental analysis unavailable",
          newsImpact: analysis.newsImpact || "News impact analysis unavailable"
        };
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        
        // Fallback to a default response if parsing fails
        return {
          symbol,
          name: companyName,
          summary: `Unable to retrieve analysis for ${symbol} at this time.`,
          sentiment: "neutral",
          keyPoints: ["Data currently unavailable"],
          technicalAnalysis: "Technical analysis unavailable",
          fundamentalAnalysis: "Fundamental analysis unavailable",
          newsImpact: "News impact analysis unavailable"
        };
      }
    } catch (error) {
      console.error("Error fetching stock analysis:", error);
      
      // Return a default response in case of error
      return {
        symbol,
        name: companyName,
        summary: `Unable to retrieve analysis for ${symbol} at this time.`,
        sentiment: "neutral",
        keyPoints: ["Service temporarily unavailable"],
        technicalAnalysis: "Technical analysis unavailable",
        fundamentalAnalysis: "Fundamental analysis unavailable",
        newsImpact: "News impact analysis unavailable"
      };
    }
  },

  // Get AI-generated investment ideas
  getInvestmentIdeas: async (preferences: string[]): Promise<any[]> => {
    try {
      const cacheService = (await import('./cacheService')).default;
      const cacheKey = `investment_ideas:${preferences.sort().join(',')}`;
      
      // Cache for 6 hours since investment ideas don't change that often
      const cacheTTL = 6 * 60 * 60 * 1000;
      
      return await cacheService.getOrFetch<any[]>(
        cacheKey,
        async () => {
          // Check if API key is available
          if (!PERPLEXITY_API_KEY) {
            console.warn("Missing Perplexity API key for investment ideas");
            return [];
          }
          
          const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${PERPLEXITY_API_KEY}`
            },
            body: JSON.stringify({
              model: "sonar-medium-online",
              messages: [
                {
                  role: "system",
                  content: "You are a financial advisor assistant. Provide investment ideas based on user preferences."
                },
                {
                  role: "user",
                  content: `Suggest 3 investment ideas based on these preferences: ${preferences.join(", ")}. For each idea, include the ticker symbol, company name, sector, a brief rationale, and potential risks. Format as JSON array.`
                }
              ],
              options: {
                temperature: 0.4,
                max_tokens: 1000
              }
            })
          });

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }

          const data = await response.json();
          
          // Parse the response content as JSON
          try {
            const ideasText = data.choices[0].message.content;
            const jsonMatch = ideasText.match(/```json\n([\s\S]*?)\n```/) || 
                             ideasText.match(/\[([\s\S]*?)\]/);
            
            const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : ideasText;
            const ideas = JSON.parse(jsonStr);
            
            return Array.isArray(ideas) ? ideas : [];
          } catch (parseError) {
            console.error("Error parsing AI response:", parseError);
            return [];
          }
        },
        { ttl: cacheTTL, storage: 'local' }
      );
    } catch (error) {
      console.error("Error fetching investment ideas:", error);
      return [];
    }
  },
  
  // Get AI-generated market insights with category filtering
  getMarketInsights: async (): Promise<MarketInsight[]> => {
    try {
      const cacheService = (await import('./cacheService')).default;
      const cacheKey = 'market_insights';
      
      // Cache market insights for 3 hours
      const cacheTTL = 3 * 60 * 60 * 1000;
      
      return await cacheService.getOrFetch<MarketInsight[]>(
        cacheKey,
        async () => {
          // Check if API key is available
          if (!PERPLEXITY_API_KEY) {
            console.warn("Missing Perplexity API key for market insights");
            return mockMarketInsights(); // Return mock data for demo
          }
          
          const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${PERPLEXITY_API_KEY}`
            },
            body: JSON.stringify({
              model: "sonar-medium-online",
              messages: [
                {
                  role: "system",
                  content: "You are a financial analyst assistant. Provide market insights in a structured format."
                },
                {
                  role: "user",
                  content: `Generate 8 market insights across different categories (economy, sector, stock, trend). For each insight include: 
                  1. A title
                  2. A 1-2 sentence summary
                  3. A confidence level (high, medium, low)
                  4. A sentiment (bullish, neutral, bearish)
                  5. Related ticker symbols where applicable
                  6. The category (economy, sector, stock, trend)
                  7. Time horizon (short_term, medium_term, long_term)
                  
                  Format the results as a JSON array.`
                }
              ],
              options: {
                temperature: 0.5,
                max_tokens: 1500
              }
            })
          });

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }

          const data = await response.json();
          
          // Parse the response content as JSON
          try {
            const insightsText = data.choices[0].message.content;
            const jsonMatch = insightsText.match(/```json\n([\s\S]*?)\n```/) || 
                             insightsText.match(/\[([\s\S]*?)\]/);
            
            const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : insightsText;
            const insights = JSON.parse(jsonStr);
            
            return Array.isArray(insights) ? insights : [];
          } catch (parseError) {
            console.error("Error parsing AI response:", parseError);
            return mockMarketInsights(); // Return mock data on error
          }
        },
        { ttl: cacheTTL, storage: 'local' }
      );
    } catch (error) {
      console.error("Error fetching market insights:", error);
      return mockMarketInsights(); // Return mock data on error
    }
  }
};

// Provide mock market insights for demo purposes
function mockMarketInsights(): MarketInsight[] {
  return [
    {
      title: "Fed's Interest Rate Decision Impact",
      summary: "The Federal Reserve's recent pause in interest rate hikes suggests a potential shift towards a more accommodative monetary policy, which could boost equity markets in the coming months.",
      confidence: "high",
      sentiment: "bullish",
      category: "economy",
      time_horizon: "medium_term"
    },
    {
      title: "Semiconductor Sector Outlook",
      summary: "The semiconductor industry faces supply chain challenges, but increasing demand for AI chips and automotive applications provides significant growth opportunities.",
      confidence: "medium",
      sentiment: "bullish",
      tickers: ["NVDA", "AMD", "INTC", "TSM"],
      category: "sector",
      time_horizon: "medium_term"
    },
    {
      title: "Apple's Services Revenue Growth",
      summary: "Apple's services segment continues to show strong growth, potentially offsetting slowing hardware sales and providing more stable recurring revenue.",
      confidence: "high",
      sentiment: "bullish",
      tickers: ["AAPL"],
      category: "stock",
      time_horizon: "short_term"
    },
    {
      title: "Tesla Production Challenges",
      summary: "Tesla faces increasing competition and production challenges that may impact margins and market share in the EV sector.",
      confidence: "medium",
      sentiment: "bearish",
      tickers: ["TSLA"],
      category: "stock",
      time_horizon: "short_term"
    },
    {
      title: "Rising Consumer Debt Concerns",
      summary: "Increasing consumer debt levels and credit card delinquencies signal potential weakness in consumer spending, which may impact retail and discretionary sectors.",
      confidence: "medium",
      sentiment: "bearish",
      category: "economy",
      time_horizon: "medium_term"
    },
    {
      title: "AI Integration in Financial Services",
      summary: "Financial institutions rapidly adopting AI for risk assessment and customer service may see significant efficiency gains and cost reductions.",
      confidence: "high",
      sentiment: "bullish",
      tickers: ["JPM", "BAC", "GS"],
      category: "trend",
      time_horizon: "long_term"
    },
    {
      title: "Healthcare Innovation Acceleration",
      summary: "Breakthrough treatments and digital health innovations are accelerating, creating investment opportunities in biotech and health tech companies.",
      confidence: "medium",
      sentiment: "bullish",
      tickers: ["ABBV", "MRNA", "TDOC"],
      category: "sector",
      time_horizon: "long_term"
    },
    {
      title: "Supply Chain Regionalization",
      summary: "Companies are increasingly shifting towards regional supply chains to reduce geopolitical risks, benefiting industrial automation and logistics firms.",
      confidence: "medium",
      sentiment: "neutral",
      category: "trend",
      time_horizon: "long_term"
    }
  ];
}

export default aiAnalysisService;
