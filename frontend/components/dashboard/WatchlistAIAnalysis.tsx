import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import watchlistAnalysisService from "@/services/watchlistAnalysisService";
import { supabase } from "@/utils/supabase/client";

interface WatchlistAIAnalysisProps {
  watchlistId: string;
}

const WatchlistAIAnalysis: React.FC<WatchlistAIAnalysisProps> = ({ watchlistId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Array<{
    symbol: string;
    name: string;
    reason: string;
  }> | null>(null);
  const [addingToWatchlist, setAddingToWatchlist] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!watchlistId) return;
    
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const aiRecommendations = await watchlistAnalysisService.getAIRecommendations(watchlistId);
        setAnalysis(aiRecommendations.analysis);
        setRecommendations(aiRecommendations.recommendations);
      } catch (err) {
        console.error("Error fetching AI analysis:", err);
        setError("Failed to load AI analysis. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [watchlistId]);
  
  const handleAddToWatchlist = async (symbol: string, name: string) => {
    if (!watchlistId) return;
    
    setAddingToWatchlist(prev => ({ ...prev, [symbol]: true }));
    
    try {
      // Check if the symbol already exists in the watchlist
      const { data: existingItems, error: checkError } = await supabase
        .from('watchlist_items')
        .select('id')
        .eq('watchlist_id', watchlistId)
        .eq('symbol', symbol);
      
      if (checkError) throw checkError;
      
      if (existingItems && existingItems.length > 0) {
        toast({
          title: "Already in watchlist",
          description: `${symbol} is already in this watchlist.`,
          variant: "default",
        });
      } else {
        // Get the user ID
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error("User not authenticated");
        
        // Add the symbol to the watchlist
        const { error: insertError } = await supabase
          .from('watchlist_items')
          .insert({
            watchlist_id: watchlistId,
            symbol: symbol,
            ticker: symbol,
            company_name: name,
            added_by: user.id,
            created_by: user.id
          });
        
        if (insertError) throw insertError;
        
        toast({
          title: "Added to watchlist",
          description: `${symbol} has been added to your watchlist.`,
          variant: "default",
        });
      }
    } catch (err) {
      console.error("Error adding to watchlist:", err);
      toast({
        title: "Error",
        description: "Failed to add stock to watchlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToWatchlist(prev => ({ ...prev, [symbol]: false }));
    }
  };

  if (loading) {
    return (
      <Card className="col-span-1 md:col-span-2 h-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">AI Analysis & Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your watchlist...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 md:col-span-2 h-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">AI Analysis & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/10 text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2 h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">AI Analysis & Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {analysis && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Portfolio Analysis</h3>
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm">{analysis}</p>
            </div>
          </div>
        )}
        
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recommended Additions</h3>
            <div className="grid gap-4">
              {recommendations.map((rec) => (
                <div key={rec.symbol} className="p-4 border rounded-lg flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{rec.name}</h4>
                      <Badge variant="outline">{rec.symbol}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="self-start"
                    onClick={() => handleAddToWatchlist(rec.symbol, rec.name)}
                    disabled={addingToWatchlist[rec.symbol]}
                  >
                    {addingToWatchlist[rec.symbol] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>Add to Watchlist</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-4">
          <p>AI analysis is provided for informational purposes only and should not be considered financial advice.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WatchlistAIAnalysis;
