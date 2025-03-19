import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import watchlistService from '@/services/watchlistService';

// Mock data for watchlists
const MOCK_WATCHLISTS = [
  {
    id: 'tech-leaders',
    name: "Tech Leaders",
    description: "Top technology companies with strong growth potential",
    stocks: ['AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN'],
    sector: 'Technology',
    recommendations: [
      { symbol: 'NVDA', reason: 'Leading AI chip manufacturer with strong growth potential' },
      { symbol: 'AMD', reason: 'Expanding market share in high-performance computing' },
      { symbol: 'AVGO', reason: 'Diversified semiconductor business with strong AI infrastructure presence' }
    ],
    diversification: {
      analysis: 'Your portfolio is heavily concentrated in the Technology sector. Consider adding stocks from other sectors like Healthcare or Consumer Staples for better diversification.',
      sectorBreakdown: [
        { sector: 'Technology', percentage: 80 },
        { sector: 'Communication', percentage: 15 },
        { sector: 'Consumer Cyclical', percentage: 5 }
      ]
    }
  },
  {
    id: 'dividend-champions',
    name: "Dividend Champions",
    description: "Stable companies with strong dividend history",
    stocks: ['JNJ', 'PG', 'KO', 'XOM', 'VZ', 'PFE'],
    sector: 'Financial',
    recommendations: [
      { symbol: 'V', reason: 'Global payments leader with strong cash flow and dividend growth' },
      { symbol: 'JPM', reason: 'Well-managed bank with diverse revenue streams' },
      { symbol: 'BLK', reason: 'Asset management giant benefiting from passive investing trends' }
    ],
    diversification: {
      analysis: 'Your portfolio has good sector diversification across Consumer Staples, Healthcare, and Energy. Consider adding some Technology exposure for growth potential.',
      sectorBreakdown: [
        { sector: 'Consumer Staples', percentage: 35 },
        { sector: 'Healthcare', percentage: 30 },
        { sector: 'Energy', percentage: 20 },
        { sector: 'Communication', percentage: 15 }
      ]
    }
  }
];

export function MockWatchlistCard() {
  const [selectedWatchlist, setSelectedWatchlist] = useState(MOCK_WATCHLISTS[0].id);
  const [loading, setLoading] = useState(false);
  const [addingStock, setAddingStock] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const watchlist = MOCK_WATCHLISTS.find(w => w.id === selectedWatchlist) || MOCK_WATCHLISTS[0];

  const handleAddStock = async (symbol: string) => {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI-Powered Watchlists</CardTitle>
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
      <CardHeader>
        <CardTitle className="text-lg">AI-Powered Watchlists</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={selectedWatchlist} onValueChange={setSelectedWatchlist}>
          <TabsList className="mb-4">
            {MOCK_WATCHLISTS.map(list => (
              <TabsTrigger key={list.id} value={list.id}>{list.name}</TabsTrigger>
            ))}
          </TabsList>
          
          {MOCK_WATCHLISTS.map(list => (
            <TabsContent key={list.id} value={list.id}>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{list.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {list.stocks.map(symbol => (
                      <Badge key={symbol} variant="secondary" className="cursor-pointer" onClick={() => handleViewDetails(symbol)}>
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Diversification Analysis */}
                <div className="border rounded-md p-3 bg-muted/30">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-1 text-primary" />
                    Diversification Analysis
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {list.diversification.analysis}
                  </p>
                  
                  {/* Sector Breakdown */}
                  <div className="flex flex-wrap gap-2">
                    {list.diversification.sectorBreakdown.map((sector) => (
                      <Badge key={sector.sector} variant="outline">
                        {sector.sector}: {sector.percentage}%
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Companies in Watchlist - Expanded Section */}
                <div className="border rounded-md p-3 bg-card">
                  <h3 className="text-sm font-medium mb-3">Companies in Watchlist</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {list.stocks.map(symbol => (
                      <div key={symbol} className="p-2 border rounded-md flex justify-between items-center">
                        <div>
                          <div className="font-medium">{symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {symbol === 'AAPL' ? 'Apple Inc.' : 
                             symbol === 'MSFT' ? 'Microsoft Corp.' : 
                             symbol === 'GOOGL' ? 'Alphabet Inc.' : 
                             symbol === 'META' ? 'Meta Platforms' : 
                             symbol === 'AMZN' ? 'Amazon.com Inc.' : 
                             symbol === 'JNJ' ? 'Johnson & Johnson' : 
                             symbol === 'PG' ? 'Procter & Gamble' : 
                             symbol === 'KO' ? 'Coca-Cola Co.' : 
                             symbol === 'XOM' ? 'Exxon Mobil Corp.' : 
                             symbol === 'VZ' ? 'Verizon Comm.' : 
                             symbol === 'PFE' ? 'Pfizer Inc.' : 'Company'}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(symbol)}
                        >
                          Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Recommended Stocks - Smaller Section */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1 text-primary" />
                    AI Recommendations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {list.recommendations.map((rec) => (
                      <div 
                        key={rec.symbol} 
                        className="relative group"
                      >
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer flex items-center gap-1 hover:bg-secondary"
                          onClick={() => handleAddStock(rec.symbol)}
                        >
                          <PlusCircle className="h-3 w-3" />
                          {rec.symbol}
                        </Badge>
                        <div className="absolute z-10 invisible group-hover:visible bg-popover text-popover-foreground p-2 rounded-md shadow-md text-xs w-48 mt-1">
                          {rec.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default MockWatchlistCard;
