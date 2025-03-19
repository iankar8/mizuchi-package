
import { FolderPlus, Share2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

export interface WatchlistHeaderProps {
  setIsDialogOpen: (isOpen: boolean) => void;
  isDialogOpen: boolean;
  onShowShareOptions?: () => void;
  title?: string;
  description?: string;
  actionButtonText?: string;
  actionButtonIcon?: React.ReactNode;
  onActionButtonClick?: () => void;
}

const WatchlistHeader = ({ 
  setIsDialogOpen, 
  isDialogOpen, 
  onShowShareOptions,
  title = "Watchlists",
  description = "Keep track of stocks that interest you",
  actionButtonText = "New Watchlist",
  actionButtonIcon = <FolderPlus size={16} />,
  onActionButtonClick
}: WatchlistHeaderProps) => {
  return (
    <div className="mb-6 flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">
          {description}
        </p>
      </div>
      
      <div className="flex gap-2">
        {onShowShareOptions && (
          <Button 
            variant="outline" 
            className="flex items-center gap-1"
            onClick={onShowShareOptions}
          >
            <Share2 size={16} />
            <span>Share</span>
          </Button>
        )}
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="flex items-center gap-1"
              onClick={onActionButtonClick}
            >
              {actionButtonIcon}
              <span>{actionButtonText}</span>
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>
    </div>
  );
};

export default WatchlistHeader;
