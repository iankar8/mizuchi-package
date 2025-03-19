import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWatchlists } from "@/hooks/use-watchlists";
import { Loader2 } from "lucide-react";
import watchlistAnalysisService from "@/services/watchlistAnalysisService";

interface StockPerformance {
  date: string;
  value: number;
}

// No longer needed - using real data from watchlistAnalysisService

const WatchlistPerformanceChart: React.FC = () => {
  const { watchlists, isLoading } = useWatchlists();
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1W');
  const [chartData, setChartData] = useState<StockPerformance[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set the first watchlist as selected once data is loaded
  useEffect(() => {
    if (watchlists?.length > 0 && !selectedWatchlist) {
      setSelectedWatchlist(watchlists[0].id);
    }
  }, [watchlists, selectedWatchlist]);

  // Load chart data when watchlist or timeframe changes
  useEffect(() => {
    const fetchChartData = async () => {
      if (!selectedWatchlist) return;
      
      setIsLoadingChart(true);
      setError(null);
      
      try {
        // Get the watchlist items
        const currentWatchlist = watchlists.find(w => w.id === selectedWatchlist);
        if (!currentWatchlist) {
          throw new Error("Selected watchlist not found");
        }
        
        // Fetch real performance data for the watchlist
        try {
          const performanceData = await watchlistAnalysisService.getWatchlistPerformance(
            selectedWatchlist,
            timeframe
          );
          
          if (performanceData.length > 0) {
            const formattedData = performanceData.map((item) => ({
              date: new Date(item.date).toLocaleDateString(),
              value: item.value,
            }));
            
            setChartData(formattedData);
          } else {
            throw new Error("No performance data available for this watchlist");
          }
        } catch (err) {
          console.error("Error generating watchlist performance data:", err);
          throw new Error("Failed to process watchlist performance data");
        }
      } catch (err) {
        console.error("Error fetching watchlist performance:", err);
        setError("Failed to load watchlist performance data");
        setChartData([]);
      } finally {
        setIsLoadingChart(false);
      }
    };
    
    fetchChartData();
  }, [selectedWatchlist, timeframe, watchlists]);

  const handleWatchlistChange = (watchlistId: string) => {
    setSelectedWatchlist(watchlistId);
  };

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value as '1D' | '1W' | '1M' | '1Y');
  };

  const getCurrentWatchlistName = () => {
    if (!selectedWatchlist) return "Your Watchlist";
    const watchlist = watchlists.find(w => w.id === selectedWatchlist);
    return watchlist ? watchlist.name : "Your Watchlist";
  };

  const getPerformanceStats = () => {
    if (chartData.length < 2) return { change: 0, changePercent: 0 };
    
    const firstValue = chartData[0].value;
    const lastValue = chartData[chartData.length - 1].value;
    const change = lastValue - firstValue;
    const changePercent = (change / firstValue) * 100;
    
    return { change, changePercent };
  };

  const { change, changePercent } = getPerformanceStats();
  const isPositive = change >= 0;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-col">
          <CardTitle className="text-lg font-medium">{getCurrentWatchlistName()}</CardTitle>
          {!isLoading && !isLoadingChart && (
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}
              </span>
              <span className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <div className="flex space-x-4">
          {/* Watchlist Selector */}
          {!isLoading && watchlists.length > 0 && (
            <select 
              className="bg-background border text-sm rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedWatchlist || ''}
              onChange={(e) => handleWatchlistChange(e.target.value)}
            >
              {watchlists.map((watchlist) => (
                <option key={watchlist.id} value={watchlist.id}>
                  {watchlist.name}
                </option>
              ))}
            </select>
          )}
          
          {/* Timeframe Selector */}
          <Tabs 
            defaultValue="1W" 
            value={timeframe}
            onValueChange={handleTimeframeChange}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="1D">1D</TabsTrigger>
              <TabsTrigger value="1W">1W</TabsTrigger>
              <TabsTrigger value="1M">1M</TabsTrigger>
              <TabsTrigger value="1Y">1Y</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isLoadingChart ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(value) => {
                    return timeframe === '1D' 
                      ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : value;
                  }}
                />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? "#22c55e" : "#ef4444"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">No performance data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WatchlistPerformanceChart;
