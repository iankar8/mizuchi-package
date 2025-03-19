
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWatchlistCreateForm } from "@/hooks/use-watchlist-create-form";

interface CreateWatchlistDialogProps {
  handleCreateWatchlist: (name: string, description: string) => Promise<any>;
  setIsDialogOpen: (isOpen: boolean) => void;
}

const CreateWatchlistDialog = ({ 
  handleCreateWatchlist, 
  setIsDialogOpen 
}: CreateWatchlistDialogProps) => {
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

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create new watchlist</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(handleCreateWatchlist);
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
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid}>Create Watchlist</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default CreateWatchlistDialog;
