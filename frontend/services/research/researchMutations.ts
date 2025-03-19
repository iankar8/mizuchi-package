
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";

// Function to create a new research note
export const createResearchNote = async (
  user: UserProfile | null, 
  note: { title: string; content: string; tags: string[]; relatedStocks?: string[] }
) => {
  if (!user) throw new Error("User not authenticated");

  const { title, content, tags, relatedStocks } = note;

  try {
    // Insert the note
    const { data: noteData, error: noteError } = await supabase
      .from("research_notes")
      .insert({
        title,
        content,
        created_by: user.id,
        is_public: false,
      })
      .select()
      .single();

    if (noteError) throw noteError;

    // Insert tags if any
    if (tags && tags.length > 0) {
      const tagRows = tags.map(tag => ({
        note_id: noteData.id,
        tag_name: tag,
      }));

      const { error: tagError } = await supabase
        .from("note_tags")
        .insert(tagRows);

      if (tagError) throw tagError;
    }

    // Insert related stocks if any
    if (relatedStocks && relatedStocks.length > 0) {
      const stockRows = relatedStocks.map(symbol => ({
        note_id: noteData.id,
        symbol,
      }));

      const { error: stockError } = await supabase
        .from("note_stocks")
        .insert(stockRows);

      if (stockError) throw stockError;
    }

    return {
      id: noteData.id,
      title: noteData.title,
      content: noteData.content,
      date: new Date(noteData.updated_at),
      tags: tags || [],
      relatedStocks: relatedStocks || [],
      isPublic: noteData.is_public,
    };
  } catch (error) {
    console.error("Error creating research note:", error);
    throw error;
  }
};

// Function to update an existing research note
export const updateResearchNote = async (
  user: UserProfile | null,
  noteId: string,
  updates: { title?: string; content?: string; tags?: string[]; relatedStocks?: string[] }
) => {
  if (!user) throw new Error("User not authenticated");

  const { title, content, tags, relatedStocks } = updates;
  const noteUpdates: any = {};

  if (title !== undefined) noteUpdates.title = title;
  if (content !== undefined) noteUpdates.content = content;
  noteUpdates.updated_at = new Date().toISOString();

  try {
    // Update the note
    if (Object.keys(noteUpdates).length > 0) {
      const { error: noteError } = await supabase
        .from("research_notes")
        .update(noteUpdates)
        .eq("id", noteId)
        .eq("created_by", user.id);

      if (noteError) throw noteError;
    }

    // Update tags if provided
    if (tags !== undefined) {
      // First, delete all existing tags
      const { error: deleteTagError } = await supabase
        .from("note_tags")
        .delete()
        .eq("note_id", noteId);

      if (deleteTagError) throw deleteTagError;

      // Then insert new tags
      if (tags.length > 0) {
        const tagRows = tags.map(tag => ({
          note_id: noteId,
          tag_name: tag,
        }));

        const { error: tagError } = await supabase
          .from("note_tags")
          .insert(tagRows);

        if (tagError) throw tagError;
      }
    }

    // Update related stocks if provided
    if (relatedStocks !== undefined) {
      // First, delete all existing stocks
      const { error: deleteStockError } = await supabase
        .from("note_stocks")
        .delete()
        .eq("note_id", noteId);

      if (deleteStockError) throw deleteStockError;

      // Then insert new stocks
      if (relatedStocks.length > 0) {
        const stockRows = relatedStocks.map(symbol => ({
          note_id: noteId,
          symbol,
        }));

        const { error: stockError } = await supabase
          .from("note_stocks")
          .insert(stockRows);

        if (stockError) throw stockError;
      }
    }

    // Fetch the updated note to return
    const { data: updatedNote, error: fetchError } = await supabase
      .from("research_notes")
      .select(`
        id, 
        title, 
        content, 
        created_at, 
        updated_at, 
        is_public
      `)
      .eq("id", noteId)
      .eq("created_by", user.id)
      .single();

    if (fetchError) throw fetchError;

    // Fetch tags
    const { data: tagData, error: tagFetchError } = await supabase
      .from("note_tags")
      .select("tag_name")
      .eq("note_id", noteId);

    // Fetch related stocks
    const { data: stockData, error: stockFetchError } = await supabase
      .from("note_stocks")
      .select("symbol")
      .eq("note_id", noteId);

    return {
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content,
      date: new Date(updatedNote.updated_at),
      tags: tagData?.map((tag: any) => tag.tag_name) || [],
      relatedStocks: stockData?.map((stock: any) => stock.symbol) || [],
      isPublic: updatedNote.is_public,
    };
  } catch (error) {
    console.error("Error updating research note:", error);
    throw error;
  }
};

// Function to delete a research note
export const deleteResearchNote = async (user: UserProfile | null, noteId: string) => {
  if (!user) throw new Error("User not authenticated");

  try {
    const { error } = await supabase
      .from("research_notes")
      .delete()
      .eq("id", noteId)
      .eq("created_by", user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting research note:", error);
    throw error;
  }
};
