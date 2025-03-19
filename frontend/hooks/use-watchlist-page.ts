
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWatchlists } from "@/hooks/use-watchlists";
import { useWatchlistItems } from "@/hooks/use-watchlist-items";

export function useWatchlistPage() {
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [isCollaboratorDialogOpen, setIsCollaboratorDialogOpen] = useState(false);
  
  // Selected watchlist state
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  
  // Custom hooks
  const { watchlists, isLoading, createWatchlist, deleteWatchlist } = useWatchlists();
  const { 
    currentWatchlist, 
    watchlistItems, 
    isLoadingItems, 
    fetchWatchlistItems, 
    addItemToWatchlist, 
    removeItemFromWatchlist 
  } = useWatchlistItems(selectedWatchlist);
  
  const { toast } = useToast();
  
  // Set the first watchlist as selected if one is available
  useEffect(() => {
    if (watchlists.length > 0 && !selectedWatchlist) {
      setSelectedWatchlist(watchlists[0].id);
    }
  }, [watchlists, selectedWatchlist]);
  
  // Fetch watchlist items when a watchlist is selected
  useEffect(() => {
    if (selectedWatchlist) {
      fetchWatchlistItems(selectedWatchlist);
    }
  }, [selectedWatchlist, fetchWatchlistItems]);
  
  const handleCreateWatchlist = async (name: string, description: string) => {
    console.log('[Debug] handleCreateWatchlist called with:', { name, description });
    try {
      const newWatchlist = await createWatchlist(name, description);
      console.log('[Debug] createWatchlist result:', newWatchlist);
      
      if (newWatchlist) {
        console.log('[Debug] Setting selected watchlist to:', newWatchlist.id);
        setSelectedWatchlist(newWatchlist.id);
      }
      return newWatchlist;
    } catch (error) {
      console.error('[Debug] Error in handleCreateWatchlist:', error);
      return null;
    }
  };
  
  const handleAddStock = async (symbol: string, notes: string) => {
    const success = await addItemToWatchlist(symbol, notes);
    if (success) {
      setIsAddStockDialogOpen(false);
    }
    return success;
  };
  
  const handleRenameWatchlist = () => {
    toast({
      title: "Coming Soon",
      description: "Watchlist renaming will be available soon.",
    });
  };
  
  const handleDeleteWatchlist = () => {
    if (selectedWatchlist) {
      deleteWatchlist(selectedWatchlist).then((success) => {
        if (success && watchlists.length > 1) {
          // Find the index of the deleted watchlist
          const currentIndex = watchlists.findIndex(w => w.id === selectedWatchlist);
          
          // Select the next watchlist, or the previous if this was the last one
          const nextIndex = currentIndex < watchlists.length - 1 ? currentIndex + 1 : currentIndex - 1;
          setSelectedWatchlist(watchlists[nextIndex].id);
        } else {
          // If there are no more watchlists, set selected to null
          setSelectedWatchlist(null);
        }
      });
    }
  };

  return {
    // Dialog states
    isDialogOpen,
    setIsDialogOpen,
    isAddStockDialogOpen,
    setIsAddStockDialogOpen,
    isCollaboratorDialogOpen,
    setIsCollaboratorDialogOpen,
    
    // Watchlist data and state
    selectedWatchlist,
    setSelectedWatchlist,
    watchlists,
    isLoading,
    currentWatchlist,
    watchlistItems,
    isLoadingItems,
    
    // Action handlers
    handleCreateWatchlist,
    handleAddStock,
    handleRenameWatchlist,
    handleDeleteWatchlist,
    handleRemoveStock: removeItemFromWatchlist
  };
}
