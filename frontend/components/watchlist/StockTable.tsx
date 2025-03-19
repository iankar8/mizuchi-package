
import { WatchlistItem } from "@/types/supabase";
import StockTableHeader from "./table/StockTableHeader";
import StockTableRow from "./table/StockTableRow";
import StockTableEmpty from "./table/StockTableEmpty";
import StockTableLoading from "./table/StockTableLoading";
import { useAnalytics } from "@/hooks/use-analytics";

interface StockTableProps {
  watchlistItems: WatchlistItem[];
  isLoadingItems: boolean;
  handleRemoveStock: (itemId: string, symbol: string) => void;
  setIsAddStockDialogOpen: (isOpen: boolean) => void;
  onStockSelect?: (symbol: string) => void;
  selectedStock?: string | null;
}

const StockTable = ({ 
  watchlistItems, 
  isLoadingItems, 
  handleRemoveStock, 
  setIsAddStockDialogOpen,
  onStockSelect,
  selectedStock
}: StockTableProps) => {
  const { trackFeature, trackPerformance } = useAnalytics();
  
  // Track component render performance
  const startTime = performance.now();
  
  // Track when component is rendered with data
  if (!isLoadingItems && watchlistItems?.length > 0) {
    // Track this once on initial render
    trackFeature('watchlist', 'view_stocks', watchlistItems.length);
  }
  
  if (isLoadingItems) {
    return <StockTableLoading />;
  }
  
  // Calculate render time
  const renderTime = performance.now() - startTime;
  trackPerformance('render_stock_table', renderTime, {
    itemCount: watchlistItems.length
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <StockTableHeader />
        <tbody>
          {watchlistItems.length > 0 ? (
            watchlistItems.map((item) => (
              <StockTableRow 
                key={item.id}
                isSelected={selectedStock === item.symbol}
                onSelect={onStockSelect ? () => onStockSelect(item.symbol) : undefined}
                item={item} 
                handleRemoveStock={(itemId, symbol) => {
                  // Track stock removal
                  trackFeature('watchlist', 'remove_stock', symbol);
                  handleRemoveStock(itemId, symbol);
                }} 
              />
            ))
          ) : (
            <StockTableEmpty 
              setIsAddStockDialogOpen={(isOpen) => {
                if (isOpen) {
                  // Track when user initiates adding a stock
                  trackFeature('watchlist', 'open_add_stock_dialog');
                }
                setIsAddStockDialogOpen(isOpen);
              }} 
            />
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StockTable;
