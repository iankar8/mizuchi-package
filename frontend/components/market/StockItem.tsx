
import { ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StockData } from "@/types/market";
import { cn } from "@/lib/utils";

interface StockItemProps {
  stock: StockData;
}

const StockItem = ({ stock }: StockItemProps) => {
  const navigate = useNavigate();
  return (
    <div 
      className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer" 
      onClick={() => navigate(`/stock/${stock.symbol}`)}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{stock.symbol}</span>
              <span className="text-muted-foreground text-sm">{stock.name}</span>
            </div>
            <div className="mt-1 flex items-center">
              <span className="text-xl font-bold mr-2">${stock.price.toFixed(2)}</span>
              <div className={cn(
                "flex items-center px-2 py-0.5 rounded text-sm font-medium",
                stock.percentChange >= 0 
                  ? "text-green-700" 
                  : "text-red-700"
              )}>
                {stock.percentChange >= 0 ? (
                  <ArrowUpRight size={16} className="mr-1" />
                ) : (
                  <ArrowDownRight size={16} className="mr-1" />
                )}
                <span>
                  {stock.percentChange >= 0 ? "+" : ""}
                  ${stock.change.toFixed(2)} ({stock.percentChange.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          <button 
            className="p-1 rounded-full hover:bg-secondary/50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://finance.yahoo.com/quote/${stock.symbol}`, '_blank');
            }}
          >
            <ExternalLink size={16} className="text-muted-foreground" />
          </button>
        </div>
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <div>
            <span>Vol: {(stock.volume! / 1000000).toFixed(1)}M</span>
          </div>
          <div>
            <span>Mkt Cap: {stock.marketCap! >= 1000000000000 
              ? `${(stock.marketCap! / 1000000000000).toFixed(2)}T` 
              : `${(stock.marketCap! / 1000000000).toFixed(2)}B`}
            </span>
          </div>
        </div>
        
        {/* Analysis section is optional */}
      </div>
    </div>
  );
};

export default StockItem;
