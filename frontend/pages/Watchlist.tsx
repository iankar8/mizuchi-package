
import Navbar from "@/components/layout/Navbar";

// Custom hooks
import { useWatchlistPage } from "@/hooks/use-watchlist-page";
import { useWatchlistCollaboratorsCount } from "@/hooks/use-watchlist-collaborators-count";

// Watchlist Components
import WatchlistHeader from "@/components/watchlist/WatchlistHeader";
import WatchlistSidebar from "@/components/watchlist/WatchlistSidebar";
import WatchlistContent from "@/components/watchlist/WatchlistContent";
import WatchlistDialogs from "@/components/watchlist/WatchlistDialogs";

const Watchlist = () => {
  const {
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
    handleRemoveStock
  } = useWatchlistPage();
  
  const { collaboratorsCount } = useWatchlistCollaboratorsCount(selectedWatchlist);
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <WatchlistHeader 
          setIsDialogOpen={setIsDialogOpen} 
          isDialogOpen={isDialogOpen} 
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <WatchlistSidebar 
            watchlists={watchlists}
            selectedWatchlist={selectedWatchlist}
            setSelectedWatchlist={setSelectedWatchlist}
            isLoading={isLoading}
            setIsDialogOpen={setIsDialogOpen}
          />
          
          <WatchlistContent 
            selectedWatchlistId={selectedWatchlist}
            watchlists={watchlists}
            isLoadingWatchlists={isLoading}
            setIsAddStockDialogOpen={setIsAddStockDialogOpen}
            setIsInviteDialogOpen={setIsCollaboratorDialogOpen}
          />
        </div>
        
        {/* Dialogs */}
        <WatchlistDialogs
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          isAddStockDialogOpen={isAddStockDialogOpen}
          setIsAddStockDialogOpen={setIsAddStockDialogOpen}
          isCollaboratorDialogOpen={isCollaboratorDialogOpen}
          setIsCollaboratorDialogOpen={setIsCollaboratorDialogOpen}
          selectedWatchlist={selectedWatchlist}
          handleCreateWatchlist={handleCreateWatchlist}
          handleAddStock={handleAddStock}
        />
      </main>
    </div>
  );
};

export default Watchlist;
