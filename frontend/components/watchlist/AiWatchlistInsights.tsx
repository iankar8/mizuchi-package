import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lightbulb, RefreshCw, Share2 } from 'lucide-react';
import fmpService from '@/services/fmpService';
import perplexityService from '@/services/perplexityService';
import mistralService from '@/services/ai/mistralService';
import cacheService from '@/services/cacheService';
import researchSynthesisService from '@/services/ai/researchSynthesisService';
import { shareWatchlist } from '@/services/watchlist/watchlistCollaborators';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';

interface StockInsight {
  symbol: string;
  companyName: string;
  insight: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;
}

interface WatchlistInsight {
  insightType: 'trend' | 'opportunity' | 'risk' | 'diversification';
  title: string;
  description: string;
  affectedSymbols?: string[];
}

interface AiWatchlistInsightsProps {
  watchlistId: string;
  stocks: Array<{ symbol: string; notes?: string }>;
  onResearchClick?: (symbol: string) => void;
}

export function AiWatchlistInsights({ 
  watchlistId, 
  stocks,
  onResearchClick
}: AiWatchlistInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [stockInsights, setStockInsights] = useState<StockInsight[]>([]);
  const [watchlistInsights, setWatchlistInsights] = useState<WatchlistInsight[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (stocks.length === 0) return;
    
    const fetchInsights = async () => {
      // Don't overload with too many API calls if there are many stocks
      const symbolsToProcess = stocks.length > 5 
        ? stocks.slice(0, 5) 
        : stocks;
      
      // Check cache first
      const cacheKey = `watchlist-insights:${watchlistId}`;
      const cachedInsights = cacheService.get<{
        stockInsights: StockInsight[],
        watchlistInsights: WatchlistInsight[]
      }>(cacheKey);
      
      if (cachedInsights) {
        setStockInsights(cachedInsights.stockInsights);
        setWatchlistInsights(cachedInsights.watchlistInsights);
        return;
      }
      
      setLoading(true);
      
      try {
        // Get individual stock insights
        const insights = await Promise.all(
          symbolsToProcess.map(async ({ symbol }) => {
            try {
              const research = await researchSynthesisService.getSymbolResearch({
                symbol,
                includeFinancials: false,
                includeNews: true,
                includeSentiment: true
              });
              
              if (!research) return null;
              
              // Get company name from research or fallback to API
              let companyName = '';
              try {
                const profile = await fmpService.getCompanyProfile(symbol);
                companyName = profile?.companyName || symbol;
              } catch (err) {
                companyName = symbol;
              }
              
              return {
                symbol,
                companyName,
                insight: research.summary as string,
                sentiment: research.sentiment as 'bullish' | 'bearish' | 'neutral',
                confidenceScore: research.confidence
              } as StockInsight;
            } catch (err) {
              console.error(`Error getting insights for ${symbol}:`, err);
              return null;
            }
          })
        );
        
        const validInsights = insights.filter(Boolean) as StockInsight[];
        setStockInsights(validInsights);
        
        // Generate watchlist-level insights if we have stocks to analyze
        if (validInsights.length > 0) {
          await generateWatchlistInsights(validInsights);
        }
        
        // Cache the results for 30 minutes
        cacheService.set(cacheKey, {
          stockInsights: validInsights,
          watchlistInsights
        }, { ttl: 30 * 60 * 1000 });
      } catch (err) {
        console.error("Error fetching insights:", err);
        toast({
          title: "Error",
          description: "Failed to generate AI insights.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
  }, [watchlistId, stocks, toast]);
  
  const generateWatchlistInsights = async (stockInsights: StockInsight[]) => {
    // Prepare a prompt for the AI to analyze the entire watchlist
    const symbols = stockInsights.map(s => s.symbol).join(', ');
    const sentimentSummary = stockInsights.map(s => 
      `${s.symbol}: ${s.sentiment} (confidence: ${(s.confidenceScore * 100).toFixed(0)}%)`
    ).join('\n');
    
    const prompt = `
I have a watchlist with the following stocks: ${symbols}
The current sentiment for each stock is:
${sentimentSummary}

Based on this composition, please provide 2-4 insights about this watchlist addressing:
1. Overall trend (bullish, bearish, mixed)
2. Potential opportunities
3. Potential risks
4. Diversification assessment

For each insight, provide:
- Type (trend, opportunity, risk, diversification)
- A concise title (5-8 words)
- A brief description (2-3 sentences)
- Affected symbols (which stocks in the watchlist this insight applies to)

Format your response in a structured way that can be easily parsed.
    `;
    
    try {
      const result = await mistralService.processQuery(prompt, {
        temperature: 0.4,
        maxTokens: 1000
      });
      
      if (result.error) {
        throw new Error(`AI processing error: ${result.error}`);
      }
      
      // Parse the response into watchlist insights
      const insights = parseWatchlistInsights(result.content);
      setWatchlistInsights(insights);
    } catch (err) {
      console.error("Error generating watchlist insights:", err);
    }
  };
  
  const parseWatchlistInsights = (content: string): WatchlistInsight[] => {
    const insights: WatchlistInsight[] = [];
    const lines = content.split('\n');
    
    let currentInsight: Partial<WatchlistInsight> = {};
    let insightStarted = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect the start of a new insight
      if (
        trimmedLine.toLowerCase().includes('insight') || 
        trimmedLine.toLowerCase().startsWith('trend:') ||
        trimmedLine.toLowerCase().startsWith('opportunity:') ||
        trimmedLine.toLowerCase().startsWith('risk:') ||
        trimmedLine.toLowerCase().startsWith('diversification:')
      ) {
        // Save previous insight if it exists
        if (insightStarted && currentInsight.title && currentInsight.description) {
          insights.push(currentInsight as WatchlistInsight);
        }
        
        // Start a new insight
        currentInsight = {};
        insightStarted = true;
        
        // Try to detect insight type
        if (trimmedLine.toLowerCase().includes('trend')) {
          currentInsight.insightType = 'trend';
        } else if (trimmedLine.toLowerCase().includes('opportunity')) {
          currentInsight.insightType = 'opportunity';
        } else if (trimmedLine.toLowerCase().includes('risk')) {
          currentInsight.insightType = 'risk';
        } else if (trimmedLine.toLowerCase().includes('diversification')) {
          currentInsight.insightType = 'diversification';
        }
        
        continue;
      }
      
      if (!insightStarted) continue;
      
      // Extract title
      if (trimmedLine.toLowerCase().startsWith('title:')) {
        currentInsight.title = trimmedLine.substring(6).trim();
        continue;
      }
      
      // Extract description
      if (trimmedLine.toLowerCase().startsWith('description:')) {
        currentInsight.description = trimmedLine.substring(12).trim();
        continue;
      }
      
      // Extract affected symbols
      if (trimmedLine.toLowerCase().startsWith('affected symbols:') || 
          trimmedLine.toLowerCase().startsWith('affected stocks:')) {
        const symbolsText = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
        currentInsight.affectedSymbols = symbolsText
          .split(/[,\s]+/)
          .map(s => s.trim())
          .filter(Boolean);
        continue;
      }
      
      // If line has a colon, it might be a field we can parse
      if (trimmedLine.includes(':')) {
        const [key, value] = trimmedLine.split(':', 2).map(part => part.trim());
        
        if (key.toLowerCase() === 'type') {
          currentInsight.insightType = value.toLowerCase() as any;
        } else if (key.toLowerCase() === 'title') {
          currentInsight.title = value;
        } else if (key.toLowerCase() === 'description') {
          currentInsight.description = value;
        } else if (
          key.toLowerCase() === 'affected symbols' || 
          key.toLowerCase() === 'affected stocks' ||
          key.toLowerCase() === 'symbols'
        ) {
          currentInsight.affectedSymbols = value
            .split(/[,\s]+/)
            .map(s => s.trim())
            .filter(Boolean);
        }
      }
    }
    
    // Add the last insight if it exists
    if (insightStarted && currentInsight.title && currentInsight.description) {
      insights.push(currentInsight as WatchlistInsight);
    }
    
    return insights;
  };
  
  const getInsightIcon = (type?: string) => {
    switch (type) {
      case 'trend':
        return <RefreshCw className="h-5 w-5" />;
      case 'opportunity':
        return <Lightbulb className="h-5 w-5" />;
      case 'risk':
        return <AlertCircle className="h-5 w-5" />;
      case 'diversification':
        return <Share2 className="h-5 w-5" />;
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };
  
  const getInsightColor = (type?: string) => {
    switch (type) {
      case 'trend':
        return 'bg-blue-100 text-blue-800';
      case 'opportunity':
        return 'bg-green-100 text-green-800';
      case 'risk':
        return 'bg-red-100 text-red-800';
      case 'diversification':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'bg-green-100 text-green-800';
      case 'bearish':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (stocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Watchlist Insights</CardTitle>
          <CardDescription>Add stocks to your watchlist to get AI-powered insights</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your AI assistant can provide valuable research and analysis once you add stocks to this watchlist.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Watchlist Insights</CardTitle>
        <CardDescription>
          AI-powered analysis of your watchlist stocks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="mt-2 text-sm text-muted-foreground">Generating insights...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Watchlist-level insights */}
            {watchlistInsights.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Watchlist Analysis</h3>
                
                {watchlistInsights.map((insight, idx) => (
                  <div 
                    key={idx} 
                    className="rounded-lg border p-4 bg-card text-card-foreground shadow-sm"
                  >
                    <div className="flex items-start space-x-2">
                      <div className={`p-2 rounded-md ${getInsightColor(insight.insightType)}`}>
                        {getInsightIcon(insight.insightType)}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                        
                        {insight.affectedSymbols && insight.affectedSymbols.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {insight.affectedSymbols.map(symbol => (
                              <Badge 
                                key={symbol} 
                                variant="outline"
                                className="cursor-pointer hover:bg-secondary"
                                onClick={() => onResearchClick?.(symbol)}
                              >
                                {symbol}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Individual stock insights */}
            {stockInsights.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Stock Insights</h3>
                
                {stockInsights.map((insight, idx) => (
                  <div 
                    key={idx} 
                    className="rounded-lg border p-4 bg-card text-card-foreground shadow-sm"
                    onClick={() => onResearchClick?.(insight.symbol)}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">
                        {insight.symbol} - {insight.companyName}
                      </h4>
                      <Badge className={getSentimentColor(insight.sentiment)}>
                        {insight.sentiment.charAt(0).toUpperCase() + insight.sentiment.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{insight.insight}</p>
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={() => onResearchClick?.(insight.symbol)}>
                        View Research
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {watchlistInsights.length === 0 && stockInsights.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No insights available. Try adding more stocks to your watchlist.
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        AI insights are generated based on available market data and may not reflect all factors. Always conduct your own research before making investment decisions.
      </CardFooter>
    </Card>
  );
}
