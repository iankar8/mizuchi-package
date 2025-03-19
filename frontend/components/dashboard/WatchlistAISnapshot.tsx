import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Watchlist } from "@/types/supabase";
import { useAuth } from "@/context/auth";
import { BrainCircuit, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIInsight {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "news" | "earnings" | "analysis" | "changes";
  symbol?: string;
}

interface WatchlistAISnapshotProps {
  selectedWatchlist: string | null;
  watchlists: Watchlist[];
}

const WatchlistAISnapshot: React.FC<WatchlistAISnapshotProps> = ({
  selectedWatchlist,
  watchlists,
}) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedWatchlist || !user) return;
    
    fetchInsights();
  }, [selectedWatchlist, user]);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would be an API call to fetch AI-generated insights
      // For now, we'll simulate it with mock data
      const mockInsights: AIInsight[] = [
        {
          id: "1",
          title: "What's Changed Since Your Last Visit",
          description: "AAPL +2.3%, NVDA -1.5%, MSFT +0.8%. Apple announced new MacBook Pro models with M3 chips. NVIDIA faced regulatory challenges in China.",
          timestamp: new Date().toISOString(),
          type: "changes",
        },
        {
          id: "2",
          title: "Earnings Update",
          description: "TSLA reported Q1 earnings beating EPS estimates by $0.12, but revenue slightly below expectations. Management cited supply chain challenges.",
          timestamp: new Date().toISOString(),
          type: "earnings",
          symbol: "TSLA",
        },
        {
          id: "3",
          title: "Market Analysis",
          description: "Your tech-focused watchlist underperformed the broader market by 1.2% this week, primarily due to semiconductor weakness.",
          timestamp: new Date().toISOString(),
          type: "analysis",
        },
        {
          id: "4",
          title: "Recent News",
          description: "META announced expansion of AI tools for advertisers, potentially improving ad targeting efficiency and ROI. Analysts project positive impact on revenue.",
          timestamp: new Date().toISOString(),
          type: "news",
          symbol: "META",
        },
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setInsights(mockInsights);
    } catch (err) {
      console.error("Error fetching AI insights:", err);
      setError("Failed to load AI insights");
    } finally {
      setLoading(false);
    }
  };

  const getWatchlistName = () => {
    if (!selectedWatchlist) return "Watchlist";
    const watchlist = watchlists.find(w => w.id === selectedWatchlist);
    return watchlist ? watchlist.name : "Watchlist";
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "changes":
        return <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-900">
          <RefreshCw className="h-3.5 w-3.5 text-blue-500 dark:text-blue-300" />
        </div>;
      case "news":
        return <div className="rounded-full bg-green-100 p-1.5 dark:bg-green-900">
          <BrainCircuit className="h-3.5 w-3.5 text-green-500 dark:text-green-300" />
        </div>;
      case "earnings":
        return <div className="rounded-full bg-amber-100 p-1.5 dark:bg-amber-900">
          <BrainCircuit className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />
        </div>;
      case "analysis":
        return <div className="rounded-full bg-purple-100 p-1.5 dark:bg-purple-900">
          <BrainCircuit className="h-3.5 w-3.5 text-purple-500 dark:text-purple-300" />
        </div>;
      default:
        return <BrainCircuit className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          AI Insights for {getWatchlistName()}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={fetchInsights}
          disabled={loading}
          className="h-8 px-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-secondary rounded animate-pulse w-full" />
                  <div className="h-3 bg-secondary rounded animate-pulse w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : insights.length > 0 ? (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div key={insight.id} className="flex space-x-3">
                {getInsightIcon(insight.type)}
                <div>
                  <h4 className="text-sm font-medium mb-1 flex items-center">
                    {insight.title}
                    {insight.symbol && (
                      <span className="ml-1.5 text-xs bg-secondary px-1.5 py-0.5 rounded">
                        {insight.symbol}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No insights available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WatchlistAISnapshot;
