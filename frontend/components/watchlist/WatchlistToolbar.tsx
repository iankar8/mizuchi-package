
import { UserPlus, PlusCircle, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import CollapsibleToolbar from "./toolbar/CollapsibleToolbar";
import WatchlistToolbarActions from "./toolbar/WatchlistToolbarActions";

import { Watchlist } from '@/services/watchlist.service';

export interface WatchlistToolbarProps {
  description?: string | null;
  setIsCollaboratorDialogOpen: (isOpen: boolean) => void;
  setIsAddStockDialogOpen: (isOpen: boolean) => void;
  onRefresh?: () => Promise<void> | null;
  selectedWatchlist?: Watchlist & { userRole?: string | null };
  isCollapsible?: boolean;
  watchlistUpdated?: boolean;
  collaboratorsCount?: number;
}

const WatchlistToolbar = ({ 
  description, 
  setIsCollaboratorDialogOpen, 
  setIsAddStockDialogOpen,
  onRefresh,
  selectedWatchlist,
  isCollapsible = false,
  watchlistUpdated = false
}: WatchlistToolbarProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Show a brief animation when updates occur
  useEffect(() => {
    if (watchlistUpdated) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [watchlistUpdated]);
  const toolbarContent = (
    <div className="flex justify-between items-center mb-5">
      <div className="flex items-center gap-4">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        
        <Badge 
          variant={isUpdating ? "default" : "outline"} 
          className={`flex items-center gap-1 ${isUpdating ? "animate-pulse bg-green-500" : ""}`}
        >
          <Wifi size={12} />
          <span className="text-xs">{isUpdating ? "Updating..." : "Real-time"}</span>
        </Badge>
        
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 p-2"
            onClick={onRefresh}
          >
            <RefreshCw size={14} />
          </Button>
        )}
      </div>
      
      <WatchlistToolbarActions 
        watchlist={selectedWatchlist}
        setIsCollaboratorDialogOpen={setIsCollaboratorDialogOpen}
        setIsAddStockDialogOpen={setIsAddStockDialogOpen}
      />
    </div>
  );

  if (isCollapsible) {
    return <CollapsibleToolbar>{toolbarContent}</CollapsibleToolbar>;
  }

  return toolbarContent;
};

export default WatchlistToolbar;
