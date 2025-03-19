
import { useState } from "react";
import { BarChart, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";

// Mock data for popular stocks (in a real app, this would come from an API)
const POPULAR_STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM", "V", "JNJ",
  "WMT", "PG", "MA", "UNH", "HD", "BAC", "XOM", "PFE", "T", "VZ"
];

interface StocksManagerProps {
  stocks: string[];
  onStocksChange: (stocks: string[]) => void;
}

const StocksManager = ({ stocks, onStocksChange }: StocksManagerProps) => {
  const [newStock, setNewStock] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleAddStock = () => {
    const stockSymbol = newStock.trim().toUpperCase();
    if (stockSymbol && !stocks.includes(stockSymbol)) {
      onStocksChange([...stocks, stockSymbol]);
      setNewStock("");
    }
  };

  const handleRemoveStock = (stockToRemove: string) => {
    onStocksChange(stocks.filter(stock => stock !== stockToRemove));
  };

  const filteredStocks = POPULAR_STOCKS.filter(
    stock => 
      !stocks.includes(stock) && 
      stock.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-1">Related Stocks</h3>
      <div className="flex flex-wrap gap-2 mb-2">
        {stocks.map((stock, index) => (
          <Badge 
            key={index} 
            variant="outline" 
            className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20"
          >
            <BarChart size={12} className="text-primary" />
            {stock}
            <button onClick={() => handleRemoveStock(stock)} className="ml-1 text-xs hover:text-destructive">
              <X size={12} />
            </button>
          </Badge>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <BarChart size={14} className="mr-2" /> Add Stocks
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <h4 className="font-medium text-sm mb-2">Add Related Stocks</h4>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="Enter stock symbol"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                />
                <Button size="sm" onClick={handleAddStock}>Add</Button>
              </div>
              
              <div>
                <div className="flex items-center border rounded-md pl-2 mb-2">
                  <Search className="h-4 w-4 mr-1 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search popular stocks"
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                
                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                  {filteredStocks.map((stock, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10 flex items-center gap-1"
                      onClick={() => onStocksChange([...stocks, stock])}
                    >
                      <BarChart size={12} />
                      {stock}
                    </Badge>
                  ))}
                  {filteredStocks.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No matching stocks found</p>
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default StocksManager;
