import { useState } from "react";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import { StockData } from "@/types/market";
import StockItem from "./StockItem";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SectorStockListProps {
  stocks: StockData[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

const SectorStockList = ({ stocks, loading, error, onRetry }: SectorStockListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter stocks by search term
  const filteredStocks = stocks.filter(item => {
    if (searchTerm && !item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
  
  // Sort stocks by absolute percentage change
  const sortedStocks = [...filteredStocks].sort((a, b) => 
    Math.abs(b.percentChange) - Math.abs(a.percentChange)
  );
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search stocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            disabled={loading || error}
          />
        </div>
        {error && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Retry
          </Button>
        )}
      </div>
      
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-8 border border-border rounded-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium mb-2">Unable to load stocks</p>
          <p className="text-sm text-muted-foreground mb-4">There was an error retrieving the sector data</p>
        </div>
      )}
      
      {!loading && !error && sortedStocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 border border-border rounded-lg">
          <p className="text-lg font-medium">No stocks found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
        </div>
      )}
      
      {!loading && !error && sortedStocks.length > 0 && (
        <div className="space-y-3">
          {sortedStocks.map((stock) => (
            <StockItem key={stock.symbol} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SectorStockList;
