
import { UserPlus, PlusCircle, Shield, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { RoleManagement } from "./RoleManagement";
import { Watchlist } from "@/services/watchlist.service";

export interface WatchlistToolbarActionsProps {
  watchlist?: Watchlist & { userRole?: string | null };
  setIsCollaboratorDialogOpen: (isOpen: boolean) => void;
  setIsAddStockDialogOpen: (isOpen: boolean) => void;
}

const WatchlistToolbarActions = ({
  watchlist,
  setIsCollaboratorDialogOpen,
  setIsAddStockDialogOpen
}: WatchlistToolbarActionsProps) => {
  const canEdit = watchlist?.userRole && ['owner', 'admin', 'editor'].includes(watchlist.userRole);
  const canManageAccess = watchlist?.userRole && ['owner', 'admin'].includes(watchlist.userRole);
  return (
    <div className="flex items-center justify-between w-full">
      {watchlist && <RoleManagement watchlist={watchlist} />}
      
      <div className="flex items-center gap-2">
        {canManageAccess && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={() => setIsCollaboratorDialogOpen(true)}
          >
            <UserPlus size={16} />
            <span>Manage Access</span>
            {watchlist?.member_count > 0 && (
              <Badge variant="secondary" className="ml-1">
                {watchlist.member_count}
              </Badge>
            )}
          </Button>
        )}
        
        <Button 
          size="sm" 
          className="flex items-center gap-1"
          onClick={() => setIsAddStockDialogOpen(true)}
          disabled={!canEdit}
        >
          <PlusCircle size={16} />
          <span>Add Stock</span>
        </Button>
      </div>
    </div>
  );
};

export default WatchlistToolbarActions;
