import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface StockPerplexityInfoProps {
  symbol: string;
  name: string;
}

const StockPerplexityInfo = ({ symbol, name }: StockPerplexityInfoProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [perplexityData, setPerplexityData] = useState<string>("");
  
  useEffect(() => {
    const fetchPerplexityData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real implementation, we would fetch data from Perplexity API
        // For now, we'll simulate this with a timeout and mock data
        setTimeout(() => {
          // Mock Perplexity data for demonstration
          const mockData = `
## ${name} (${symbol}) - Company Overview

${name} is a leading company in the technology sector, specializing in innovative solutions for cloud computing, artificial intelligence, and data analytics. Founded in 2005, the company has grown to become a significant player in the global tech landscape.

### Business Model
The company generates revenue primarily through subscription-based services, hardware sales, and enterprise solutions. Their cloud platform serves millions of customers worldwide, ranging from small businesses to Fortune 500 companies.

### Recent Developments
- Recently announced a strategic partnership with major cloud providers to enhance their service offerings
- Launched a new AI-powered analytics platform in Q1 2024
- Expanded operations into emerging markets in Southeast Asia
- Completed acquisition of a smaller competitor to strengthen their market position

### Competitive Landscape
The company faces competition from other major tech giants but maintains a competitive edge through their specialized offerings and strong customer relationships. Their focus on innovation and R&D investment has allowed them to stay ahead in rapidly evolving market segments.

### Future Outlook
Analysts generally maintain a positive outlook for ${symbol}, citing strong fundamentals, innovative product pipeline, and expanding market opportunities. The company is well-positioned to capitalize on growing demand for cloud services and AI solutions.
          `;
          
          setPerplexityData(mockData);
          setLoading(false);
        }, 1500);
        
      } catch (err) {
        console.error(`Error fetching Perplexity data for ${symbol}:`, err);
        setError(`Failed to load Perplexity information for ${symbol}. Please try again later.`);
        setLoading(false);
      }
    };
    
    fetchPerplexityData();
  }, [symbol, name]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading Perplexity information...</p>
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
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: perplexityData.replace(/\n/g, '<br/>') }} />
      
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Information provided by Perplexity. Last updated: {new Date().toLocaleDateString()}
        </p>
        <a 
          href={`https://www.perplexity.ai/search?q=${encodeURIComponent(`${name} ${symbol} stock company information`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          View on Perplexity
        </a>
      </div>
    </div>
  );
};

export default StockPerplexityInfo;
