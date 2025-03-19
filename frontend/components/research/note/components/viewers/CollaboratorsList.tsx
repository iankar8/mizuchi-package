
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ResearchNote } from "../../../types";
import { removeCollaborator } from "@/services/research";
import { Users, UserMinus, Lock, LockOpen, UserCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface CollaboratorsListProps {
  note: ResearchNote;
  onCollaboratorsChanged?: () => void;
}

const CollaboratorsList = ({ note, onCollaboratorsChanged }: CollaboratorsListProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      await removeCollaborator(user, note.id, collaboratorId);
      
      toast({
        title: "Collaborator removed",
        description: "The collaborator has been removed from this note"
      });
      
      onCollaboratorsChanged?.();
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
  
  // If there are no collaborators, don't render anything
  if (!note.collaborators || note.collaborators.length === 0) {
    return null;
  }
  
  return (
    <div className="border rounded-md p-4 space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Users className="h-4 w-4" />
        Collaborators ({note.collaborators.length})
      </h3>
      
      <div className="space-y-2">
        {note.collaborators.map((collaborator) => (
          <div 
            key={collaborator.id}
            className="flex items-center justify-between py-1"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {collaborator.avatarUrl ? (
                  <AvatarImage src={collaborator.avatarUrl} alt={collaborator.fullName || collaborator.email} />
                ) : null}
                <AvatarFallback>
                  {(collaborator.fullName?.[0] || collaborator.email[0]).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{collaborator.fullName || collaborator.email}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {collaborator.permissionLevel === "view" && (
                    <>
                      <Lock className="h-3 w-3" />
                      View only
                    </>
                  )}
                  {collaborator.permissionLevel === "edit" && (
                    <>
                      <LockOpen className="h-3 w-3" />
                      Can edit
                    </>
                  )}
                  {collaborator.permissionLevel === "admin" && (
                    <>
                      <UserCog className="h-3 w-3" />
                      Admin
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
                  <span className="sr-only">Open menu</span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                  >
                    <path
                      d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleRemoveCollaborator(collaborator.id)}
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remove collaborator
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollaboratorsList;
