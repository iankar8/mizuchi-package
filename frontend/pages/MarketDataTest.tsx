import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import marketDataService from '@/services/marketDataService';
import { MarketIndex, MarketTrend, NewsItem, StockData } from '@/types/market';

/**
 * Market Data Test Page
 * 
 * This page is used to test the FMP API integration via the marketDataService
 */
export default function MarketDataTest() {
  // State for various data types
  const [stockQuote, setStockQuote] = useState<StockData | null>(null);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string>('AAPL');

  // Fetch stock quote
  const handleGetStockQuote = async () => {
    setLoading('quote');
    try {
      const data = await marketDataService.getStockQuote(symbol);
      setStockQuote(data);
    } catch (error) {
      console.error('Error fetching stock quote:', error);
    }
    setLoading(null);
  };

  // Fetch market indices
  const handleGetMarketIndices = async () => {
    setLoading('indices');
    try {
      const data = await marketDataService.getMarketIndices();
      setMarketIndices(data);
    } catch (error) {
      console.error('Error fetching market indices:', error);
    }
    setLoading(null);
  };

  // Fetch market trends
  const handleGetMarketTrends = async () => {
    setLoading('trends');
    try {
      const data = await marketDataService.getMarketTrends();
      setMarketTrends(data);
    } catch (error) {
      console.error('Error fetching market trends:', error);
    }
    setLoading(null);
  };

  // Fetch financial news
  const handleGetNews = async () => {
    setLoading('news');
    try {
      const data = await marketDataService.getFinancialNews(5);
      setNews(data);
    } catch (error) {
      console.error('Error fetching news:', error);
    }
    setLoading(null);
  };

  // Fetch stock recommendations
  const handleGetRecommendations = async () => {
    setLoading('recommendations');
    try {
      const data = await marketDataService.getStockRecommendations(5);
      setRecommendations(data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
    setLoading(null);
  };

  // Fetch historical data
  const handleGetHistoricalData = async () => {
    setLoading('historical');
    try {
      const data = await marketDataService.getHistoricalData(symbol, 'daily', 10);
      setHistoricalData(data);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
    setLoading(null);
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Market Data API Test</h1>
      <p className="text-muted-foreground mb-8">
        This page tests the FMP API integration via the marketDataService
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Stock Data</CardTitle>
            <CardDescription>
              Enter a stock symbol to fetch data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="px-3 py-2 border rounded-md w-24"
                placeholder="Symbol"
              />
              <Button 
                onClick={handleGetStockQuote}
                disabled={loading === 'quote'}
              >
                {loading === 'quote' ? 'Loading...' : 'Get Quote'}
              </Button>
            </div>

            {stockQuote && (
              <div className="border rounded-md p-4">
                <h3 className="font-medium">{stockQuote.name} ({stockQuote.symbol})</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium">${stockQuote.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Change</p>
                    <p className={`font-medium ${stockQuote.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stockQuote.change.toFixed(2)} ({(stockQuote.change / (stockQuote.price - stockQuote.change) * 100).toFixed(2)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Volume</p>
                    <p className="font-medium">{stockQuote.volume.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Market Cap</p>
                    <p className="font-medium">${(stockQuote.marketCap / 1000000000).toFixed(2)}B</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleGetHistoricalData} disabled={loading === 'historical'}>
              {loading === 'historical' ? 'Loading...' : 'Get Historical Data'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Indices</CardTitle>
            <CardDescription>
              Major market indices data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGetMarketIndices}
              disabled={loading === 'indices'}
              className="mb-4"
            >
              {loading === 'indices' ? 'Loading...' : 'Get Market Indices'}
            </Button>

            {marketIndices.length > 0 && (
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  {marketIndices.map((index, i) => (
                    <div key={index.symbol} className={i > 0 ? 'mt-3 pt-3 border-t' : ''}>
                      <h3 className="font-medium">{index.name}</h3>
                      <div className="flex justify-between mt-1">
                        <p className="font-medium">${index.price.toLocaleString()}</p>
                        <p className={`font-medium ${index.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.changePercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Combined Market Performance</h3>
                  <div className="h-64 relative">
                    {/* This is a placeholder for the chart - in a real implementation, you would use Chart.js or another library */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">Chart implementation coming soon</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between">
                      <button className="px-2 py-1 text-xs bg-muted rounded">1D</button>
                      <button className="px-2 py-1 text-xs bg-muted rounded">1W</button>
                      <button className="px-2 py-1 text-xs bg-muted rounded">1M</button>
                      <button className="px-2 py-1 text-xs bg-muted rounded">YTD</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleGetMarketTrends} disabled={loading === 'trends'}>
              {loading === 'trends' ? 'Loading...' : 'Get Market Trends'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="news" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="trends">Market Trends</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="historical">Historical Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="news" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial News</CardTitle>
              <CardDescription>Latest financial news from FMP API</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGetNews}
                disabled={loading === 'news'}
                className="mb-4"
              >
                {loading === 'news' ? 'Loading...' : 'Get Latest News'}
              </Button>

              {news.length > 0 && (
                <div className="space-y-4">
                  {news.map((item, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{item.title}</h3>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm mt-2">{item.summary.substring(0, 150)}...</p>
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                        {item.tickers && (
                          <div className="flex gap-1">
                            {item.tickers.slice(0, 3).map(ticker => (
                              <span key={ticker} className="text-xs bg-muted px-1 rounded">
                                {ticker}
                              </span>
                            ))}
                            {item.tickers.length > 3 && (
                              <span className="text-xs bg-muted px-1 rounded">
                                +{item.tickers.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Trends</CardTitle>
              <CardDescription>Sector performance data</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGetMarketTrends}
                disabled={loading === 'trends'}
                className="mb-4"
              >
                {loading === 'trends' ? 'Loading...' : 'Get Market Trends'}
              </Button>

              {marketTrends.length > 0 && (
                <div className="space-y-3">
                  {marketTrends.map((trend, index) => (
                    <div key={index} className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{trend.sector}</h3>
                        <span className={`font-medium ${trend.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                          {trend.trend === 'up' ? '+' : '-'}{trend.percentage.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{trend.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommendations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Recommendations</CardTitle>
              <CardDescription>Analyst recommendations for stocks</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGetRecommendations}
                disabled={loading === 'recommendations'}
                className="mb-4"
              >
                {loading === 'recommendations' ? 'Loading...' : 'Get Recommendations'}
              </Button>

              {recommendations.length > 0 && (
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{rec.name} ({rec.symbol})</h3>
                        <span className={`font-medium ${
                          rec.recommendation === 'BUY' || rec.recommendation === 'STRONG_BUY' 
                            ? 'text-green-600' 
                            : rec.recommendation === 'SELL' || rec.recommendation === 'STRONG_SELL'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                        }`}>
                          {rec.recommendation.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Score: {rec.score.toFixed(2)} / 5
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="historical" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Data</CardTitle>
              <CardDescription>Historical price data for {symbol}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="px-3 py-2 border rounded-md w-24"
                  placeholder="Symbol"
                />
                <Button 
                  onClick={handleGetHistoricalData}
                  disabled={loading === 'historical'}
                >
                  {loading === 'historical' ? 'Loading...' : 'Get Historical Data'}
                </Button>
              </div>

              {historicalData.length > 0 && (
                <div className="border rounded-md p-4">
                  <ScrollArea className="h-64">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-right p-2">Open</th>
                          <th className="text-right p-2">High</th>
                          <th className="text-right p-2">Low</th>
                          <th className="text-right p-2">Close</th>
                          <th className="text-right p-2">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {historicalData.map((data, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                            <td className="p-2">{data.date}</td>
                            <td className="text-right p-2">{data.open.toFixed(2)}</td>
                            <td className="text-right p-2">{data.high.toFixed(2)}</td>
                            <td className="text-right p-2">{data.low.toFixed(2)}</td>
                            <td className="text-right p-2">{data.close.toFixed(2)}</td>
                            <td className="text-right p-2">{data.volume.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
