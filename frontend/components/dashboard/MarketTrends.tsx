import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MotionContainer from "../ui/MotionContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
// Using system font stack instead of Geist
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import marketInsightService, { EnhancedMarketTrend } from "@/services/marketInsightService";

interface MarketTrendItemProps {
  sector: string;
  percentage: number;
  trend: 'up' | 'down' | 'mixed';
  analysis: string;
}

const MarketTrendItem = ({ 
  sector, 
  percentage, 
  trend,
  analysis
}: MarketTrendItemProps) => {
  const [expanded, setExpanded] = useState(false);
  
  // Get the first two sentences for collapsed view
  const sentences = analysis?.split('.');
  const firstTwoSentences = sentences && sentences.length > 1 
    ? sentences[0] + '.' + sentences[1] + '.'
    : analysis;
  const displayText = expanded ? analysis : firstTwoSentences;
  
  return (
    <div className="p-4 bg-background rounded-lg border border-border/50 shadow-card hover:shadow-card-hover transition-shadow duration-300 mb-3 last:mb-0">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 w-full">
          <div className="mt-1">
            {trend === 'up' ? (
              <TrendingUp className="text-green-500" size={18} />
            ) : trend === 'down' ? (
              <TrendingDown className="text-red-500" size={18} />
            ) : (
              <span className="w-[18px] h-[2px] bg-gray-400 block mt-3" />
            )}
          </div>
          <div className="w-full">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-base">{sector}</h4>
              <Badge variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'} className={`font-medium text-xs ${trend === 'up' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}`}>
                {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
                {percentage.toFixed(1)}%
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                      <Info size={14} className="text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[250px]">
                      Data updated {new Date().toLocaleTimeString()} based on market performance
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <p className="text-muted-foreground text-sm">
                {displayText}
              </p>
              {analysis && analysis.split('.').length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-6 text-xs font-medium text-primary hover:bg-transparent hover:underline mt-1"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? 'Show less' : 'Read more'}
                  <ChevronRight size={14} className={`ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MarketTrendsProps {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

// Famous investor quotes for loading states
const INVESTOR_QUOTES = [
  { quote: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
  { quote: "In the short run, the market is a voting machine. In the long run, it's a weighing machine.", author: "Benjamin Graham" },
  { quote: "The four most dangerous words in investing are: 'This time it's different.'", author: "Sir John Templeton" },
  { quote: "The individual investor should act consistently as an investor and not as a speculator.", author: "Benjamin Graham" },
  { quote: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { quote: "The best investment you can make is in yourself.", author: "Warren Buffett" },
  { quote: "The most important quality for an investor is temperament, not intellect.", author: "Warren Buffett" },
  { quote: "Markets can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes" },
  { quote: "Be fearful when others are greedy and greedy when others are fearful.", author: "Warren Buffett" },
  { quote: "The time of maximum pessimism is the best time to buy, and the time of maximum optimism is the best time to sell.", author: "Sir John Templeton" },
  { quote: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { quote: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.", author: "George Soros" },
  { quote: "Investing should be more like watching paint dry or watching grass grow. If you want excitement, take $800 and go to Las Vegas.", author: "Paul Samuelson" },
  { quote: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher" },
  { quote: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
];

const MarketTrends = ({ loading = false, error = false, onRetry }: MarketTrendsProps) => {
  const [trends, setTrends] = useState<EnhancedMarketTrend[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(Math.floor(Math.random() * INVESTOR_QUOTES.length));
  const { toast } = useToast();
  
  // Determine if we're loading from either internal state or props
  const isLoading = loading || internalLoading;
  // Determine if there's an error from either internal state or props
  const hasError = error || !!internalError;

  const fetchTrends = async () => {
    setInternalLoading(true);
    setInternalError(null);
    
    try {
      const trendsData = await marketInsightService.getEnhancedMarketTrends(5);
      
      // Process the data to simplify it for display
      const processedTrends = trendsData.map(trend => ({
        ...trend,
        // Combine the analyses into a single coherent analysis
        analysis: trend.mistralInsight || trend.perplexityAnalysis
      }));
      
      setTrends(processedTrends);
      
      // If we successfully loaded data after errors, show success toast
      if (retryCount > 0) {
        toast({
          title: "Success",
          description: "Market trends data refreshed successfully",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching market trends:", error);
      setInternalError("Could not load market trends data");
      toast({
        title: "Error",
        description: "Could not load market trends data. Will retry automatically.",
        variant: "destructive",
      });
      
      // Set up automatic retry after 30 seconds if this is the first error
      if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchTrends();
        }, 30000); // 30 seconds
      }
    } finally {
      setInternalLoading(false);
    }
  };

  // Rotate quotes during loading
  useEffect(() => {
    let quoteRotationTimer: number | undefined;
    
    if (isLoading) {
      quoteRotationTimer = window.setInterval(() => {
        setQuoteIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % INVESTOR_QUOTES.length;
          return nextIndex;
        });
      }, 8000); // Change quote every 8 seconds
    }
    
    return () => {
      if (quoteRotationTimer) {
        clearInterval(quoteRotationTimer);
      }
    };
  }, [isLoading]);

  useEffect(() => {
    fetchTrends();
  }, []);

  return (
    <MotionContainer animation="slide-in-up" delay={300}>
      <div className="bg-card rounded-xl shadow-sm border border-border p-5 h-full">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Today's Market Trends</h3>
            <p className="text-sm text-muted-foreground">
              Sector performance overview
            </p>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={onRetry || fetchTrends}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
        
        {hasError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="text-destructive mb-2" size={24} />
            <h4 className="font-medium mb-2">Failed to load trends</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {internalError || "There was an error loading the market trends data."}
              {retryCount > 0 && " We've tried to refresh the data automatically."}
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setRetryCount(prev => prev + 1);
                onRetry ? onRetry() : fetchTrends();
              }}
              className=""
            >
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border-b border-border last:border-0">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-5 w-5 mt-1" />
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-5 w-[100px]" />
                      <Skeleton className="h-5 w-[60px]" />
                    </div>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-[85%]" />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center pt-3 pb-2 px-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={14} className="text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">
                  Loading market trends...
                </p>
              </div>
              <div className="text-center mt-2 border-t border-border pt-3 px-2">
                <p className="text-sm italic text-muted-foreground mb-1">
                  "{INVESTOR_QUOTES[quoteIndex].quote}"
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  — {INVESTOR_QUOTES[quoteIndex].author}
                </p>
              </div>
            </div>
          </div>
        ) : trends.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <h4 className="font-medium mb-2">No trends available</h4>
            <p className="text-sm text-muted-foreground mb-4">
              There are no market trends to display at this time.
            </p>
            <Button variant="outline" onClick={fetchTrends}>
              Refresh
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {trends.map((item, index) => (
              <MarketTrendItem
                key={index}
                sector={item.sector}
                percentage={item.percentage}
                trend={item.trend}
                analysis={item.analysis}
              />
            ))}
          </div>
        )}
      </div>
    </MotionContainer>
  );
};

export default MarketTrends;
