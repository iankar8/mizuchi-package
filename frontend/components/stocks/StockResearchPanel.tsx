import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpIcon, ArrowDownIcon, Loader2, ExternalLink } from "lucide-react";
import researchSynthesisService, { SymbolResearch } from '@/services/ai/researchSynthesisService';

interface StockResearchPanelProps {
  symbol: string;
}

export function StockResearchPanel({ symbol }: StockResearchPanelProps) {
  const [research, setResearch] = useState<SymbolResearch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResearch = async () => {
      if (!symbol) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await researchSynthesisService.getSymbolResearch({
          symbol,
          includeFinancials: true,
          includeNews: true,
          includeSentiment: true,
          includePricePrediction: true
        });
        
        setResearch(data);
        if (!data) {
          setError('Could not generate research for this stock');
        }
      } catch (err) {
        console.error("Error fetching research:", err);
        setError('Failed to load research data');
      } finally {
        setLoading(false);
      }
    };

    fetchResearch();
  }, [symbol]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-24" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !research) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Research Unavailable</CardTitle>
          <CardDescription>
            {error || `Could not generate research for ${symbol}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Try again later or check another stock.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sentimentColor = 
    research.sentiment === 'bullish' ? 'bg-green-100 text-green-800' : 
    research.sentiment === 'bearish' ? 'bg-red-100 text-red-800' : 
    'bg-blue-100 text-blue-800';
  
  const formattedDate = new Date(research.lastUpdated).toLocaleString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          AI Research: {symbol}
          <Badge className={sentimentColor}>
            {research.sentiment.charAt(0).toUpperCase() + research.sentiment.slice(1)}
            {research.sentiment === 'bullish' ? (
              <ArrowUpIcon className="ml-1 h-3 w-3" />
            ) : research.sentiment === 'bearish' ? (
              <ArrowDownIcon className="ml-1 h-3 w-3" />
            ) : null}
          </Badge>
        </CardTitle>
        <CardDescription>
          Last updated: {formattedDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="keyPoints">Key Points</TabsTrigger>
            {research.pricePrediction && (
              <TabsTrigger value="priceOutlook">Price Outlook</TabsTrigger>
            )}
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p>{research.summary}</p>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Confidence Level</h4>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    research.sentiment === 'bullish' ? 'bg-green-500' : 
                    research.sentiment === 'bearish' ? 'bg-red-500' : 
                    'bg-blue-500'
                  }`}
                  style={{ width: `${research.confidence * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="keyPoints">
            <ul className="space-y-2">
              {research.keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium mr-2 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-sm">{point}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
          
          {research.pricePrediction && (
            <TabsContent value="priceOutlook">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Price Target</h4>
                    <p className="text-2xl font-bold">${research.pricePrediction.target.toFixed(2)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Timeframe</h4>
                    <p className="text-sm">{research.pricePrediction.timeframe}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Reasoning</h4>
                  <p className="text-sm text-muted-foreground">{research.pricePrediction.reasoning}</p>
                </div>
                
                <div className="border-t pt-4 text-xs text-muted-foreground">
                  <strong>Note:</strong> Price targets are estimates based on current market conditions and available information. Always conduct your own research before making investment decisions.
                </div>
              </div>
            </TabsContent>
          )}
          
          <TabsContent value="sources">
            <div className="space-y-3">
              {research.sources.map((source, idx) => (
                <div key={idx} className="border-b pb-3 last:border-0">
                  <h4 className="font-medium text-sm flex items-center">
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center"
                    >
                      {source.title}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">{source.snippet}</p>
                </div>
              ))}
              
              {research.sources.length === 0 && (
                <p className="text-sm text-muted-foreground">No specific sources cited.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
