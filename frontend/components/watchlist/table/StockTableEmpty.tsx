
import { PlusCircle } from "lucide-react";

interface StockTableEmptyProps {
  setIsAddStockDialogOpen: (isOpen: boolean) => void;
}

const StockTableEmpty = ({ setIsAddStockDialogOpen }: StockTableEmptyProps) => {
  return (
    <tr>
      <td colSpan={5} className="py-8 text-center text-muted-foreground">
        <p>No stocks in this watchlist yet.</p>
        <button
          onClick={() => setIsAddStockDialogOpen(true)}
          className="mt-2 text-primary hover:text-primary/80 text-sm flex items-center gap-1 mx-auto"
        >
          <PlusCircle size={14} />
          <span>Add stocks</span>
        </button>
      </td>
    </tr>
  );
};

export default StockTableEmpty;
