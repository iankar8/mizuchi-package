
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";
import { Collaborator, CollaborationPermission } from "@/components/research/types";

// Function to share a research note with another user
export const shareResearchNote = async (
  user: UserProfile | null,
  noteId: string,
  collaboratorEmail: string,
  permissionLevel: CollaborationPermission = 'view'
) => {
  if (!user) throw new Error("User not authenticated");

  try {
    // First, check if the note exists and belongs to the current user
    const { data: note, error: noteError } = await supabase
      .from("research_notes")
      .select("*")
      .eq("id", noteId)
      .eq("created_by", user.id)
      .single();

    if (noteError) throw noteError;

    // Find the collaborator user by email
    const { data: collaborator, error: collaboratorError } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .eq("email", collaboratorEmail)
      .single();

    if (collaboratorError) throw new Error("User not found with this email");

    // Check if collaboration already exists
    const { data: existingCollaboration, error: existingError } = await supabase
      .from("note_collaborators")
      .select("*")
      .eq("note_id", noteId)
      .eq("user_id", collaborator.id)
      .single();

    if (!existingError && existingCollaboration) {
      // Update existing collaboration
      const { error: updateError } = await supabase
        .from("note_collaborators")
        .update({ permission_level: permissionLevel })
        .eq("id", existingCollaboration.id);

      if (updateError) throw updateError;
    } else {
      // Create new collaboration
      const { error: insertError } = await supabase
        .from("note_collaborators")
        .insert({
          note_id: noteId,
          user_id: collaborator.id,
          permission_level: permissionLevel
        });

      if (insertError) throw insertError;
    }

    return {
      success: true,
      collaborator: {
        id: collaborator.id,
        email: collaborator.email,
        fullName: collaborator.full_name,
        avatarUrl: collaborator.avatar_url,
        permissionLevel
      }
    };
  } catch (error) {
    console.error("Error sharing research note:", error);
    throw error;
  }
};

// Function to remove collaborator from a research note
export const removeCollaborator = async (
  user: UserProfile | null,
  noteId: string,
  collaboratorId: string
) => {
  if (!user) throw new Error("User not authenticated");

  try {
    // First, check if the note exists and belongs to the current user
    const { data: note, error: noteError } = await supabase
      .from("research_notes")
      .select("*")
      .eq("id", noteId)
      .eq("created_by", user.id)
      .single();

    if (noteError) throw noteError;

    // Remove the collaboration
    const { error: deleteError } = await supabase
      .from("note_collaborators")
      .delete()
      .eq("note_id", noteId)
      .eq("user_id", collaboratorId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error("Error removing collaborator:", error);
    throw error;
  }
};

// Function to get all collaborators for a note
export const getNoteCollaborators = async (
  user: UserProfile | null,
  noteId: string
): Promise<Collaborator[]> => {
  if (!user) return [];

  try {
    // First, verify user is owner or collaborator
    const { data: noteCheck, error: noteCheckError } = await supabase
      .from("research_notes")
      .select("created_by")
      .eq("id", noteId)
      .single();

    if (noteCheckError) throw noteCheckError;

    const isOwner = noteCheck.created_by === user.id;

    if (!isOwner) {
      // Check if user is a collaborator
      const { data: collabCheck, error: collabCheckError } = await supabase
        .from("note_collaborators")
        .select("*")
        .eq("note_id", noteId)
        .eq("user_id", user.id)
        .single();

      if (collabCheckError) throw new Error("You don't have access to this note");
    }

    // Get all collaborators with their profile information
    const { data: collaborators, error: collaboratorsError } = await supabase
      .from("note_collaborators")
      .select(`
        user_id,
        permission_level,
        profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("note_id", noteId);

    if (collaboratorsError) throw collaboratorsError;

    return collaborators.map((collab: any) => ({
      id: collab.profiles.id,
      email: collab.profiles.email,
      fullName: collab.profiles.full_name,
      avatarUrl: collab.profiles.avatar_url,
      permissionLevel: collab.permission_level as CollaborationPermission
    }));
  } catch (error) {
    console.error("Error getting note collaborators:", error);
    throw error;
  }
};
