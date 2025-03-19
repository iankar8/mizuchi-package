import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WatchlistService } from "@/services/watchlist.service";
import { useToast } from "@/hooks/use-toast";

interface ManageRolesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistId: string;
  onMemberAdded?: () => void;
}

export function ManageRolesDialog({
  isOpen,
  onClose,
  watchlistId,
  onMemberAdded,
}: ManageRolesDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor" | "admin">("viewer");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await WatchlistService.shareWatchlist(watchlistId, email, role);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Member added successfully",
      });
      onMemberAdded?.();
      onClose();
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: "Failed to add member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Access</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={role} onValueChange={(value: "viewer" | "editor" | "admin") => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              Add Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
