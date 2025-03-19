
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WatchlistService, Watchlist, WatchlistItem } from "@/services/watchlist.service";

export function useWatchlistItems(selectedWatchlistId: string | null) {
  const [currentWatchlist, setCurrentWatchlist] = useState<Watchlist | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const { toast } = useToast();

  const fetchWatchlistItems = async (watchlistId: string) => {
    setIsLoadingItems(true);
    try {
      // Get the watchlist details
      const { data: watchlist, error: watchlistError } = await WatchlistService.getWatchlists();
      if (watchlistError) {
        throw watchlistError;
      }
      
      // Find the current watchlist
      const currentWatchlist = Array.isArray(watchlist) 
        ? watchlist.find(w => w.id === watchlistId) 
        : null;
      
      setCurrentWatchlist(currentWatchlist || null);
      
      // Get the watchlist items
      const { data: items, error: itemsError } = await WatchlistService.getWatchlistItems(watchlistId);
      if (itemsError) {
        throw itemsError;
      }
      
      // Ensure items is always an array
      setWatchlistItems(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Error fetching watchlist items:", error);
      toast({
        title: "Error",
        description: "Failed to load watchlist items. Please try again.",
        variant: "destructive",
      });
      // Ensure watchlistItems is always an array even on error
      setWatchlistItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const addItemToWatchlist = async (symbol: string, notes: string) => {
    if (!selectedWatchlistId || !symbol) {
      toast({
        title: "Error",
        description: "Please enter a stock symbol.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      const { data, error } = await WatchlistService.addItems(
        selectedWatchlistId,
        [symbol]
      );
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: `${symbol.toUpperCase()} added to watchlist.`,
      });
      
      // Refresh watchlist items
      if (selectedWatchlistId) {
        await fetchWatchlistItems(selectedWatchlistId);
      }
      return true;
    } catch (error) {
      console.error("Error adding stock:", error);
      toast({
        title: "Error",
        description: "Failed to add stock. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeItemFromWatchlist = async (itemId: string, symbol: string) => {
    try {
      if (!selectedWatchlistId) {
        throw new Error("No watchlist selected");
      }
      
      const { error } = await WatchlistService.removeItem(selectedWatchlistId, symbol);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: `${symbol} removed from watchlist.`,
      });
      
      // Refresh watchlist items
      if (selectedWatchlistId) {
        await fetchWatchlistItems(selectedWatchlistId);
      }
      return true;
    } catch (error) {
      console.error("Error removing stock:", error);
      toast({
        title: "Error",
        description: "Failed to remove stock. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    currentWatchlist,
    watchlistItems,
    isLoadingItems,
    fetchWatchlistItems,
    addItemToWatchlist,
    removeItemFromWatchlist
  };
}
