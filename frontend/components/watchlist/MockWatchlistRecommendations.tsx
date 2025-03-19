import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import watchlistService from '@/services/watchlistService';

interface MockWatchlistRecommendationsProps {
  watchlistId?: string;
  sector?: string;
}

// Mock data for recommendations by sector
const SECTOR_RECOMMENDATIONS: Record<string, Array<{ symbol: string; reason: string }>> = {
  'Technology': [
    { symbol: 'NVDA', reason: 'Leading AI chip manufacturer with strong growth potential' },
    { symbol: 'AMD', reason: 'Expanding market share in high-performance computing' },
    { symbol: 'AVGO', reason: 'Diversified semiconductor business with strong AI infrastructure presence' }
  ],
  'Financial': [
    { symbol: 'V', reason: 'Global payments leader with strong cash flow and dividend growth' },
    { symbol: 'JPM', reason: 'Well-managed bank with diverse revenue streams' },
    { symbol: 'BLK', reason: 'Asset management giant benefiting from passive investing trends' }
  ],
  'Healthcare': [
    { symbol: 'UNH', reason: 'Healthcare services leader with strong margins and growth' },
    { symbol: 'JNJ', reason: 'Diversified healthcare giant with stable dividend growth' },
    { symbol: 'ABBV', reason: 'Pharmaceutical company with strong pipeline and dividend' }
  ],
  'Consumer': [
    { symbol: 'AMZN', reason: 'E-commerce and cloud computing leader with diverse revenue streams' },
    { symbol: 'COST', reason: 'Warehouse retailer with loyal customer base and consistent growth' },
    { symbol: 'MCD', reason: 'Global fast food leader with strong brand and dividend history' }
  ],
  'Energy': [
    { symbol: 'XOM', reason: 'Integrated energy company with strong dividend history' },
    { symbol: 'CVX', reason: 'Well-managed oil major with balanced portfolio' },
    { symbol: 'NEE', reason: 'Renewable energy leader with regulated utility business' }
  ],
  'default': [
    { symbol: 'AAPL', reason: 'Technology leader with strong ecosystem and cash flow' },
    { symbol: 'MSFT', reason: 'Cloud computing and software giant with diversified revenue' },
    { symbol: 'GOOGL', reason: 'Digital advertising leader with strong AI capabilities' }
  ]
};

// Diversification insights based on sector concentration
const DIVERSIFICATION_INSIGHTS: Record<string, string> = {
  'Technology': 'Your portfolio is heavily concentrated in the Technology sector. Consider adding stocks from other sectors like Healthcare or Consumer Staples for better diversification.',
  'Financial': 'Your portfolio has significant exposure to Financial stocks. Consider adding Technology or Healthcare stocks to balance sector risk.',
  'Healthcare': 'Your portfolio has good exposure to Healthcare. Consider adding Technology or Consumer stocks to complement your defensive positions.',
  'Consumer': 'Your portfolio has strong consumer sector representation. Consider adding Technology or Financial stocks for growth potential.',
  'Energy': 'Your portfolio has significant energy exposure. Consider adding Technology or Healthcare stocks to reduce commodity price sensitivity.',
  'default': 'Consider diversifying your portfolio across different sectors to reduce risk. A balanced portfolio typically includes exposure to Technology, Healthcare, Financial, Consumer, and Energy sectors.'
};

export function MockWatchlistRecommendations({ watchlistId, sector = 'default' }: MockWatchlistRecommendationsProps) {
  const [addingStock, setAddingStock] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const recommendations = SECTOR_RECOMMENDATIONS[sector] || SECTOR_RECOMMENDATIONS['default'];
  const diversificationAnalysis = DIVERSIFICATION_INSIGHTS[sector] || DIVERSIFICATION_INSIGHTS['default'];

  const handleAddStock = async (symbol: string) => {
    if (!watchlistId) {
      toast({
        title: "No watchlist selected",
        description: "Please select a watchlist to add stocks to",
        variant: "destructive"
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add stocks to your watchlist",
        variant: "destructive"
      });
      return;
    }
    
    setAddingStock(symbol);
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
    } catch (error) {
      console.error(`Error adding ${symbol} to watchlist:`, error);
      toast({
        title: "Failed to add stock",
        description: `Could not add ${symbol} to your watchlist.`,
        variant: "destructive"
      });
    } finally {
      setAddingStock(null);
    }
  };

  const handleViewDetails = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Diversification Analysis */}
          <div className="border rounded-md p-3 bg-muted/30">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <BarChart3 className="h-4 w-4 mr-1 text-primary" />
              Diversification Analysis
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {diversificationAnalysis}
            </p>
          </div>
          
          {/* Recommended Stocks */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1 text-primary" />
              AI Recommendations
            </h3>
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
                    {watchlistId && (
                      <Button 
                        size="sm"
                        onClick={() => handleAddStock(rec.symbol)}
                        disabled={addingStock === rec.symbol}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        {addingStock === rec.symbol ? 'Adding...' : 'Add'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MockWatchlistRecommendations;
