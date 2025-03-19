
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";
import { ResearchNote } from "@/components/research/types";

// Function to fetch all research notes for the current user
export const fetchResearchNotes = async (user: UserProfile | null) => {
  if (!user) return [];

  try {
    // First fetch the basic note data
    const { data, error } = await supabase
      .from("research_notes")
      .select(`
        id, 
        title, 
        content, 
        created_at, 
        updated_at, 
        is_public,
        created_by
      `)
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // Fetch additional data (tags, stocks, owner profile) for each note
    const notesWithDetails = await Promise.all(
      data.map(async (note) => {
        // Fetch owner profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, avatar_url")
          .eq("id", note.created_by)
          .single();
        
        // Fetch tags
        const { data: tagData, error: tagError } = await supabase
          .from("note_tags")
          .select("tag_name")
          .eq("note_id", note.id);
        
        // Fetch related stocks
        const { data: stockData, error: stockError } = await supabase
          .from("note_stocks")
          .select("symbol")
          .eq("note_id", note.id);
        
        return {
          id: note.id,
          title: note.title,
          content: note.content,
          date: new Date(note.updated_at),
          tags: tagData?.map((tag: any) => tag.tag_name) || [],
          relatedStocks: stockData?.map((stock: any) => stock.symbol) || [],
          isPublic: note.is_public,
          owner: profileData ? {
            id: profileData.id,
            email: profileData.email,
            fullName: profileData.full_name,
            avatarUrl: profileData.avatar_url
          } : undefined
        };
      })
    );

    return notesWithDetails;
  } catch (error) {
    console.error("Error fetching research notes:", error);
    throw error;
  }
};

// Function to get shared notes (notes shared with current user)
export const getSharedResearchNotes = async (user: UserProfile | null): Promise<ResearchNote[]> => {
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from("note_collaborators")
      .select(`
        note_id,
        permission_level,
        research_notes (
          id, 
          title, 
          content, 
          created_at, 
          updated_at, 
          is_public,
          created_by
        )
      `)
      .eq("user_id", user.id);

    if (error) throw error;

    // For each research note, fetch the owner profile in a separate query
    const notesWithOwners = await Promise.all(
      data.map(async (item: any) => {
        const note = item.research_notes;
        
        // Fetch the owner profile
        const { data: ownerData, error: ownerError } = await supabase
          .from("profiles")
          .select("id, email, full_name, avatar_url")
          .eq("id", note.created_by)
          .single();
        
        // Fetch tags
        const { data: tagData, error: tagError } = await supabase
          .from("note_tags")
          .select("tag_name")
          .eq("note_id", note.id);
        
        // Fetch related stocks
        const { data: stockData, error: stockError } = await supabase
          .from("note_stocks")
          .select("symbol")
          .eq("note_id", note.id);
        
        return {
          id: note.id,
          title: note.title,
          content: note.content,
          date: new Date(note.updated_at),
          tags: tagData?.map((tag: any) => tag.tag_name) || [],
          relatedStocks: stockData?.map((stock: any) => stock.symbol) || [],
          isPublic: note.is_public,
          owner: ownerData ? {
            id: ownerData.id,
            email: ownerData.email,
            fullName: ownerData.full_name,
            avatarUrl: ownerData.avatar_url
          } : undefined,
          permissionLevel: item.permission_level
        };
      })
    );

    return notesWithOwners;
  } catch (error) {
    console.error("Error fetching shared research notes:", error);
    throw error;
  }
};
