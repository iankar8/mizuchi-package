import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import watchlistService from '@/services/watchlistService';
import mockWatchlistService from '@/services/mockWatchlistService';

interface WatchlistAIRecommendationsProps {
  watchlistId: string;
}

export function WatchlistAIRecommendations({ watchlistId }: WatchlistAIRecommendationsProps) {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Array<{ symbol: string; reason: string }>>([]);
  const [diversification, setDiversification] = useState<{
    analysis: string;
    sectorBreakdown: Array<{ sector: string; percentage: number }>;
  }>({
    analysis: '',
    sectorBreakdown: []
  });
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!watchlistId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch recommendations and diversification analysis in parallel
        const [recData, divData] = await Promise.all([
          mockWatchlistService.getWatchlistRecommendations(watchlistId),
          mockWatchlistService.getDiversificationAnalysis(watchlistId)
        ]);
        
        setRecommendations(recData);
        setDiversification(divData);
      } catch (error) {
        console.error('Error fetching AI recommendations:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [watchlistId]);

  const handleRefresh = async () => {
    if (!watchlistId) return;
    
    setRefreshing(true);
    try {
      // Fetch fresh recommendations and diversification analysis
      const [recData, divData] = await Promise.all([
        mockWatchlistService.getWatchlistRecommendations(watchlistId),
        mockWatchlistService.getDiversificationAnalysis(watchlistId)
      ]);
      
      setRecommendations(recData);
      setDiversification(divData);
      
      toast({
        title: "Recommendations updated",
        description: "AI analysis has been refreshed with the latest data."
      });
    } catch (error) {
      console.error('Error refreshing AI recommendations:', error);
      toast({
        title: "Update failed",
        description: "Could not refresh AI recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddStock = async (symbol: string) => {
    if (!watchlistId) return;
    
    try {
      // Get company info for the symbol
      const companyInfo = await watchlistService.getCompanyInfo(symbol);
      
      if (!companyInfo) {
        throw new Error(`Could not find company info for ${symbol}`);
      }
      
      // Add stock to watchlist
      const { item, error } = await watchlistService.addWatchlistItem(
        watchlistId,
        symbol,
        companyInfo.name
      );
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Stock added",
        description: `Added ${symbol} to your watchlist.`
      });
      
      // Refresh recommendations to remove the added stock
      const newRecs = await mockWatchlistService.getWatchlistRecommendations(watchlistId);
      setRecommendations(newRecs);
    } catch (error) {
      console.error(`Error adding ${symbol} to watchlist:`, error);
      toast({
        title: "Failed to add stock",
        description: `Could not add ${symbol} to your watchlist.`,
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Recommendations</CardTitle>
          <CardDescription>Loading AI analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">AI Recommendations</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating...' : 'Refresh'}
          </Button>
        </div>
        <CardDescription>
          AI-powered insights for your watchlist
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Diversification Analysis */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1 text-primary" />
              Diversification Analysis
            </h3>
            <p className="text-sm text-muted-foreground">
              {diversification.analysis}
            </p>
            
            {/* Sector Breakdown */}
            {diversification.sectorBreakdown.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {diversification.sectorBreakdown.map((sector) => (
                  <Badge key={sector.sector} variant="outline">
                    {sector.sector}: {sector.percentage}%
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Recommended Stocks */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Recommended Additions</h3>
              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <div 
                    key={rec.symbol} 
                    className="p-2 rounded-md border bg-card flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{rec.symbol}</div>
                      <div className="text-xs text-muted-foreground">{rec.reason}</div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(rec.symbol)}
                      >
                        Details
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleAddStock(rec.symbol)}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* No Recommendations */}
          {recommendations.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No additional stock recommendations available at this time.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default WatchlistAIRecommendations;
