
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Watchlist, WatchlistItem } from "@/types/supabase";
import { Link } from "react-router-dom";
import { ChevronRight, Eye, EyeOff, BarChart3, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import watchlistService from "@/services/watchlist";

interface WatchlistCardProps {
  watchlists: Watchlist[];
  isLoading: boolean;
}

interface WatchlistWithItems extends Watchlist {
  items?: WatchlistItem[];
  itemCount?: number;
}

const WatchlistCard: React.FC<WatchlistCardProps> = ({ watchlists, isLoading }) => {
  const [enhancedWatchlists, setEnhancedWatchlists] = useState<WatchlistWithItems[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  useEffect(() => {
    const fetchWatchlistDetails = async () => {
      if (!watchlists || watchlists.length === 0) return;
      
      setLoadingDetails(true);
      
      try {
        // Get top watchlists to display
        const topWatchlists = watchlists.slice(0, 3);
        const enhancedList: WatchlistWithItems[] = [];
        
        // Fetch items for each watchlist
        for (const watchlist of topWatchlists) {
          try {
            const { items } = await watchlistService.getWatchlistWithItems(watchlist.id);
            
            enhancedList.push({
              ...watchlist,
              items,
              itemCount: items.length
            });
          } catch (error) {
            console.error(`Error fetching items for watchlist ${watchlist.id}:`, error);
            // Add watchlist without items
            enhancedList.push({
              ...watchlist,
              items: [],
              itemCount: 0
            });
          }
        }
        
        setEnhancedWatchlists(enhancedList);
      } catch (error) {
        console.error('Error fetching watchlist details:', error);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    fetchWatchlistDetails();
  }, [watchlists]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Your Watchlists</CardTitle>
        <Link
          to="/watchlist"
          className="text-xs text-muted-foreground hover:text-primary flex items-center"
        >
          View all
          <ChevronRight className="h-3 w-3 ml-1" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading || loadingDetails ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-secondary/50 animate-pulse rounded-md"
              />
            ))}
          </div>
        ) : enhancedWatchlists.length > 0 ? (
          <div className="space-y-3">
            {enhancedWatchlists.map((watchlist) => (
              <Link
                key={watchlist.id}
                to={`/watchlist?id=${watchlist.id}`}
                className="block p-3 rounded-md hover:bg-secondary/50 transition-colors border"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <span className="font-medium">{watchlist.name}</span>
                    {watchlist.is_shared ? (
                      <Badge variant="outline" className="ml-2 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 flex items-center gap-1 opacity-70">
                        <EyeOff className="h-3 w-3" />
                        Private
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center text-muted-foreground text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {watchlist.member_count || 1}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground mb-2">
                  {watchlist.description || 'No description'}
                </div>
                
                {watchlist.items && watchlist.items.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {watchlist.items.slice(0, 5).map(item => (
                      <Badge key={item.id} variant="secondary" className="text-xs">
                        {item.symbol}
                      </Badge>
                    ))}
                    {watchlist.itemCount > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{watchlist.itemCount - 5} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No stocks added yet
                  </div>
                )}
              </Link>
            ))}
            
            <Link to="/watchlist?action=create">
              <Button 
                variant="outline" 
                className="w-full mt-2 border-dashed"
              >
                Create New Watchlist
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-sm text-muted-foreground mb-3">
              You don't have any watchlists yet
            </p>
            <Link
              to="/watchlist?action=create"
            >
              <Button variant="outline">Create your first watchlist</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WatchlistCard;
