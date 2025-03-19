
import { useEffect } from "react";
import { PlusCircle, RefreshCw } from "lucide-react";

interface WatchlistSidebarEmptyProps {
  setIsDialogOpen: (isOpen: boolean) => void;
}

const WatchlistSidebarEmpty = ({ setIsDialogOpen }: WatchlistSidebarEmptyProps) => {
  // Log when this component renders
  useEffect(() => {
    console.log('[Watchlist] Empty state rendered, no watchlists found');
  }, []);

  // Handle create watchlist button click
  const handleCreateClick = () => {
    console.log('[Debug] Create watchlist button clicked');
    try {
      setIsDialogOpen(true);
      console.log('[Debug] Dialog open state set to true');
    } catch (error) {
      console.error('[Debug] Error setting dialog state:', error);
    }
  };

  // Handle retry loading button click
  const handleRetryClick = () => {
    console.log('[Debug] Retry loading watchlists clicked');
    // Refresh the page to retry loading
    window.location.reload();
  };

  return (
    <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
      <p className="text-sm mb-3">No watchlists yet</p>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleCreateClick}
          className="text-primary hover:text-primary/80 text-sm flex items-center gap-1.5 transition-colors p-2"
        >
          <PlusCircle size={16} />
          <span>Create your first watchlist</span>
        </button>
        
        <button
          onClick={handleRetryClick}
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1.5 transition-colors p-2"
        >
          <RefreshCw size={16} />
          <span>Retry loading</span>
        </button>
      </div>
    </div>
  );
};

export default WatchlistSidebarEmpty;
