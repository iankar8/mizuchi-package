
import { Edit, Trash2, MoreVertical, Share2, Users } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import DeleteWatchlistAlert from "./DeleteWatchlistAlert";

interface WatchlistActionsProps {
  handleRenameWatchlist: () => void;
  handleDeleteWatchlist: () => void;
  handleShareWatchlist?: () => void;
  handleManageCollaborators?: () => void;
  watchlistName?: string;
}

const WatchlistActions = ({ 
  handleRenameWatchlist, 
  handleDeleteWatchlist,
  handleShareWatchlist,
  handleManageCollaborators,
  watchlistName = "this watchlist"
}: WatchlistActionsProps) => {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handleRenameWatchlist}
        className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/50 transition-colors"
        aria-label="Rename watchlist"
      >
        <Edit size={16} />
      </button>
      
      {handleShareWatchlist && (
        <button 
          onClick={handleShareWatchlist}
          className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/50 transition-colors"
          aria-label="Share watchlist"
        >
          <Share2 size={16} />
        </button>
      )}
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogTrigger asChild>
          <button 
            className="p-2 text-muted-foreground hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
            aria-label="Delete watchlist"
          >
            <Trash2 size={16} />
          </button>
        </AlertDialogTrigger>
        <DeleteWatchlistAlert 
          onConfirm={handleDeleteWatchlist}
          onCancel={() => setIsDeleteAlertOpen(false)}
          watchlistName={watchlistName}
        />
      </AlertDialog>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/50 transition-colors"
            aria-label="More options"
          >
            <MoreVertical size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleRenameWatchlist}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>
          
          {handleManageCollaborators && (
            <DropdownMenuItem onClick={handleManageCollaborators}>
              <Users className="mr-2 h-4 w-4" />
              <span>Manage Collaborators</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setIsDeleteAlertOpen(true)}
            className="text-red-500 focus:text-red-500 focus:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default WatchlistActions;
