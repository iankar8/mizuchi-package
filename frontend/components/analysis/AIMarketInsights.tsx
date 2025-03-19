import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from "lucide-react";
import aiAnalysisService, { MarketAnalysis, StockAnalysis } from '@/services/aiAnalysisService';
import { useAnalytics } from '@/hooks/use-analytics';

interface AIMarketInsightsProps {
  symbol?: string;
  companyName?: string;
}

export function AIMarketInsights({ symbol, companyName }: AIMarketInsightsProps) {
  const [activeTab, setActiveTab] = useState<string>(symbol ? 'stock' : 'market');
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [stockAnalysis, setStockAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Analytics hooks
  const { trackFeature, trackError, timeOperation } = useAnalytics();

  const fetchMarketAnalysis = async () => {
    trackFeature('ai_analysis', 'request_market_analysis');
    
    try {
      setLoading(true);
      setError(null);
      
      // Use timeOperation to measure performance
      const analysis = await timeOperation(
        'fetch_market_analysis',
        () => aiAnalysisService.getMarketAnalysis()
      );
      
      setMarketAnalysis(analysis);
      
      // Track successful analysis by sentiment
      trackFeature('ai_analysis', 'market_analysis_complete', analysis.sentiment);
    } catch (err) {
      const errorMessage = 'Failed to load market analysis';
      setError(errorMessage);
      trackError(err instanceof Error ? err : errorMessage, {
        component: 'AIMarketInsights',
        action: 'fetchMarketAnalysis'
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockAnalysis = async () => {
    if (!symbol || !companyName) return;
    
    trackFeature('ai_analysis', 'request_stock_analysis', symbol);
    
    try {
      setLoading(true);
      setError(null);
      
      // Use timeOperation to measure performance
      const analysis = await timeOperation(
        'fetch_stock_analysis',
        () => aiAnalysisService.getStockAnalysis(symbol, companyName),
        { symbol, companyName }
      );
      
      setStockAnalysis(analysis);
      
      // Track successful analysis
      trackFeature('ai_analysis', 'stock_analysis_complete', analysis.sentiment);
    } catch (err) {
      const errorMessage = `Failed to load analysis for ${symbol}`;
      setError(errorMessage);
      trackError(err instanceof Error ? err : errorMessage, {
        component: 'AIMarketInsights',
        action: 'fetchStockAnalysis',
        symbol
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'market') {
      fetchMarketAnalysis();
      // Track tab change
      trackFeature('ai_analysis', 'view_tab', 'market');
    } else if (activeTab === 'stock' && symbol && companyName) {
      fetchStockAnalysis();
      // Track tab change
      trackFeature('ai_analysis', 'view_tab', 'stock');
    }
  }, [activeTab, symbol, companyName]);

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1"><TrendingUp size={14} /> Bullish</Badge>;
      case 'bearish':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1"><TrendingDown size={14} /> Bearish</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 flex items-center gap-1"><Minus size={14} /> Neutral</Badge>;
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">AI Market Insights</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => activeTab === 'market' ? fetchMarketAnalysis() : fetchStockAnalysis()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
        <CardDescription>
          AI-powered analysis using Perplexity and Mistral
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="market">Market Overview</TabsTrigger>
            <TabsTrigger value="stock" disabled={!symbol}>Stock Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="market" className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="pt-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full mt-1" />
                  <Skeleton className="h-3 w-2/3 mt-1" />
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mb-2" />
                <p>{error}</p>
                <Button variant="outline" size="sm" onClick={fetchMarketAnalysis} className="mt-2">
                  Try Again
                </Button>
              </div>
            ) : marketAnalysis ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">Market Summary</h3>
                  {getSentimentBadge(marketAnalysis.sentiment)}
                </div>
                
                <p className="text-sm text-muted-foreground">{marketAnalysis.summary}</p>
                
                <div>
                  <h4 className="font-medium mb-2">Key Points</h4>
                  <ul className="text-sm space-y-1">
                    {marketAnalysis.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Risks</h4>
                    <ul className="text-sm space-y-1">
                      {marketAnalysis.risks.map((risk, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Opportunities</h4>
                    <ul className="text-sm space-y-1">
                      {marketAnalysis.opportunities.map((opportunity, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{opportunity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </TabsContent>
          
          <TabsContent value="stock" className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="pt-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full mt-1" />
                  <Skeleton className="h-3 w-2/3 mt-1" />
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mb-2" />
                <p>{error}</p>
                <Button variant="outline" size="sm" onClick={fetchStockAnalysis} className="mt-2">
                  Try Again
                </Button>
              </div>
            ) : stockAnalysis ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{stockAnalysis.name} ({stockAnalysis.symbol})</h3>
                  {getSentimentBadge(stockAnalysis.sentiment)}
                </div>
                
                <p className="text-sm text-muted-foreground">{stockAnalysis.summary}</p>
                
                <div>
                  <h4 className="font-medium mb-2">Key Points</h4>
                  <ul className="text-sm space-y-1">
                    {stockAnalysis.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-1">Technical Analysis</h4>
                    <p className="text-sm text-muted-foreground">{stockAnalysis.technicalAnalysis}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Fundamental Analysis</h4>
                    <p className="text-sm text-muted-foreground">{stockAnalysis.fundamentalAnalysis}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">News Impact</h4>
                    <p className="text-sm text-muted-foreground">{stockAnalysis.newsImpact}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-0">
        Powered by AI analysis. Updated {new Date().toLocaleDateString()}
      </CardFooter>
    </Card>
  );
}

export default AIMarketInsights;
