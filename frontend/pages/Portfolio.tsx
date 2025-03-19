
import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, PlusCircle, Download, Upload } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import MotionContainer from "@/components/ui/MotionContainer";
import { portfolioItems, investmentSummary } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const Portfolio = () => {
  const { toast } = useToast();
  
  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, []);
  
  const handleAddHolding = () => {
    toast({
      title: "Add Holding Feature",
      description: "This feature will be available soon.",
    });
  };
  
  const handleImport = () => {
    toast({
      title: "Import Feature",
      description: "CSV import will be available soon.",
    });
  };
  
  const handleExport = () => {
    toast({
      title: "Export Feature",
      description: "CSV export will be available soon.",
    });
  };
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Portfolio</h1>
          <p className="text-muted-foreground">
            Manage your investment portfolio
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <MotionContainer animation="slide-in-up" delay={100}>
            <div className="bg-white rounded-xl shadow-sm border border-border p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-primary mb-1">Portfolio Value</p>
                  <div className="flex items-center text-2xl font-semibold text-foreground">
                    <span>${investmentSummary.totalValue.toLocaleString('en-US')}</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <p className="text-sm text-muted-foreground mb-1">Daily Change</p>
                  <div className={cn(
                    "flex items-center text-lg font-medium",
                    investmentSummary.dailyChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {investmentSummary.dailyChange >= 0 ? (
                      <ArrowUpRight size={18} className="mr-1" />
                    ) : (
                      <ArrowDownRight size={18} className="mr-1" />
                    )}
                    <span>
                      {investmentSummary.dailyChange >= 0 ? "+" : ""}
                      ${investmentSummary.dailyChange.toFixed(2)} ({investmentSummary.dailyChangePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <p className="text-sm text-muted-foreground mb-1">Total Gain/Loss</p>
                  <div className={cn(
                    "flex items-center text-lg font-medium",
                    investmentSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {investmentSummary.totalGainLoss >= 0 ? (
                      <ArrowUpRight size={18} className="mr-1" />
                    ) : (
                      <ArrowDownRight size={18} className="mr-1" />
                    )}
                    <span>
                      {investmentSummary.totalGainLoss >= 0 ? "+" : ""}
                      ${investmentSummary.totalGainLoss.toFixed(2)} ({investmentSummary.totalGainLossPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg border border-border bg-secondary/30">
                  <button
                    onClick={handleAddHolding}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                  >
                    <PlusCircle size={16} />
                    <span>Add</span>
                  </button>
                  
                  <button
                    onClick={handleImport}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                  >
                    <Upload size={16} />
                    <span>Import</span>
                  </button>
                  
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                  >
                    <Download size={16} />
                    <span>Export</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-left font-medium text-muted-foreground text-sm">Symbol</th>
                      <th className="pb-3 text-left font-medium text-muted-foreground text-sm">Name</th>
                      <th className="pb-3 text-right font-medium text-muted-foreground text-sm">Shares</th>
                      <th className="pb-3 text-right font-medium text-muted-foreground text-sm">Avg. Cost</th>
                      <th className="pb-3 text-right font-medium text-muted-foreground text-sm">Current Price</th>
                      <th className="pb-3 text-right font-medium text-muted-foreground text-sm">Total Value</th>
                      <th className="pb-3 text-right font-medium text-muted-foreground text-sm">Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioItems.map((item) => (
                      <tr 
                        key={item.symbol} 
                        className="hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-4 text-sm font-medium">{item.symbol}</td>
                        <td className="py-4 text-sm">{item.name}</td>
                        <td className="py-4 text-sm text-right">{item.shares}</td>
                        <td className="py-4 text-sm text-right">${item.averageCost.toFixed(2)}</td>
                        <td className="py-4 text-sm text-right">${item.currentPrice.toFixed(2)}</td>
                        <td className="py-4 text-sm text-right font-medium">${item.totalValue.toFixed(2)}</td>
                        <td className={cn(
                          "py-4 text-sm text-right flex items-center justify-end",
                          item.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {item.gainLoss >= 0 ? (
                            <ArrowUpRight size={16} className="mr-1" />
                          ) : (
                            <ArrowDownRight size={16} className="mr-1" />
                          )}
                          <span>
                            {item.gainLoss >= 0 ? "+" : ""}
                            ${item.gainLoss.toFixed(2)} ({item.gainLossPercent.toFixed(2)}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </MotionContainer>
        </div>
      </main>
    </div>
  );
};

export default Portfolio;
