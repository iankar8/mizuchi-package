
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WatchlistService } from "@/services/watchlist.service";

export function useCollaboratorForm(initialEmail = "", initialPermission = "view") {
  const [collaboratorEmail, setCollaboratorEmail] = useState(initialEmail);
  const [permission, setPermission] = useState<string>(initialPermission);
  const { toast } = useToast();

  const getPermissionDescription = () => {
    switch (permission) {
      case "view":
        return "Can only view the watchlist";
      case "edit":
        return "Can add and remove stocks";
      case "admin":
        return "Can edit and invite others";
      default:
        return "";
    }
  };

  const resetForm = () => {
    setCollaboratorEmail("");
    setPermission("view");
  };

  const isValid = () => {
    return collaboratorEmail.trim().length > 0;
  };

  const inviteCollaborator = async (watchlistId: string) => {
    if (!watchlistId || !collaboratorEmail) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      const { data, error } = await WatchlistService.shareWatchlist(
        watchlistId,
        collaboratorEmail
      );
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: `Invitation sent to ${collaboratorEmail}.`,
      });
      resetForm();
      return true;
    } catch (error) {
      console.error("Error inviting collaborator:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    collaboratorEmail,
    setCollaboratorEmail,
    permission,
    setPermission,
    getPermissionDescription,
    resetForm,
    isValid,
    inviteCollaborator
  };
}
