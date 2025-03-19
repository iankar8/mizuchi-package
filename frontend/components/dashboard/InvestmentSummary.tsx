
import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import MotionContainer from "../ui/MotionContainer";
import { cn } from "@/lib/utils";
import ErrorBoundary from "../error/ErrorBoundary";
import { investmentSummary } from "@/lib/mockData";
import fmpService from "@/services/fmpService";
import { useToast } from "@/hooks/use-toast";

const SummaryItem = ({ 
  label, 
  value, 
  isPercentage = false,
  isPrimary = false
}: { 
  label: string; 
  value: number; 
  isPercentage?: boolean;
  isPrimary?: boolean;
}) => {
  const isPositive = value >= 0;
  
  return (
    <div className={cn(
      "p-4 rounded-lg border border-border",
      isPrimary ? "bg-primary/10" : "bg-card"
    )}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className={cn(
        "flex items-center text-lg font-medium",
        isPercentage ? (isPositive ? "text-green-600" : "text-red-600") : ""
      )}>
        {isPercentage && (
          <>
            {isPositive ? (
              <ArrowUpRight size={18} className="mr-1" />
            ) : (
              <ArrowDownRight size={18} className="mr-1" />
            )}
          </>
        )}
        <span>
          {!isPercentage && "$"}
          {isPositive && isPercentage ? "+" : ""}
          {value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
          {isPercentage && "%"}
        </span>
      </div>
    </div>
  );
};

// We'll eventually replace this with real portfolio data 
// when portfolio functionality is implemented
const InvestmentSummary = () => {
  const [summaryData, setSummaryData] = useState(investmentSummary);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // In a future implementation, this would fetch real portfolio data
    // For now, we'll use the mock data and simulate a refresh
    const refreshSummary = async () => {
      setIsLoading(true);
      try {
        // This is where real portfolio calculation would happen
        // using fmpService to get current prices
        console.log("Refreshing investment summary data");
        
        // For now, we'll just use the mock data with a slight random variation
        // to simulate real-time changes
        setSummaryData({
          ...investmentSummary,
          dailyChange: investmentSummary.dailyChange * (1 + (Math.random() * 0.1 - 0.05)),
          dailyChangePercent: investmentSummary.dailyChangePercent * (1 + (Math.random() * 0.1 - 0.05))
        });
      } catch (error) {
        console.error("Error refreshing investment summary:", error);
        toast({
          title: "Error",
          description: "Could not refresh investment data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    refreshSummary();
    
    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      refreshSummary();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [toast]);
  
  const {
    totalValue,
    dailyChange,
    dailyChangePercent,
    totalGainLoss,
    totalGainLossPercent
  } = summaryData;
  
  return (
    <ErrorBoundary>
      <MotionContainer animation="slide-in-up" delay={200}>
        <div className="bg-card rounded-xl shadow-sm border border-border p-5">
          <div className="mb-5">
            <h3 className="text-lg font-medium">Investment Summary</h3>
            <p className="text-sm text-muted-foreground">
              Portfolio performance overview
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 sm:col-span-1 md:col-span-1 lg:col-span-1">
              <p className="text-sm text-primary mb-1">Portfolio Value</p>
              <div className="flex items-center text-2xl font-semibold text-foreground">
                <span>${totalValue.toLocaleString('en-US')}</span>
              </div>
            </div>
            
            <SummaryItem 
              label="Daily Change" 
              value={dailyChange} 
            />
            
            <SummaryItem 
              label="Daily Change %" 
              value={dailyChangePercent} 
              isPercentage 
            />
            
            <SummaryItem 
              label="Total Gain/Loss" 
              value={totalGainLoss} 
            />
            
            <SummaryItem 
              label="Total Return %" 
              value={totalGainLossPercent} 
              isPercentage 
            />
          </div>
        </div>
      </MotionContainer>
    </ErrorBoundary>
  );
};

export default InvestmentSummary;
