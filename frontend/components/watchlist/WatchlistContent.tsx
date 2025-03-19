
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Watchlist } from "@/types/supabase";
import WatchlistHeader from "./WatchlistHeader";
import WatchlistToolbar from "./WatchlistToolbar";
import { useWatchlistRealtime } from "@/hooks/use-watchlist-realtime";
import StockTable from "./StockTable";
import WatchlistDetails from "./content/WatchlistDetails";
import { useWatchlistData } from "@/hooks/use-watchlist-data";
import watchlistService from "@/services/watchlist";

interface WatchlistContentProps {
  selectedWatchlistId: string | null;
  watchlists: Watchlist[];
  isLoadingWatchlists: boolean;
  setIsAddStockDialogOpen: (isOpen: boolean) => void;
  setIsInviteDialogOpen: (isOpen: boolean) => void;
}

const WatchlistContent = ({
  selectedWatchlistId,
  watchlists,
  isLoadingWatchlists,
  setIsAddStockDialogOpen,
  setIsInviteDialogOpen,
}: WatchlistContentProps) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [watchlistUpdated, setWatchlistUpdated] = useState(false);
  
  // Use our new hook to get real-time watchlist data
  const {
    watchlist: currentWatchlist,
    items: watchlistItems,
    isLoading: isLoadingItems,
    refresh: refreshWatchlistData
  } = useWatchlistData(selectedWatchlistId);

  // Debug logging for watchlist data
  useEffect(() => {
    console.log('WatchlistContent - Selected watchlist ID:', selectedWatchlistId);
    console.log('WatchlistContent - Current watchlist data:', currentWatchlist);
    console.log('WatchlistContent - Watchlist items:', watchlistItems);
    console.log('WatchlistContent - Loading state:', { isLoadingWatchlists, isLoadingItems });
  }, [selectedWatchlistId, currentWatchlist, watchlistItems, isLoadingWatchlists, isLoadingItems]);

  // Memoize the refresh callback to prevent unnecessary re-renders
  const handleUpdate = useCallback(() => {
    console.log('WatchlistContent - Realtime update triggered');
    refreshWatchlistData();
    setWatchlistUpdated(true);
  }, [refreshWatchlistData]);

  // Debug logging for auth status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Import dynamically to avoid circular dependencies
        const { supabase } = await import('@/utils/supabase/client');
        
        const { data: session, error } = await supabase.auth.getSession();
        console.log('WatchlistContent - Auth status check:', { 
          hasSession: !!session?.session,
          userId: session?.session?.user?.id,
          error: error ? error.message : null
        });
      } catch (e) {
        console.error('WatchlistContent - Error checking auth status:', e);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Subscribe to real-time updates
  useWatchlistRealtime(selectedWatchlistId, handleUpdate);
  
  // Reset watchlistUpdated state after a delay
  useEffect(() => {
    if (watchlistUpdated) {
      const timer = setTimeout(() => {
        setWatchlistUpdated(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [watchlistUpdated]);

  const handleRemoveStock = async (itemId: string, symbol: string) => {
    try {
      const success = await watchlistService.removeItemFromWatchlist(itemId);
      
      if (success) {
        toast({
          title: "Success",
          description: `${symbol} removed from watchlist.`,
        });
        
        // Refresh watchlist items
        if (selectedWatchlistId) {
          refreshWatchlistData();
        }
      }
    } catch (error) {
      console.error("Error removing stock:", error);
      toast({
        title: "Error",
        description: "Failed to remove stock. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRenameWatchlist = () => {
    // Placeholder for rename functionality
    console.log("Rename watchlist");
  };

  const handleDeleteWatchlist = () => {
    // Placeholder for delete functionality
    console.log("Delete watchlist");
  };

  return (
    <div className="flex flex-col h-full">
      {currentWatchlist ? (
        <>
          <WatchlistHeader 
            setIsDialogOpen={setIsDialogOpen}
            isDialogOpen={isDialogOpen}
            title={currentWatchlist.name}
            description={currentWatchlist.description || ""}
          />
          
          <div className="flex-grow flex flex-col">
            <WatchlistToolbar 
              description={currentWatchlist.description}
              setIsCollaboratorDialogOpen={setIsInviteDialogOpen}
              setIsAddStockDialogOpen={setIsAddStockDialogOpen}
              onRefresh={refreshWatchlistData}
              selectedWatchlist={currentWatchlist}
              watchlistUpdated={watchlistUpdated}
            />
            
            <div className="flex-grow overflow-auto">
              <StockTable
                watchlistItems={watchlistItems}
                isLoadingItems={isLoadingItems}
                handleRemoveStock={handleRemoveStock}
                setIsAddStockDialogOpen={setIsAddStockDialogOpen}
              />
            </div>
          </div>
          
          <WatchlistDetails 
            currentWatchlist={currentWatchlist}
            watchlistItems={watchlistItems}
            isLoadingItems={isLoadingItems}
            setIsCollaboratorDialogOpen={setIsInviteDialogOpen}
            setIsAddStockDialogOpen={setIsAddStockDialogOpen}
            handleRenameWatchlist={handleRenameWatchlist}
            handleDeleteWatchlist={handleDeleteWatchlist}
            handleRemoveStock={handleRemoveStock}
          />
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          {isLoadingWatchlists ? (
            <p>Loading watchlists...</p>
          ) : watchlists.length === 0 ? (
            <p>No watchlist selected.</p>
          ) : (
            <p>Select a watchlist to view its contents.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WatchlistContent;
