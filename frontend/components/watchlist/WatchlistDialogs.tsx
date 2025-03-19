
import { Dialog } from "@/components/ui/dialog";
import CreateWatchlistWithStocksDialog from "@/components/watchlist/CreateWatchlistWithStocksDialog";
import AddStockDialog from "@/components/watchlist/AddStockDialog";
import InviteCollaboratorDialog from "@/components/watchlist/InviteCollaboratorDialog";
import { useEffect } from "react";

interface WatchlistDialogsProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  isAddStockDialogOpen: boolean;
  setIsAddStockDialogOpen: (isOpen: boolean) => void;
  isCollaboratorDialogOpen: boolean;
  setIsCollaboratorDialogOpen: (isOpen: boolean) => void;
  selectedWatchlist: string | null;
  handleCreateWatchlist: (name: string, description: string, symbols?: string[]) => Promise<any>;
  handleAddStock: (symbol: string, notes: string) => Promise<boolean>;
}

const WatchlistDialogs = ({
  isDialogOpen,
  setIsDialogOpen,
  isAddStockDialogOpen,
  setIsAddStockDialogOpen,
  isCollaboratorDialogOpen,
  setIsCollaboratorDialogOpen,
  selectedWatchlist,
  handleCreateWatchlist,
  handleAddStock
}: WatchlistDialogsProps) => {
  // Add debugging for dialog state changes
  useEffect(() => {
    console.log('[Debug] Dialog open state changed:', isDialogOpen);
  }, [isDialogOpen]);
  
  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <CreateWatchlistWithStocksDialog 
          handleCreateWatchlist={handleCreateWatchlist}
          setIsDialogOpen={setIsDialogOpen}
        />
      </Dialog>
      
      <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
        <AddStockDialog 
          handleAddStock={handleAddStock}
          setIsAddStockDialogOpen={setIsAddStockDialogOpen}
        />
      </Dialog>
      
      <Dialog open={isCollaboratorDialogOpen} onOpenChange={setIsCollaboratorDialogOpen}>
        {selectedWatchlist && (
          <InviteCollaboratorDialog 
            watchlistId={selectedWatchlist}
            setIsCollaboratorDialogOpen={setIsCollaboratorDialogOpen}
          />
        )}
      </Dialog>
    </>
  );
};

export default WatchlistDialogs;
