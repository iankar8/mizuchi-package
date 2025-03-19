import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { ResearchNote, CollaborationPermission } from "./types";
import { shareResearchNote, getNoteCollaborators, removeCollaborator } from "@/services/research";
import { Users, Mail, X, Share2, UserPlus, Trash } from "lucide-react";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShareNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: ResearchNote | null;
  onShared?: () => void;
}

const ShareNoteDialog = ({ open, onOpenChange, note, onShared }: ShareNoteDialogProps) => {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<CollaborationPermission>("view");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("invite");
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  useEffect(() => {
    if (open && note?.id) {
      fetchCollaborators();
    }
  }, [open, note?.id]);
  
  const fetchCollaborators = async () => {
    if (!note || !user) return;
    
    try {
      setIsLoadingCollaborators(true);
      const collaboratorsList = await getNoteCollaborators(user, note.id);
      setCollaborators(collaboratorsList);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };
  
  const handleShareNote = async () => {
    if (!note || !email.trim() || !user) return;
    
    try {
      setIsLoading(true);
      await shareResearchNote(user, note.id, email, permission);
      
      toast({
        title: "Note shared successfully",
        description: `Note shared with ${email}`,
      });
      
      setEmail("");
      onShared?.();
      fetchCollaborators();
      setActiveTab("manage");
    } catch (error: any) {
      console.error("Error sharing note:", error);
      toast({
        title: "Failed to share note",
        description: error.message || "Could not share the note with this user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!note || !user) return;
    
    try {
      setIsLoading(true);
      await removeCollaborator(user, note.id, collaboratorId);
      
      toast({
        title: "Collaborator removed",
        description: "The collaborator has been removed from this note",
      });
      
      fetchCollaborators();
    } catch (error: any) {
      console.error("Error removing collaborator:", error);
      toast({
        title: "Failed to remove collaborator",
        description: error.message || "Could not remove this collaborator",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getPermissionBadgeColor = (permissionLevel: string) => {
    switch (permissionLevel) {
      case 'admin':
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case 'edit':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Research Note
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="manage">Manage Access</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invite" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="permission">Permission level</Label>
              <Select
                value={permission}
                onValueChange={(value) => setPermission(value as CollaborationPermission)}
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
              <p className="text-sm text-muted-foreground">
                {permission === "view" && "Can view but not edit the note"}
                {permission === "edit" && "Can make changes to the note"}
                {permission === "admin" && "Can edit and manage collaborators"}
              </p>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleShareNote}
                disabled={!email.trim() || isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                ) : (
                  <UserPlus className="mr-1 h-4 w-4" />
                )}
                Share
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="manage" className="space-y-4 py-4">
            {isLoadingCollaborators ? (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : collaborators.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Current collaborators
                </h4>
                <div className="space-y-2">
                  {collaborators.map((collaborator) => (
                    <div 
                      key={collaborator.id}
                      className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                          {collaborator.fullName?.[0] || collaborator.email[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{collaborator.fullName || collaborator.email}</div>
                          <div className="text-xs text-muted-foreground">{collaborator.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPermissionBadgeColor(collaborator.permissionLevel)}>
                          {collaborator.permissionLevel}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                          className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="mx-auto h-8 w-8 mb-2 opacity-40" />
                <p>No collaborators yet</p>
                <p className="text-sm">Share your note to start collaborating</p>
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <Button onClick={() => setActiveTab("invite")} variant="outline">
                <UserPlus className="mr-1 h-4 w-4" />
                Add More
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              <X className="mr-1 h-4 w-4" />
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareNoteDialog;
