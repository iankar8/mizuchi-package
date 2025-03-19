
import { useState, useEffect } from "react";
import { ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import MotionContainer from "../ui/MotionContainer";
import marketInsightService, { CuratedNewsItem } from "@/services/marketInsightService";
import { useToast } from "@/hooks/use-toast";

const NewsItem = ({ 
  title, 
  source, 
  summary, 
  publishedAt, 
  url,
  importance,
  aiSummary,
  marketImpact
}: { 
  title: string;
  source: string;
  summary: string;
  publishedAt: string;
  url: string;
  importance?: 'high' | 'medium' | 'low';
  aiSummary?: string;
  marketImpact?: string;
}) => {
  const formattedDate = new Date(publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className="p-4 border-b border-border last:border-0 hover:bg-secondary/10 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <span className="chip bg-secondary text-secondary-foreground">{source}</span>
        {importance && (
          <span className={`chip ${importance === 'high' ? 'bg-red-100 text-red-800' : importance === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
            {importance.charAt(0).toUpperCase() + importance.slice(1)} Impact
          </span>
        )}
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
      </div>
      
      <h4 className="font-medium mb-2 line-clamp-2">{title}</h4>
      
      <p className="text-sm text-muted-foreground mb-3">
        {aiSummary || summary}
      </p>
      
      {marketImpact && (
        <p className="text-xs font-medium text-primary mb-2">
          <span className="font-semibold">Market Impact:</span> {marketImpact}
        </p>
      )}
      
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
      >
        Read more
        <ExternalLink size={14} className="ml-1" />
      </a>
    </div>
  );
};

interface NewsCardProps {
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

const NewsCard = ({ loading = false, error = false, onRetry }: NewsCardProps) => {
  const [news, setNews] = useState<CuratedNewsItem[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const { toast } = useToast();
  
  // Determine if we're loading from either internal state or props
  const isLoading = loading || internalLoading;

  const fetchNews = async () => {
    setInternalLoading(true);
    try {
      const newsData = await marketInsightService.getCuratedNews(5);
      setNews(newsData);
    } catch (error) {
      console.error("Error fetching news:", error);
      toast({
        title: "Error",
        description: "Could not load AI-curated news",
        variant: "destructive",
      });
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <MotionContainer animation="slide-in-up" delay={400}>
      <div className="bg-card rounded-xl shadow-sm border border-border p-5 h-full">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Latest News</h3>
            <p className="text-sm text-muted-foreground">
              Recent financial updates
            </p>
          </div>
          
          {error && onRetry ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry
            </Button>
          ) : (
            <button className="text-sm text-primary hover:text-primary/80 transition-colors">
              View all
            </button>
          )}
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 border-b border-border last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-16 bg-secondary/30 rounded animate-pulse"></div>
                  <div className="h-4 w-24 bg-secondary/20 rounded animate-pulse"></div>
                </div>
                <div className="h-5 w-full bg-secondary/30 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-full bg-secondary/20 rounded animate-pulse mb-1"></div>
                <div className="h-4 w-3/4 bg-secondary/20 rounded animate-pulse mb-3"></div>
                <div className="h-4 w-20 bg-primary/20 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-red-500 mb-4">
              <AlertCircle size={48} />
            </div>
            <p className="text-lg font-medium mb-2">Unable to load news</p>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              There was an error retrieving the latest financial news
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {news.map((item) => (
              <NewsItem
                key={item.url}
                title={item.title}
                source={item.source}
                summary={item.summary}
                publishedAt={item.timestamp}
                url={item.url}
                importance={item.importance}
                aiSummary={item.aiSummary}
                marketImpact={item.marketImpact}
              />
            ))}
          </div>
        )}
      </div>
    </MotionContainer>
  );
};

export default NewsCard;
