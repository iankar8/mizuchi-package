import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import WatchlistAIAnalysis from "@/components/dashboard/WatchlistAIAnalysis";
import { WatchlistRecommendations } from "@/components/watchlist/WatchlistRecommendations";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import watchlistAnalysisService from "@/services/watchlistAnalysisService";

interface Watchlist {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
  owner_id: string;
}

interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  ticker?: string;
  company_name?: string;
  notes?: string;
  created_at: string;
  added_by: string;
}

const WatchlistPage: React.FC = () => {
  const { id: watchlistId } = useParams<{ id: string }>();
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('Not connected');

  // Fetch watchlist data
  useEffect(() => {
    if (!watchlistId) return;

    async function fetchWatchlist() {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('watchlists')
          .select('*')
          .eq('id', watchlistId)
          .single();
        
        if (error) {
          throw error;
        }
        
        // Create a complete watchlist object with all required fields
        const completeWatchlist: Watchlist = {
          id: data.id,
          name: data.name,
          description: data.description,
          owner_id: data.created_by, // Use created_by as owner_id
          is_shared: false, // Default value
          created_at: data.created_at,
          updated_at: data.updated_at,
          last_modified_by: data.last_modified_by || null,
          is_public: data.is_public || false
        };
        
        setWatchlist(completeWatchlist);

        // Fetch watchlist items
        const { data: itemsData, error: itemsError } = await supabase
          .from('watchlist_items')
          .select('*')
          .eq('watchlist_id', watchlistId)
          .order('created_at', { ascending: false });
        
        if (itemsError) {
          throw itemsError;
        }
        
        setItems(itemsData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchWatchlist();
  }, [watchlistId]);
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (!watchlistId) return;
    
    // Create a channel for watchlist updates
    const watchlistChannel = supabase
      .channel(`watchlist-${watchlistId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'watchlists',
          filter: `id=eq.${watchlistId}`
        }, 
        (payload) => {
          console.log('Received watchlist update:', payload);
          
          // Update the watchlist data with the new values
          if (payload.eventType === 'UPDATE' && payload.new) {
            // Ensure all required fields are present
            const newData = payload.new as any;
            if (newData && typeof newData === 'object' && 'id' in newData) {
              setWatchlist(prev => ({
                ...prev!,
                ...newData,
                // Ensure owner_id is preserved if not in the payload
                owner_id: newData.owner_id || prev?.owner_id || ''
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            setWatchlist(null);
            setError('This watchlist has been deleted');
          }
        }
      )
      .subscribe((status) => {
        console.log('Watchlist realtime status:', status);
        setRealtimeStatus(status);
      });
    
    // Create a channel for watchlist items updates
    const itemsChannel = supabase
      .channel(`watchlist-items-${watchlistId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'watchlist_items',
          filter: `watchlist_id=eq.${watchlistId}`
        }, 
        (payload) => {
          console.log('Received watchlist item update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            // Add the new item to the list
            setItems(current => [payload.new as WatchlistItem, ...current]);
          } 
          else if (payload.eventType === 'UPDATE' && payload.new) {
            // Update the existing item
            setItems(current => 
              current.map(item => 
                item.id === payload.new.id ? (payload.new as WatchlistItem) : item
              )
            );
          } 
          else if (payload.eventType === 'DELETE' && payload.old) {
            // Remove the deleted item
            setItems(current => 
              current.filter(item => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();
    
    // Clean up the subscriptions when the component unmounts
    return () => {
      watchlistChannel.unsubscribe();
      itemsChannel.unsubscribe();
    };
  }, [watchlistId]);
  
  if (loading) {
    return <div className="loading-container">Loading watchlist...</div>;
  }
  
  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }
  
  if (!watchlist) {
    return <div className="not-found-container">Watchlist not found</div>;
  }
  
  // State for performance chart
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1M');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // Fetch performance data when watchlist or timeframe changes
  useEffect(() => {
    if (!watchlistId) return;
    
    const fetchPerformanceData = async () => {
      setChartLoading(true);
      setChartError(null);
      
      try {
        const performanceData = await watchlistAnalysisService.getWatchlistPerformance(
          watchlistId,
          timeframe
        );
        
        if (performanceData.length > 0) {
          const formattedData = performanceData.map((item) => ({
            date: new Date(item.date).toLocaleDateString(),
            value: item.value,
          }));
          
          setChartData(formattedData);
        } else {
          setChartError("No performance data available for this watchlist");
        }
      } catch (err: any) {
        console.error("Error fetching watchlist performance data:", err);
        setChartError(err.message || "Failed to load performance data");
      } finally {
        setChartLoading(false);
      }
    };
    
    fetchPerformanceData();
  }, [watchlistId, timeframe]);

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{watchlist.name}</h1>
          {watchlist.description && (
            <p className="text-muted-foreground mt-1">{watchlist.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Stock
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Watchlist Items Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Watchlist Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No stocks in this watchlist</p>
                <Button variant="outline" size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Stock
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium">{item.ticker || item.symbol}</div>
                      {item.company_name && (
                        <div className="text-sm text-muted-foreground">{item.company_name}</div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Performance Chart Card */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold">Performance</CardTitle>
            <Tabs defaultValue={timeframe} onValueChange={(value) => setTimeframe(value as any)}>
              <TabsList>
                <TabsTrigger value="1D">1D</TabsTrigger>
                <TabsTrigger value="1W">1W</TabsTrigger>
                <TabsTrigger value="1M">1M</TabsTrigger>
                <TabsTrigger value="1Y">1Y</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading performance data...</p>
                </div>
              </div>
            ) : chartError ? (
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/10 text-destructive h-64 flex items-center justify-center">
                <p>{chartError}</p>
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickMargin={10}
                      tickFormatter={(value) => {
                        // Simplify date format based on timeframe
                        if (timeframe === '1Y') {
                          return value.split('/')[0]; // Just show month
                        }
                        return value;
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex justify-center items-center h-64 text-muted-foreground">
                <p>No performance data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* AI Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WatchlistAIAnalysis watchlistId={watchlistId} />
        <WatchlistRecommendations watchlistId={watchlistId} />
      </div>
      
      <div className="text-xs text-muted-foreground mt-8">
        <p>Realtime Status: {realtimeStatus}</p>
        <p>Last Updated: {watchlist.updated_at ? new Date(watchlist.updated_at).toLocaleString() : 'Never'}</p>
      </div>
    </div>
  );
};

export default WatchlistPage;
