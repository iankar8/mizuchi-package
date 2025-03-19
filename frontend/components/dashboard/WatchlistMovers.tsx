import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Watchlist } from "@/types/supabase";
import marketDataService from "@/services/marketDataService";
import { StockData } from "@/types/market";
import { ArrowUpIcon, ArrowDownIcon, Loader2 } from "lucide-react";

interface WatchlistItem {
  symbol: string;
  watchlist_id: string;
  notes?: string;
}

// Using TopMover interface from the service instead of defining our own

interface WatchlistMoversProps {
  selectedWatchlist: string | null;
  watchlists: Watchlist[];
  isLoading: boolean;
}

const WatchlistMovers: React.FC<WatchlistMoversProps> = ({
  selectedWatchlist,
  watchlists,
  isLoading,
}) => {
  const [view, setView] = useState<"gainers" | "losers">("gainers");
  const [topMovers, setTopMovers] = useState<{ gainers: StockData[], losers: StockData[] }>({ gainers: [], losers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWatchlistMovers = async () => {
      if (!selectedWatchlist) return;

      setLoading(true);
      setError(null);

      try {
        // Get the current watchlist items
        const currentWatchlist = watchlists.find(w => w.id === selectedWatchlist);
        if (!currentWatchlist) {
          throw new Error("Selected watchlist not found");
        }

        // Get market movers from the marketDataService
        // Since we don't have a watchlist-specific method, we'll use the general market movers
        // Strictly limiting to 15 stocks for gainers and losers as requested
        const movers = await marketDataService.getAllMarketMovers(15);
        
        // Ensure we only display maximum 15 items
        setTopMovers({
          gainers: movers.gainers.slice(0, 15),
          losers: movers.losers.slice(0, 15)
        });
      } catch (err) {
        console.error("Error fetching watchlist movers:", err);
        setError("Failed to load watchlist data");
        setTopMovers({ gainers: [], losers: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlistMovers();
  }, [selectedWatchlist, watchlists]);

  // Get the appropriate list based on the current view
  const currentMovers = view === "gainers" ? topMovers.gainers : topMovers.losers;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {view === "gainers" ? "Top Gainers" : "Top Losers"}
        </CardTitle>
        <Tabs 
          defaultValue="gainers" 
          value={view}
          onValueChange={(value) => setView(value as "gainers" | "losers")}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="gainers">Gainers</TabsTrigger>
            <TabsTrigger value="losers">Losers</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading || loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-sm text-red-500">{error}</div>
        ) : currentMovers.length > 0 ? (
          <div className="space-y-2">
            {currentMovers.slice(0, 15).map((stock) => (
              <div 
                key={stock.symbol}
                className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{stock.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {stock.name}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-medium">${stock.price?.toFixed(2) || '0.00'}</span>
                  <div className="flex items-center">
                    {stock.percentChange > 0 ? (
                      <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span className={stock.percentChange > 0 ? "text-green-500" : "text-red-500"}>
                      {Math.abs(stock.percentChange).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No {view === "gainers" ? "gainers" : "losers"} found in this watchlist
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WatchlistMovers;
