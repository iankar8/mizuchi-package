import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWatchlistCreateForm } from "@/hooks/use-watchlist-create-form";

interface CreateWatchlistWithStocksDialogProps {
  handleCreateWatchlist: (name: string, description: string, symbols: string[]) => Promise<any>;
  setIsDialogOpen: (isOpen: boolean) => void;
}

const CreateWatchlistWithStocksDialog = ({ 
  handleCreateWatchlist, 
  setIsDialogOpen 
}: CreateWatchlistWithStocksDialogProps) => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbolInput, setSymbolInput] = useState("");
  const { toast } = useToast();
  
  const {
    name,
    description,
    handleNameChange,
    handleDescriptionChange,
    isValid,
    handleCancel,
    handleSubmit
  } = useWatchlistCreateForm(
    () => setIsDialogOpen(false),
    () => setIsDialogOpen(false)
  );

  const handleAddSymbol = () => {
    const cleanedSymbol = symbolInput.trim().toUpperCase();
    
    if (!cleanedSymbol) return;
    
    if (symbols.includes(cleanedSymbol)) {
      toast({
        title: "Symbol already added",
        description: `${cleanedSymbol} is already in your list.`,
        variant: "default",
      });
      return;
    }
    
    setSymbols([...symbols, cleanedSymbol]);
    setSymbolInput("");
  };

  const handleRemoveSymbol = (symbol: string) => {
    setSymbols(symbols.filter(s => s !== symbol));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && symbolInput.trim()) {
      e.preventDefault();
      handleAddSymbol();
    }
  };

  const extendedSubmit = async (baseHandler: (name: string, description: string) => Promise<any>) => {
    return baseHandler(name, description).then((watchlist) => {
      // Return the watchlist and symbols for the calling component to handle
      return { watchlist, symbols };
    });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Create new watchlist</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit((name, desc) => handleCreateWatchlist(name, desc, symbols));
      }}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Watchlist"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Notes about this watchlist"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="symbols">
              Add symbols (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="symbols"
                placeholder="AAPL, MSFT, TSLA"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleAddSymbol}
                disabled={!symbolInput.trim()}
              >
                Add
              </Button>
            </div>
            {symbols.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {symbols.map(symbol => (
                  <Badge key={symbol} variant="secondary" className="flex items-center gap-1">
                    {symbol}
                    <button
                      type="button"
                      onClick={() => handleRemoveSymbol(symbol)}
                      className="ml-1 rounded-full hover:bg-muted p-1"
                    >
                      <X size={12} />
                      <span className="sr-only">Remove {symbol}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid}>
            Create Watchlist
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default CreateWatchlistWithStocksDialog;