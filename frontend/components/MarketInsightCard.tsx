import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowUpIcon, ArrowDownIcon, BarChart3Icon, LineChartIcon, PieChartIcon, RefreshCwIcon } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import insightService, { InsightResponse } from '@/services/insightService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface MarketInsightCardProps {
  type: 'market-index' | 'sector-performance' | 'stock';
  symbol?: string;
  title: string;
  description?: string;
}

const MarketInsightCard: React.FC<MarketInsightCardProps> = ({ 
  type, 
  symbol = '^DJI', // Default to Dow Jones
  title,
  description
}) => {
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let result: InsightResponse;
      
      if (type === 'market-index' && symbol) {
        result = await insightService.getMarketIndexInsights(symbol);
      } else if (type === 'sector-performance') {
        result = await insightService.getSectorPerformanceInsights();
      } else if (type === 'stock' && symbol) {
        result = await insightService.getStockInsights(symbol);
      } else {
        throw new Error('Invalid insight type or missing symbol');
      }
      
      setInsights(result);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('Failed to generate insights. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [type, symbol]);

  const renderChart = () => {
    if (!insights || !insights.visualizationRecommendation) return null;
    
    const { type: chartType, dataPoints, config } = insights.visualizationRecommendation;
    
    // If we have dataPoints from the LLM, use them
    // Otherwise, we'll need to create mock data for demonstration
    const labels = dataPoints?.map(dp => dp.label) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = dataPoints?.map(dp => dp.value) || [12, 19, 3, 5, 2, 3];
    const colors = dataPoints?.map(dp => dp.color) || [
      'rgba(255, 99, 132, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 159, 64, 0.6)'
    ];
    
    const chartData = {
      labels,
      datasets: [
        {
          label: insights.visualizationRecommendation.title,
          data,
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.6', '1')),
          borderWidth: 1,
        },
      ],
    };
    
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: insights.visualizationRecommendation.title,
        },
      },
      ...(config || {}),
    };
    
    switch (chartType) {
      case 'line':
        return <Line data={chartData} options={chartOptions} />;
      case 'bar':
        return <Bar data={chartData} options={chartOptions} />;
      case 'pie':
        return <Pie data={chartData} options={chartOptions} />;
      default:
        return <Line data={chartData} options={chartOptions} />;
    }
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchInsights} 
            disabled={loading}
          >
            <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500">{error}</div>
        ) : insights ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4 pt-4">
              <p className="text-sm">{insights.summary}</p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Key Trends</h4>
                <ul className="space-y-1">
                  {insights.trends.map((trend, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      {trend.includes('increase') || trend.includes('up') ? (
                        <ArrowUpIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : trend.includes('decrease') || trend.includes('down') ? (
                        <ArrowDownIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span>{trend}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="visualization" className="pt-4">
              <div className="h-[300px] w-full">
                {renderChart()}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {insights.visualizationRecommendation.description}
              </p>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4 pt-4">
              <h4 className="text-sm font-medium">Actionable Insights</h4>
              <ul className="space-y-2">
                {insights.actionableInsights.map((insight, i) => (
                  <li key={i} className="text-sm bg-muted p-3 rounded-md">{insight}</li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
      
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          {type === 'market-index' && <LineChartIcon className="h-3 w-3" />}
          {type === 'sector-performance' && <PieChartIcon className="h-3 w-3" />}
          {type === 'stock' && <BarChart3Icon className="h-3 w-3" />}
          <span>{type.replace('-', ' ')}</span>
        </div>
        {symbol && <Badge variant="outline" className="text-xs">{symbol}</Badge>}
      </CardFooter>
    </Card>
  );
};

export default MarketInsightCard;
