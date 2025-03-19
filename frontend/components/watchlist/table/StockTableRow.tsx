
import { ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import type { WatchlistItem } from "@/services/watchlist.service";
import { cn } from "@/lib/utils";

interface StockTableRowProps {
  item: WatchlistItem;
  handleRemoveStock: (itemId: string, symbol: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

const StockTableRow = ({ item, handleRemoveStock, isSelected = false, onSelect }: StockTableRowProps) => {
  return (
    <tr 
      className={cn(
        "transition-colors",
        isSelected ? "bg-secondary/50 hover:bg-secondary/60" : "hover:bg-secondary/30",
        onSelect ? "cursor-pointer" : ""
      )}
      onClick={onSelect}
    >
      <td className="py-4 text-sm font-medium">{item.symbol}</td>
      <td className="py-4 text-sm">{item.notes || "—"}</td>
      <td className="py-4 text-sm text-right">
        ${item.currentPrice?.toFixed(2) || "—"}
      </td>
      <td className={cn(
        "py-4 text-sm text-right flex items-center justify-end",
        (item.change ?? 0) >= 0 ? "text-green-600" : "text-red-600"
      )}>
        {item.change !== undefined && (
          <>
            {item.change >= 0 ? (
              <ArrowUpRight size={16} className="mr-1" />
            ) : (
              <ArrowDownRight size={16} className="mr-1" />
            )}
            <span>
              {item.change >= 0 ? "+" : ""}
              {item.change.toFixed(2)} ({item.changePercent?.toFixed(2)}%)
            </span>
          </>
        )}
      </td>
      <td className="py-4 text-right">
        <button 
          onClick={() => handleRemoveStock(item.id, item.symbol)}
          className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
};

export default StockTableRow;
