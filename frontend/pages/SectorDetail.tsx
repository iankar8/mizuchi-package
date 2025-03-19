import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectorStockList from '@/components/market/SectorStockList';
import marketDataService from '@/services/marketDataService';
import { StockData } from '@/types/market';

const SectorDetail = () => {
  const { sector } = useParams<{ sector: string }>();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const fetchSectorStocks = async () => {
      if (!sector) return;
      
      try {
        setLoading(true);
        const decodedSector = decodeURIComponent(sector);
        const sectorStocks = await marketDataService.getSectorStocks(decodedSector, 20);
        setStocks(sectorStocks);
        setError(false);
      } catch (err) {
        console.error('Error fetching sector stocks:', err);
        setError(true);
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSectorStocks();
  }, [sector]);
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} className="mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{sector ? decodeURIComponent(sector) : ''} Sector</h1>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Top Movers in {sector ? decodeURIComponent(sector) : ''} Sector</h2>
        <SectorStockList 
          stocks={stocks} 
          loading={loading} 
          error={error} 
          onRetry={() => {
            setLoading(true);
            const fetchData = async () => {
              try {
                if (!sector) return;
                const decodedSector = decodeURIComponent(sector);
                const sectorStocks = await marketDataService.getSectorStocks(decodedSector, 20);
                setStocks(sectorStocks);
                setError(false);
              } catch (err) {
                setError(true);
              } finally {
                setLoading(false);
              }
            };
            fetchData();
          }}
        />
      </div>
    </div>
  );
};

export default SectorDetail;
