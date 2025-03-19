
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import MotionContainer from "@/components/ui/MotionContainer";
import MarketTrends from "@/components/market/MarketTrends";
import StockList from "@/components/market/StockList";
import marketDataService from "@/services/marketDataService";
import { MarketTrend, StockData } from "@/types/market";
import { Loader2 } from "lucide-react";

const MarketMovers = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [marketMovers, setMarketMovers] = useState<{
    gainers: StockData[];
    losers: StockData[];
    mostActive: StockData[];
  }>({ gainers: [], losers: [], mostActive: [] });

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
    
    // Fetch market data
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch market trends and movers in parallel
        const [trendsData, moversData] = await Promise.all([
          marketDataService.getMarketTrends(),
          marketDataService.getAllMarketMovers(20)
        ]);
        
        setMarketTrends(trendsData);
        setMarketMovers(moversData);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError('Failed to load market data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMarketData();
  }, []);
  
  const handleRetry = () => {
    // Reset state and trigger a re-fetch
    setLoading(true);
    setError(null);
    window.location.reload();
  };
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Daily Market Movers</h1>
          <p className="text-muted-foreground">
            Top performing stocks in the market today
          </p>
        </div>
        
        <MotionContainer animation="slide-in-up" delay={100}>
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading market data...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={handleRetry}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <MarketTrends trends={marketTrends} />
              <StockList 
                gainers={marketMovers.gainers} 
                losers={marketMovers.losers} 
                mostActive={marketMovers.mostActive} 
              />
            </div>
          )}
        </MotionContainer>
      </main>
    </div>
  );
};

export default MarketMovers;
