
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Watchlist, WatchlistItem, Result } from "@/types/supabase";
import watchlistService from "@/services/watchlist";
import fmpService from "@/services/fmpService";
import { tokenManager } from "@/utils/supabase/tokenManager";
import { DBStatusCode } from "@/types/supabase";
import { isError } from "@/utils/supabase/resultUtils";

export function useWatchlistData(watchlistId: string | null) {
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const fetchWatchlistData = async (id: string) => {
    console.log(`useWatchlistData - Fetching data for watchlist ID: ${id}`);
    setIsLoading(true);
    setError(null);
    
    try {
      // Check token expiration and refresh if needed before fetching
      try {
        const tokenExpiresAt = tokenManager.getTokenExpiresAt();
        if (tokenExpiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const expiresInSeconds = tokenExpiresAt - now;
          
          console.log(`useWatchlistData - Token expires in ${expiresInSeconds}s`);
          
          // If token expires in less than 5 minutes, refresh it and wait for completion
          if (expiresInSeconds < 300) {
            console.log('useWatchlistData - Token expiring soon, refreshing...');
            const tokenRefreshed = await tokenManager.refreshToken();
            
            // Add a short delay to ensure the refresh propagates
            if (tokenRefreshed) {
              console.log('useWatchlistData - Token refreshed, waiting for propagation...');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
      } catch (authError) {
        console.error('useWatchlistData - Token check error:', authError);
      }
      
      // Fetch watchlist and its items using the enhanced service
      console.log(`useWatchlistData - Calling watchlistService.getWatchlistWithItems(${id})`);
      
      // Get Result object from the modern service implementation
      const result = await watchlistService.getWatchlistWithItems(id);
      
      // Check for errors in the Result object
      if (isError(result)) {
        console.error(`useWatchlistData - Error fetching watchlist: ${result.error}`);
        
        // Handle specific error types using status codes
        if (result.status === DBStatusCode.NOT_FOUND) {
          setError("Watchlist not found");
        } else if (result.status === DBStatusCode.UNAUTHORIZED) {
          setError("You don't have permission to access this watchlist");
          
          // Try refreshing token for auth issues
          await tokenManager.refreshToken();
        } else if (result.status === DBStatusCode.RLS_ERROR) {
          setError("You don't have permission to access this watchlist");
        } else {
          setError(result.error || "Could not load watchlist data");
        }
        
        setWatchlist(null);
        setItems([]);
        setIsLoading(false);
        return;
      }
      
      // Data exists but watchlist might be null
      if (!result.data.watchlist) {
        console.log(`useWatchlistData - Watchlist with ID ${id} not found`);
        setError("Watchlist not found");
        setWatchlist(null);
        setItems([]);
        setIsLoading(false);
        return;
      }
      
      // Success case - update state
      setWatchlist(result.data.watchlist);
      console.log('useWatchlistData - Watchlist state updated');
      
      const fetchedItems = result.data.items || [];
      
      // Fetch real-time quotes for all items
      if (fetchedItems.length > 0) {
        const symbols = fetchedItems.map(item => item.symbol);
        try {
          const quotes = await fmpService.getMultipleQuotes(symbols);
          
          // Update items with real-time price data
          const enhancedItems = fetchedItems.map(item => {
            const quote = quotes[item.symbol];
            if (quote) {
              return {
                ...item,
                currentPrice: quote.price,
                change: quote.change,
                changePercent: Number(quote.changePercent.replace('%', ''))
              } as WatchlistItem;
            }
            return item;
          });
          
          setItems(enhancedItems);
        } catch (quoteError) {
          console.error("Error fetching quotes:", quoteError);
          // Still set the items even if quotes fail
          setItems(fetchedItems);
          toast({
            title: "Warning",
            description: "Stock price data could not be loaded",
            variant: "default",
          });
        }
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Error fetching watchlist data:", err);
      setError("Could not load watchlist data");
      toast({
        title: "Error",
        description: "Failed to load watchlist data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (watchlistId) {
      fetchWatchlistData(watchlistId);
    } else {
      setWatchlist(null);
      setItems([]);
      setError(null);
    }
  }, [watchlistId]);
  
  // Setup a refresh interval for long-lived components
  useEffect(() => {
    // Only create interval if watchlistId exists
    if (!watchlistId) return;
    
    console.log('useWatchlistData - Setting up refresh interval');
    
    // Refresh data every 5 minutes if the component is mounted for a long time
    const refreshInterval = setInterval(() => {
      console.log('useWatchlistData - Auto-refreshing data');
      fetchWatchlistData(watchlistId);
    }, 300000); // 5 minutes
    
    // Clean up when watchlistId changes or component unmounts
    return () => {
      console.log('useWatchlistData - Cleaning up refresh interval');
      clearInterval(refreshInterval);
    };
  }, [watchlistId]);
  
  return {
    watchlist,
    items,
    isLoading,
    error,
    refresh: () => watchlistId ? fetchWatchlistData(watchlistId) : Promise.resolve(null),
    // Add status code lookup helper
    isNotFound: error?.includes("not found") || error?.includes("Watchlist not found"),
    isPermissionError: error?.includes("permission")
  };
}
