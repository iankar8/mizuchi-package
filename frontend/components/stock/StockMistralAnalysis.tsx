import { useEffect, useState } from "react";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface StockMistralAnalysisProps {
  symbol: string;
  name: string;
}

type AnalysisData = {
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  keyPoints: string[];
  riskFactors: string[];
  technicalIndicators: {
    indicator: string;
    value: string;
    signal: "buy" | "sell" | "neutral";
  }[];
  recommendation: string;
};

const StockMistralAnalysis = ({ symbol, name }: StockMistralAnalysisProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  
  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real implementation, we would fetch analysis from Mistral API
        // For now, we'll simulate this with a timeout and mock data
        setTimeout(() => {
          // Mock analysis data for demonstration
          const mockData: AnalysisData = {
            summary: `Based on current market conditions and company fundamentals, ${name} (${symbol}) shows promising growth potential with some notable risks to consider.`,
            sentiment: "bullish",
            keyPoints: [
              "Strong revenue growth trajectory over the past 4 quarters",
              "Expanding market share in core business segments",
              "Recent product launches have been well-received by the market",
              "Management has demonstrated effective cost control measures"
            ],
            riskFactors: [
              "Increasing competition in key markets",
              "Potential regulatory challenges on the horizon",
              "Supply chain constraints may impact short-term performance",
              "Valuation appears stretched relative to industry peers"
            ],
            technicalIndicators: [
              { indicator: "Moving Average (50-day)", value: "Above", signal: "buy" },
              { indicator: "RSI (14-day)", value: "62", signal: "neutral" },
              { indicator: "MACD", value: "Positive crossover", signal: "buy" },
              { indicator: "Bollinger Bands", value: "Upper band test", signal: "neutral" }
            ],
            recommendation: `${symbol} presents a favorable risk-reward profile for investors with a medium to long-term horizon. Consider establishing a position with proper risk management, potentially using a dollar-cost averaging approach to mitigate short-term volatility.`
          };
          
          setAnalysisData(mockData);
          setLoading(false);
        }, 2000);
        
      } catch (err) {
        console.error(`Error fetching analysis data for ${symbol}:`, err);
        setError(`Failed to load AI analysis for ${symbol}. Please try again later.`);
        setLoading(false);
      }
    };
    
    fetchAnalysisData();
  }, [symbol, name]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Generating AI analysis...</p>
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
  
  if (!analysisData) return null;
  
  return (
    <div>
      <div className="mb-6">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${
          analysisData.sentiment === "bullish" 
            ? "bg-green-50 text-green-700" 
            : analysisData.sentiment === "bearish"
              ? "bg-red-50 text-red-700"
              : "bg-yellow-50 text-yellow-700"
        }`}>
          {analysisData.sentiment === "bullish" ? (
            <TrendingUp size={16} className="mr-2" />
          ) : analysisData.sentiment === "bearish" ? (
            <TrendingDown size={16} className="mr-2" />
          ) : (
            <BarChart3 size={16} className="mr-2" />
          )}
          <span className="capitalize">{analysisData.sentiment} Outlook</span>
        </div>
        
        <p className="text-lg">{analysisData.summary}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Key Strengths</h3>
          <ul className="space-y-2">
            {analysisData.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <TrendingUp size={16} className="text-green-600 mr-2 mt-1 flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Risk Factors</h3>
          <ul className="space-y-2">
            {analysisData.riskFactors.map((risk, index) => (
              <li key={index} className="flex items-start">
                <AlertCircle size={16} className="text-amber-600 mr-2 mt-1 flex-shrink-0" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Technical Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Indicator
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Signal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {analysisData.technicalIndicators.map((indicator, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-background/50' : 'bg-white'}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    {indicator.indicator}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {indicator.value}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      indicator.signal === "buy" 
                        ? "bg-green-100 text-green-800" 
                        : indicator.signal === "sell"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                    }`}>
                      {indicator.signal.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mb-6">
        <h3 className="text-lg font-medium mb-2">Recommendation</h3>
        <p>{analysisData.recommendation}</p>
      </div>
      
      <div className="text-xs text-muted-foreground flex items-center justify-between">
        <p>Analysis generated by AI using Mistral. Last updated: {new Date().toLocaleDateString()}</p>
        <p className="italic">This analysis is for informational purposes only and should not be considered financial advice.</p>
      </div>
    </div>
  );
};

export default StockMistralAnalysis;
