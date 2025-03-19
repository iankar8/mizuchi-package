
import { useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import { StockData } from "@/types/market";
import StockItem from "./StockItem";
import { cn } from "@/lib/utils";

interface StockListProps {
  gainers: StockData[];
  losers: StockData[];
  mostActive: StockData[];
}

const StockList = ({ gainers, losers, mostActive }: StockListProps) => {
  const [activeTab, setActiveTab] = useState<"gainers" | "losers" | "mostActive">("gainers");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get the active stocks based on the selected tab
  const getActiveStocks = () => {
    switch (activeTab) {
      case "gainers":
        return gainers;
      case "losers":
        return losers;
      case "mostActive":
        return mostActive;
      default:
        return gainers;
    }
  };
  
  // Filter stocks by search term
  const filteredStocks = getActiveStocks().filter(item => {
    if (searchTerm && !item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
  
  // Sort stocks based on the active tab
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    if (activeTab === "gainers") {
      return b.percentChange - a.percentChange;
    } else if (activeTab === "losers") {
      return a.percentChange - b.percentChange;
    } else {
      // Most active - sort by volume
      return (b.volume || 0) - (a.volume || 0);
    }
  });
  
  return (
    <div>
      <div className="flex justify-end p-4 border-b border-border">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            onClick={() => setActiveTab("gainers")}
            className={cn(
              "px-4 py-2 text-sm font-medium border border-r-0",
              activeTab === "gainers"
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-700 border-border hover:bg-gray-50",
              "rounded-l-lg"
            )}
          >
            Top Gainers
          </button>
          <button
            onClick={() => setActiveTab("losers")}
            className={cn(
              "px-4 py-2 text-sm font-medium border border-r-0",
              activeTab === "losers"
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-700 border-border hover:bg-gray-50"
            )}
          >
            Top Losers
          </button>
          <button
            onClick={() => setActiveTab("mostActive")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-r-lg border",
              activeTab === "mostActive"
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-700 border-border hover:bg-gray-50"
            )}
          >
            Most Active
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by symbol or company name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          {sortedStocks.map((stock) => (
            <StockItem key={stock.symbol} stock={stock} />
          ))}
        </div>
        
        {sortedStocks.length === 0 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No matching stocks found</p>
          </div>
        )}
        
        <div className="flex justify-center mt-6">
          <button className="flex items-center text-primary hover:text-primary/80 transition-colors text-sm">
            <ExternalLink size={16} className="mr-1" />
            View Full Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockList;
