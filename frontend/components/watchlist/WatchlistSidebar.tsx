
import { Watchlist } from "@/types/supabase";
import MotionContainer from "@/components/ui/MotionContainer";
import WatchlistSidebarList from "./sidebar/WatchlistSidebarList";
import WatchlistSidebarEmpty from "./sidebar/WatchlistSidebarEmpty";
import WatchlistSidebarLoading from "./sidebar/WatchlistSidebarLoading";

interface WatchlistSidebarProps {
  watchlists: Watchlist[];
  selectedWatchlist: string | null;
  setSelectedWatchlist: (id: string) => void;
  isLoading: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
}

const WatchlistSidebar = ({ 
  watchlists, 
  selectedWatchlist, 
  setSelectedWatchlist, 
  isLoading, 
  setIsDialogOpen 
}: WatchlistSidebarProps) => {
  return (
    <MotionContainer animation="slide-in-up" delay={100} className="lg:col-span-1">
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-foreground">My Watchlists</h2>
        </div>
        
        <div className="p-4">
          {isLoading ? (
            <WatchlistSidebarLoading />
          ) : watchlists.length === 0 ? (
            <WatchlistSidebarEmpty setIsDialogOpen={setIsDialogOpen} />
          ) : (
            <WatchlistSidebarList 
              watchlists={watchlists} 
              selectedWatchlist={selectedWatchlist}
              setSelectedWatchlist={setSelectedWatchlist}
            />
          )}
        </div>
      </div>
    </MotionContainer>
  );
};

export default WatchlistSidebar;
