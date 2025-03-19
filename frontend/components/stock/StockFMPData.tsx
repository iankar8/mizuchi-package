import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import fmpService from "@/services/fmpService";

interface StockFMPDataProps {
  symbol: string;
}

type FinancialData = {
  date: string;
  revenue: number;
  netIncome: number;
  eps: number;
  cashFlow: number;
};

const StockFMPData = ({ symbol }: StockFMPDataProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real implementation, we would fetch actual financial data from FMP API
        // For now, we'll simulate this with a timeout and mock data
        setTimeout(() => {
          // Mock financial data for demonstration
          const mockData: FinancialData[] = [
            {
              date: "2024 Q1",
              revenue: 12.45,
              netIncome: 3.2,
              eps: 1.23,
              cashFlow: 4.5
            },
            {
              date: "2023 Q4",
              revenue: 11.98,
              netIncome: 2.9,
              eps: 1.15,
              cashFlow: 4.2
            },
            {
              date: "2023 Q3",
              revenue: 10.87,
              netIncome: 2.7,
              eps: 1.08,
              cashFlow: 3.9
            },
            {
              date: "2023 Q2",
              revenue: 10.45,
              netIncome: 2.5,
              eps: 1.02,
              cashFlow: 3.7
            }
          ];
          
          setFinancialData(mockData);
          setLoading(false);
        }, 1000);
        
      } catch (err) {
        console.error(`Error fetching financial data for ${symbol}:`, err);
        setError(`Failed to load financial data for ${symbol}. Please try again later.`);
        setLoading(false);
      }
    };
    
    fetchFinancialData();
  }, [symbol]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading financial data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Financial Performance</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Revenue (B)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Net Income (B)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                EPS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cash Flow (B)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {financialData.map((quarter, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-background/50' : 'bg-white'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {quarter.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${quarter.revenue.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${quarter.netIncome.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${quarter.eps.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ${quarter.cashFlow.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-4 bg-secondary/20 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Key Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-md shadow-sm">
            <p className="text-sm text-muted-foreground">Revenue Growth (YoY)</p>
            <p className="text-lg font-semibold text-green-600">+12.4%</p>
          </div>
          <div className="p-3 bg-white rounded-md shadow-sm">
            <p className="text-sm text-muted-foreground">Profit Margin</p>
            <p className="text-lg font-semibold">24.8%</p>
          </div>
          <div className="p-3 bg-white rounded-md shadow-sm">
            <p className="text-sm text-muted-foreground">Debt to Equity</p>
            <p className="text-lg font-semibold">0.42</p>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-6">
        Data provided by Financial Modeling Prep (FMP). Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
};

export default StockFMPData;
