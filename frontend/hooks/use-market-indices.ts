
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import marketDataService from "@/services/marketDataService";
import { MarketIndex } from "@/types/market";

export function useMarketIndices() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMarketIndices = async () => {
    setIsLoading(true);
    try {
      const data = await marketDataService.getMarketIndices();
      setIndices(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching market indices:", err);
      setError("Failed to load market data");
      toast({
        title: "Data Error",
        description: "Could not load market indices data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketIndices();
    
    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchMarketIndices();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  return {
    indices,
    isLoading,
    error,
    refreshData: fetchMarketIndices
  };
}
