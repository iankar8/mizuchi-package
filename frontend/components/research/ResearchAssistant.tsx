
import { useState, useEffect } from "react";
import { Search, Send, Newspaper, BarChart, FileText, Tag, ArrowRight, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MotionContainer from "../ui/MotionContainer";
import { useAuth } from "@/context/auth";
import { queryResearchAssistant, createResearchNote } from "@/services/research";
import { saveSearchQuery, getRecentSearchQueries, saveUserPreference } from "@/services/userPreferences";
import { supabase } from "@/utils/supabase/client";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";

type ResearchResult = {
  id: string;
  query: string;
  result: string;
  timestamp: Date;
  sources?: string[];
};

const sampleResults: ResearchResult[] = [
  {
    id: "1",
    query: "Analyze NVIDIA's growth potential in the AI market",
    result: "NVIDIA continues to dominate the AI chip market with its GPU technology being crucial for AI training and inference. The company is well-positioned for future growth as demand for AI computing increases across industries. Key considerations:\n\n• Market Position: NVIDIA holds approximately 80% of the AI GPU market\n• Product Innovation: The H100 and upcoming Blackwell architecture show significant performance improvements\n• Diversification: Expanding beyond hardware into software with CUDA and enterprise solutions\n• Competition: Facing new challenges from AMD, Intel, and custom chips from tech giants\n\nFinancially, NVIDIA has seen remarkable growth with revenue increasing over 100% year-over-year in recent quarters. The PE ratio remains high at 75x, reflecting investor expectations for continued growth. While concerns about valuation exist, the expanding TAM in AI computing may justify current multiples if growth trajectories continue.",
    timestamp: new Date(2023, 5, 15),
    sources: [
      "NVIDIA Quarterly Report Q1 2024",
      "Semiconductor Industry Outlook 2024",
      "AI Market Analysis by Goldman Sachs"
    ]
  },
  {
    id: "2",
    query: "Compare Treasury yields vs S&P 500 dividend yields",
    result: "Current Treasury yields vs S&P 500 dividend yields:\n\n• 10-Year Treasury Yield: 4.45%\n• S&P 500 Dividend Yield: 1.37%\n\nThis represents a significant yield gap of approximately 3.08 percentage points, which is above the historical average. This relationship is important because:\n\n1. When Treasury yields significantly exceed equity dividend yields (as they do now), bonds provide more competitive income compared to stocks\n\n2. The current yield gap suggests stocks may be relatively expensive by historical standards\n\n3. However, equities offer growth potential that fixed income doesn't provide\n\nHistorically, periods of high yield gaps have sometimes preceded market corrections, but this is not a reliable timing indicator. Investors should consider their overall portfolio goals, time horizon, and risk tolerance when evaluating the relative attractiveness of equities versus fixed income in the current environment.",
    timestamp: new Date(2023, 7, 22),
    sources: [
      "Federal Reserve Economic Data",
      "S&P Dow Jones Indices",
      "Bloomberg Terminal Data"
    ]
  }
];

const ResearchAssistant = () => {
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ResearchResult[]>(sampleResults);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Load recent searches when component mounts
  useEffect(() => {
    const loadRecentSearches = async () => {
      if (user) {
        const searches = await getRecentSearchQueries(user);
        setRecentSearches(searches);
      }
    };
    
    loadRecentSearches();
  }, [user]);
  
  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a research question.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First check if the API key is configured
      console.log("Verifying Perplexity API key before search...");
      const { data: configData, error: configError } = await supabase.functions.invoke("check-perplexity-key");
      console.log("API key check result:", configData, configError);
      
      if (configError || !configData?.configured) {
        throw new Error("Perplexity API key is not configured. Please contact your administrator.");
      }
      
      // Save the search query to user preferences
      if (user) {
        await saveSearchQuery(user, query);
        
        // Update recent searches list
        const searches = await getRecentSearchQueries(user);
        setRecentSearches(searches);
      }
      
      console.log("Sending research query:", query);
      const researchData = await queryResearchAssistant(query);
      console.log("Research data received:", researchData);
      
      const newResult: ResearchResult = {
        id: Date.now().toString(),
        query: query,
        result: researchData.result,
        timestamp: new Date(),
        sources: researchData.sources?.map((source: any) => source.title || source.link) || []
      };
      
      setResults([newResult, ...results]);
      setQuery("");
      
      // If any stock symbols were detected, save them to user preferences
      const stockSymbols = extractStockSymbols(query + " " + researchData.result);
      if (user && stockSymbols.length > 0) {
        for (const symbol of stockSymbols) {
          await saveUserPreference(user, 'stock', symbol);
        }
      }
      
      toast({
        title: "Research Complete",
        description: "Your research results are ready.",
      });
    } catch (error) {
      console.error("Research query error:", error);
      toast({
        title: "Research Error",
        description: error instanceof Error ? error.message : "Failed to complete research query",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveToNotebook = async (resultId: string) => {
    try {
      const result = results.find(r => r.id === resultId);
      if (!result) return;
      
      await createResearchNote(user, {
        title: result.query,
        content: `## Research Query\n${result.query}\n\n## Findings\n${result.result}\n\n## Sources\n${result.sources?.map(source => `- ${source}`).join('\n') || 'No sources available'}`,
        tags: ["Research", "AI Generated"],
        relatedStocks: extractStockSymbols(result.query + " " + result.result)
      });
      
      toast({
        title: "Saved to Notebook",
        description: "Research has been added to your notebook.",
      });
    } catch (error) {
      console.error("Error saving to notebook:", error);
      toast({
        title: "Save Error",
        description: "Failed to save research to notebook",
        variant: "destructive",
      });
    }
  };
  
  const extractStockSymbols = (text: string): string[] => {
    const symbolPattern = /\b[A-Z]{1,5}\b/g;
    const commonWords = new Set(["AI", "PE", "TAM", "GPU", "THE", "AND", "FOR", "WITH", "THAT"]);
    
    const matches = text.match(symbolPattern) || [];
    return [...new Set(matches)].filter(word => !commonWords.has(word));
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="relative">
          <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-20 py-4 text-base border border-border rounded-lg focus:ring-primary focus:border-primary"
            placeholder="Ask anything about stocks, markets, or financial concepts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <button
            className="absolute inset-y-2 right-2 bg-primary text-white px-4 rounded-md flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-2">Search</span>
          </button>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm font-medium text-muted-foreground mr-2">Suggested:</span>
          <button
            onClick={() => setQuery("Analyze the impact of rising interest rates on tech stocks")}
            className="text-xs px-3 py-1.5 bg-secondary/50 hover:bg-secondary/70 rounded-full text-foreground transition-colors"
          >
            Impact of rising rates on tech
          </button>
          <button
            onClick={() => setQuery("Compare TSLA, RIVN, and NIO fundamentals")}
            className="text-xs px-3 py-1.5 bg-secondary/50 hover:bg-secondary/70 rounded-full text-foreground transition-colors"
          >
            EV stock comparison
          </button>
          <button
            onClick={() => setQuery("Explain the current yield curve and its implications")}
            className="text-xs px-3 py-1.5 bg-secondary/50 hover:bg-secondary/70 rounded-full text-foreground transition-colors"
          >
            Yield curve analysis
          </button>
          
          {recentSearches.length > 0 && (
            <Popover>
              <PopoverTrigger className="text-xs px-3 py-1.5 bg-secondary/50 hover:bg-secondary/70 rounded-full text-foreground transition-colors flex items-center gap-1">
                <Clock size={12} />
                <span>Recent Searches</span>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <h3 className="text-sm font-medium mb-2">Recent Searches</h3>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      className="w-full text-left text-sm p-2 hover:bg-secondary rounded-md transition-colors"
                      onClick={() => {
                        setQuery(search);
                        // Ensure the popover closes
                        document.body.click();
                      }}
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4">Research Results</h3>
        
        {results.length > 0 ? (
          <div className="space-y-6">
            {results.map((result) => (
              <MotionContainer key={result.id} animation="slide-in-up" delay={100} className="bg-card border border-border rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-primary">{result.query}</h4>
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp.toLocaleDateString()}
                  </span>
                </div>
                
                <div className="whitespace-pre-line text-sm mb-4">
                  {result.result}
                </div>
                
                {result.sources && result.sources.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2 flex items-center">
                      <Newspaper size={14} className="mr-1" />
                      Sources
                    </h5>
                    <div className="space-y-1 pl-5">
                      {result.sources.map((source, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          • {source}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                  <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                      <BarChart size={14} />
                      <span>View Data</span>
                    </button>
                    <button className="text-xs px-2 py-1 flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                      <Tag size={14} />
                      <span>Tag</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleSaveToNotebook(result.id)}
                    className="text-xs px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors flex items-center"
                  >
                    <FileText size={14} className="mr-1" />
                    <span>Save to Notebook</span>
                    <ArrowRight size={14} className="ml-1" />
                  </button>
                </div>
              </MotionContainer>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">
              Your research results will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchAssistant;
