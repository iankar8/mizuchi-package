import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, ExternalLink, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import MotionContainer from "@/components/ui/MotionContainer";
import { StockData } from "@/types/market";
import marketDataService from "@/services/marketDataService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StockPerplexityInfo from "@/components/stock/StockPerplexityInfo";
import StockFMPData from "@/components/stock/StockFMPData";
import StockMistralAnalysis from "@/components/stock/StockMistralAnalysis";

const StockDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData | null>(null);

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
    
    if (!symbol) {
      setError("No stock symbol provided");
      setLoading(false);
      return;
    }
    
    const fetchStockData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await marketDataService.getStockQuote(symbol);
        setStockData(data);
      } catch (err) {
        console.error(`Error fetching data for ${symbol}:`, err);
        setError(`Failed to load data for ${symbol}. Please try again later.`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStockData();
  }, [symbol]);
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <button 
          onClick={handleGoBack}
          className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Market
        </button>
        
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading stock data...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm border border-border p-12 flex flex-col items-center justify-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : stockData ? (
          <MotionContainer animation="slide-in-up" delay={100}>
            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              {/* Stock Header */}
              <div className="p-6 border-b border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">{stockData.symbol}</h1>
                      <span className="text-lg text-muted-foreground">{stockData.name}</span>
                    </div>
                    <div className="mt-2 flex items-center">
                      <span className="text-3xl font-bold mr-3">${stockData.price.toFixed(2)}</span>
                      <div className={`flex items-center px-3 py-1 rounded text-sm font-medium ${
                        stockData.percentChange >= 0 
                          ? "text-green-700 bg-green-50" 
                          : "text-red-700 bg-red-50"
                      }`}>
                        {stockData.percentChange >= 0 ? (
                          <TrendingUp size={18} className="mr-1" />
                        ) : (
                          <TrendingDown size={18} className="mr-1" />
                        )}
                        <span>
                          {stockData.percentChange >= 0 ? "+" : ""}
                          ${stockData.change.toFixed(2)} ({stockData.percentChange.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  <a 
                    href={`https://finance.yahoo.com/quote/${stockData.symbol}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                  >
                    <ExternalLink size={18} className="text-muted-foreground" />
                  </a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Volume</span>
                    <span className="font-medium">
                      {stockData.volume ? (
                        stockData.volume >= 1000000 
                          ? `${(stockData.volume / 1000000).toFixed(2)}M` 
                          : `${(stockData.volume / 1000).toFixed(2)}K`
                      ) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Market Cap</span>
                    <span className="font-medium">
                      {stockData.marketCap ? (
                        stockData.marketCap >= 1000000000000 
                          ? `$${(stockData.marketCap / 1000000000000).toFixed(2)}T` 
                          : `$${(stockData.marketCap / 1000000000).toFixed(2)}B`
                      ) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">P/E Ratio</span>
                    <span className="font-medium">
                      {stockData.pe ? stockData.pe.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Tabs for different data sources */}
              <Tabs defaultValue="fmp" className="p-6">
                <TabsList className="mb-6">
                  <TabsTrigger value="fmp" className="flex items-center">
                    <BarChart3 size={16} className="mr-2" />
                    Financial Data
                  </TabsTrigger>
                  <TabsTrigger value="perplexity" className="flex items-center">
                    <ExternalLink size={16} className="mr-2" />
                    Perplexity Info
                  </TabsTrigger>
                  <TabsTrigger value="mistral" className="flex items-center">
                    <TrendingUp size={16} className="mr-2" />
                    AI Analysis
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="fmp">
                  <StockFMPData symbol={stockData.symbol} />
                </TabsContent>
                
                <TabsContent value="perplexity">
                  <StockPerplexityInfo symbol={stockData.symbol} name={stockData.name} />
                </TabsContent>
                
                <TabsContent value="mistral">
                  <StockMistralAnalysis symbol={stockData.symbol} name={stockData.name} />
                </TabsContent>
              </Tabs>
            </div>
          </MotionContainer>
        ) : null}
      </main>
    </div>
  );
};

export default StockDetail;
