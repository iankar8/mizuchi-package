import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle } from "lucide-react";
import researchSynthesisService from '@/services/ai/researchSynthesisService';
import { useAuth } from '@/context/auth';
import { useWatchlists } from '@/hooks/use-watchlists';
import { useToast } from '@/hooks/use-toast';

interface WatchlistRecommendationsProps {
  symbol: string;
  companyName: string;
  onWatchlistCreated?: (watchlistId: string) => void;
}

export function WatchlistRecommendations({ 
  symbol, 
  companyName,
  onWatchlistCreated 
}: WatchlistRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Array<{ name: string, reason: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { createWatchlist } = useWatchlists();
  const { toast } = useToast();
  const [creatingWatchlist, setCreatingWatchlist] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!symbol || !user) return;
      
      setLoading(true);
      try {
        const data = await researchSynthesisService.getWatchlistRecommendations(symbol, user.id, companyName);
        setRecommendations(data);
      } catch (error) {
        console.error("Error fetching watchlist recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [symbol, user]);

  const handleCreateWatchlist = async (name: string) => {
    if (!user) return;
    
    setCreatingWatchlist(name);
    try {
      const watchlistId = await createWatchlist(name, {
        description: `AI-generated watchlist for tracking ${name.toLowerCase()} stocks`,
        isShared: false,
        stocks: [{ symbol, notes: companyName }]
      });
      
      toast({
        title: "Watchlist created",
        description: `Created watchlist "${name}" and added ${symbol}`,
      });
      
      if (onWatchlistCreated) {
        onWatchlistCreated(watchlistId);
      }
    } catch (error) {
      console.error("Error creating watchlist:", error);
      toast({
        title: "Error creating watchlist",
        description: "Failed to create watchlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingWatchlist(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Watchlist Recommendations</CardTitle>
          <CardDescription>Finding the best watchlists for {symbol}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Watchlist Recommendations</CardTitle>
          <CardDescription>No recommendations available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We couldn't generate watchlist recommendations for {symbol} at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Watchlist Recommendations</CardTitle>
        <CardDescription>Suggested watchlists for {symbol}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec, idx) => (
          <div 
            key={idx} 
            className="rounded-lg border p-3 bg-card text-card-foreground shadow-sm"
          >
            <div className="font-medium mb-1">{rec.name}</div>
            <p className="text-sm text-muted-foreground">{rec.reason}</p>
            <div className="mt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateWatchlist(rec.name)}
                disabled={creatingWatchlist === rec.name}
              >
                {creatingWatchlist === rec.name ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        AI-powered recommendations based on market data and industry analysis
      </CardFooter>
    </Card>
  );
}
