
import { 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useCollaboratorForm } from "@/hooks/use-collaborator-form";

interface InviteCollaboratorDialogProps {
  watchlistId: string;
  setIsCollaboratorDialogOpen: (isOpen: boolean) => void;
}

const InviteCollaboratorDialog = ({ 
  watchlistId,
  setIsCollaboratorDialogOpen 
}: InviteCollaboratorDialogProps) => {
  const { 
    collaboratorEmail,
    setCollaboratorEmail,
    permission, 
    setPermission, 
    getPermissionDescription,
    isValid,
    inviteCollaborator
  } = useCollaboratorForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) return;
    
    const success = await inviteCollaborator(watchlistId);
    if (success) {
      setIsCollaboratorDialogOpen(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Invite collaborator</DialogTitle>
        <DialogDescription>
          Add someone to collaborate on this watchlist
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={collaboratorEmail}
              onChange={(e) => setCollaboratorEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="permission">Permission level</Label>
            <Select
              value={permission}
              onValueChange={setPermission}
            >
              <SelectTrigger id="permission">
                <SelectValue placeholder="Select permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View only</SelectItem>
                <SelectItem value="edit">Can edit</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getPermissionDescription()}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsCollaboratorDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid()}>Send Invitation</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default InviteCollaboratorDialog;
