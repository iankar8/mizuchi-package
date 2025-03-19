
import { TrendingUp, TrendingDown, LineChart, RefreshCw, AlertCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MarketTrend } from "@/types/market";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketTrendsProps {
  trends: MarketTrend[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

const MarketTrends = ({ trends, loading = false, error = false, onRetry }: MarketTrendsProps) => {
  const navigate = useNavigate();
  // Ensure trends is always an array before rendering
  const safeTrends = Array.isArray(trends) ? trends : [];
  
  return (
    <div className="p-6 border border-border rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Today's Market Trends</h2>
        {error && onRetry && (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 flex items-start">
              <div className="mr-3 mt-1">
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <div className="w-full">
                <div className="flex items-center mb-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12 ml-2" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium mb-2">Unable to load market trends</p>
          <p className="text-sm text-muted-foreground mb-4">There was an error retrieving the latest sector data</p>
        </div>
      )}
      
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeTrends.map((trend, index) => (
          <div 
            key={index} 
            className="bg-gray-50 rounded-lg p-4 flex items-start cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => navigate(`/sector/${encodeURIComponent(trend.sector)}`)}
          >
            <div className="mr-3 mt-1">
              {trend.trend === "up" ? (
                <TrendingUp size={20} className="text-green-600" />
              ) : trend.trend === "down" ? (
                <TrendingDown size={20} className="text-red-600" />
              ) : (
                <LineChart size={20} className="text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <h3 className="font-medium">{trend.sector}</h3>
                  <span className={cn(
                    "ml-2 text-sm font-medium",
                    trend.trend === "up" ? "text-green-600" : 
                    trend.trend === "down" ? "text-red-600" : "text-amber-600"
                  )}>
                    {trend.trend === "up" ? "+" : trend.trend === "down" ? "-" : "±"}
                    {Math.abs(trend.percentage).toFixed(1)}%
                  </span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{trend.reason}</p>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

export default MarketTrends;
