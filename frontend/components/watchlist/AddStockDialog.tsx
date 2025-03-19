
import { 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStockForm } from "@/hooks/use-stock-form";

interface AddStockDialogProps {
  handleAddStock: (symbol: string, notes: string) => void;
  setIsAddStockDialogOpen: (isOpen: boolean) => void;
  initialSymbol?: string;
  initialNotes?: string;
}

const AddStockDialog = ({ 
  handleAddStock, 
  setIsAddStockDialogOpen,
  initialSymbol = "",
  initialNotes = ""
}: AddStockDialogProps) => {
  const {
    stockSymbol,
    handleSymbolChange,
    stockNotes,
    setStockNotes,
    isValid
  } = useStockForm(initialSymbol, initialNotes);

  const onSubmit = () => {
    if (isValid()) {
      handleAddStock(stockSymbol, stockNotes);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add stock to watchlist</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Stock Symbol</Label>
            <Input
              id="symbol"
              placeholder="AAPL"
              value={stockSymbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Why you're interested in this stock"
              value={stockNotes}
              onChange={(e) => setStockNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsAddStockDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid()}>Add Stock</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default AddStockDialog;
