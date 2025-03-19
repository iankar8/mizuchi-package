
import { useEffect } from "react";
import { Watchlist } from "@/types/supabase";
import { cn } from "@/lib/utils";

interface WatchlistSidebarListProps {
  watchlists: Watchlist[];
  selectedWatchlist: string | null;
  setSelectedWatchlist: (id: string) => void;
}

const WatchlistSidebarList = ({ 
  watchlists, 
  selectedWatchlist, 
  setSelectedWatchlist 
}: WatchlistSidebarListProps) => {
  // Debugging log to help diagnose issues
  useEffect(() => {
    console.log('WatchlistSidebarList rendered:', {
      watchlistCount: watchlists?.length || 0,
      watchlistIds: watchlists?.map(w => w.id),
      selectedWatchlist
    });
    
    // If we have watchlists but no selection, auto-select the first one
    if (watchlists?.length > 0 && !selectedWatchlist) {
      console.log('Auto-selecting first watchlist:', watchlists[0].id);
      setSelectedWatchlist(watchlists[0].id);
    }
    
    // If selected watchlist is not in the list, select the first one
    if (selectedWatchlist && 
        watchlists?.length > 0 && 
        !watchlists.some(w => w.id === selectedWatchlist)) {
      console.log('Selected watchlist not found in list, selecting first one');
      setSelectedWatchlist(watchlists[0].id);
    }
  }, [watchlists, selectedWatchlist, setSelectedWatchlist]);
  
  const handleSelectWatchlist = (id: string) => {
    console.log('Manually selecting watchlist:', id);
    setSelectedWatchlist(id);
  };
  
  return (
    <div className="space-y-1.5">
      {watchlists.map((watchlist) => (
        <button
          key={watchlist.id}
          onClick={() => handleSelectWatchlist(watchlist.id)}
          className={cn(
            "w-full flex items-center justify-between p-2.5 rounded-md text-sm transition-colors",
            selectedWatchlist === watchlist.id
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-secondary/50 text-foreground"
          )}
        >
          <div className="truncate">{watchlist.name}</div>
          {watchlist.userRole === 'owner' && (
            <span className="ml-2 text-xs bg-primary/5 text-primary px-1.5 py-0.5 rounded-full">
              Owner
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default WatchlistSidebarList;
