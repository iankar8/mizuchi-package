
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WatchlistPlaceholderProps {
  setIsDialogOpen: (isOpen: boolean) => void;
}

const WatchlistPlaceholder = ({ setIsDialogOpen }: WatchlistPlaceholderProps) => {
  return (
    <div className="p-12 text-center text-muted-foreground">
      <p className="mb-2">Select a watchlist or create a new one</p>
      <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm">
        <PlusCircle size={14} className="mr-1" />
        Create Watchlist
      </Button>
    </div>
  );
};

export default WatchlistPlaceholder;
