
import { useState } from "react";
import { Watchlist, WatchlistItem } from "@/types/supabase";
import WatchlistActions from "../WatchlistActions";
import WatchlistToolbar from "../WatchlistToolbar";
import StockTable from "../StockTable";
import { useWatchlistCollaboratorsCount } from "@/hooks/use-watchlist-collaborators-count";
import { AiWatchlistInsights } from "../AiWatchlistInsights";
import { WatchlistActivityFeed } from "../WatchlistActivityFeed";
import { WatchlistRecommendations } from "../WatchlistRecommendations";
import { StockResearchPanel } from "@/components/stocks/StockResearchPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export interface WatchlistDetailsProps {
  currentWatchlist: Watchlist;
  watchlistItems: WatchlistItem[];
  isLoadingItems: boolean;
  setIsCollaboratorDialogOpen: (isOpen: boolean) => void;
  setIsAddStockDialogOpen: (isOpen: boolean) => void;
  handleRenameWatchlist: () => void;
  handleDeleteWatchlist: () => void;
  handleRemoveStock: (itemId: string, symbol: string) => void;
}

const WatchlistDetails = ({
  currentWatchlist,
  watchlistItems,
  isLoadingItems,
  setIsCollaboratorDialogOpen,
  setIsAddStockDialogOpen,
  handleRenameWatchlist,
  handleDeleteWatchlist,
  handleRemoveStock
}: WatchlistDetailsProps) => {
  const { collaboratorsCount } = useWatchlistCollaboratorsCount(currentWatchlist.id);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  // Handle stock selection for research view
  const handleStockSelect = (symbol: string) => {
    setSelectedStock(symbol === selectedStock ? null : symbol);
  };

  return (
    <>
      <div className="p-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">{currentWatchlist.name}</h2>
        </div>
        
        <WatchlistActions 
          handleRenameWatchlist={handleRenameWatchlist}
          handleDeleteWatchlist={handleDeleteWatchlist}
          watchlistName={currentWatchlist.name}
          handleManageCollaborators={() => setIsCollaboratorDialogOpen(true)}
        />
      </div>
      
      <div className="p-6">
        <WatchlistToolbar 
          description={currentWatchlist.description}
          setIsCollaboratorDialogOpen={setIsCollaboratorDialogOpen}
          setIsAddStockDialogOpen={setIsAddStockDialogOpen}
          collaboratorsCount={collaboratorsCount}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <StockTable 
              watchlistItems={watchlistItems}
              isLoadingItems={isLoadingItems}
              handleRemoveStock={handleRemoveStock}
              setIsAddStockDialogOpen={setIsAddStockDialogOpen}
              onStockSelect={handleStockSelect}
              selectedStock={selectedStock}
            />
          </div>
          
          <div className="space-y-6">
            {selectedStock ? (
              <StockResearchPanel symbol={selectedStock} />
            ) : (
              <AiWatchlistInsights 
                watchlistId={currentWatchlist.id}
                stocks={watchlistItems.map(item => ({ 
                  symbol: item.symbol,
                  notes: item.notes
                }))}
                onResearchClick={handleStockSelect}
              />
            )}
          </div>
        </div>
        
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
            <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-4">
            <WatchlistActivityFeed watchlistId={currentWatchlist.id} />
          </TabsContent>
          <TabsContent value="recommendations" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {watchlistItems.length > 0 && watchlistItems[0] ? (
                  <WatchlistRecommendations 
                    symbol={watchlistItems[0].symbol}
                    companyName={watchlistItems[0].notes || watchlistItems[0].symbol}
                    onWatchlistCreated={() => {}} 
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Add stocks to your watchlist to get AI recommendations
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default WatchlistDetails;
