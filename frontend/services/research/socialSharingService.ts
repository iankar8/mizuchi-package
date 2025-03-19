/**
 * Social Sharing Service
 * 
 * This service provides functionality for sharing research notes on social platforms
 * and managing public/private visibility of notes.
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";
import { ResearchNote } from "@/components/research/types";
import errorMonitoringService from "../errorMonitoringService";

/**
 * Toggle the public/private status of a research note
 */
export const toggleNotePublicStatus = async (
  user: UserProfile | null,
  noteId: string,
  isPublic: boolean
): Promise<{ success: boolean; isPublic: boolean }> => {
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

    // Update the public status
    const { error: updateError } = await supabase
      .from("research_notes")
      .update({ is_public: isPublic })
      .eq("id", noteId)
      .eq("created_by", user.id);

    if (updateError) throw updateError;

    return { success: true, isPublic };
  } catch (error) {
    console.error("Error toggling note public status:", error);
    if (errorMonitoringService?.recordHandledException) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'socialSharingService.toggleNotePublicStatus',
        { severity: 'medium' }
      );
    }
    throw error;
  }
};

/**
 * Get a publicly shared note by its ID
 * This can be accessed without authentication
 */
export const getPublicNote = async (noteId: string): Promise<ResearchNote | null> => {
  try {
    // Fetch the note if it's public
    const { data: note, error: noteError } = await supabase
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
      .eq("id", noteId)
      .eq("is_public", true)
      .single();

    if (noteError) return null;

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
  } catch (error) {
    console.error("Error fetching public note:", error);
    if (errorMonitoringService?.recordHandledException) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'socialSharingService.getPublicNote',
        { severity: 'low' }
      );
    }
    return null;
  }
};

/**
 * Get all public notes for discovery
 * This can be accessed without authentication
 * @param limit Maximum number of notes to return
 * @param offset Pagination offset
 */
export const getPublicNotes = async (
  limit: number = 10,
  offset: number = 0
): Promise<ResearchNote[]> => {
  try {
    // Fetch public notes with pagination
    const { data: notes, error: notesError } = await supabase
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
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (notesError) throw notesError;

    if (!notes || notes.length === 0) {
      return [];
    }

    // Fetch additional data for each note
    const notesWithDetails = await Promise.all(
      notes.map(async (note) => {
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
    console.error("Error fetching public notes:", error);
    if (errorMonitoringService?.recordHandledException) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'socialSharingService.getPublicNotes',
        { severity: 'low' }
      );
    }
    return [];
  }
};

/**
 * Generate a shareable link for a note
 */
export const generateShareableLink = async (
  user: UserProfile | null,
  noteId: string
): Promise<{ success: boolean; shareUrl: string }> => {
  if (!user) throw new Error("User not authenticated");

  try {
    // First, check if the note exists and belongs to the current user
    const { data: note, error: noteError } = await supabase
      .from("research_notes")
      .select("is_public")
      .eq("id", noteId)
      .eq("created_by", user.id)
      .single();

    if (noteError) throw noteError;

    // If note is not public, make it public
    if (!note.is_public) {
      const { error: updateError } = await supabase
        .from("research_notes")
        .update({ is_public: true })
        .eq("id", noteId)
        .eq("created_by", user.id);

      if (updateError) throw updateError;
    }

    // Generate the shareable URL (this would be based on your app's URL structure)
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/research/shared/${noteId}`;

    return { success: true, shareUrl };
  } catch (error) {
    console.error("Error generating shareable link:", error);
    if (errorMonitoringService?.recordHandledException) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'socialSharingService.generateShareableLink',
        { severity: 'medium' }
      );
    }
    throw error;
  }
};

/**
 * Share a note to a social platform
 * @param platform The social platform to share to (twitter, linkedin, etc.)
 */
export const shareToSocialPlatform = async (
  user: UserProfile | null,
  noteId: string,
  platform: 'twitter' | 'linkedin' | 'facebook'
): Promise<{ success: boolean; shareUrl: string }> => {
  if (!user) throw new Error("User not authenticated");

  try {
    // First generate a shareable link
    const { shareUrl } = await generateShareableLink(user, noteId);
    
    // Get note details for sharing
    const { data: note, error: noteError } = await supabase
      .from("research_notes")
      .select("title, content")
      .eq("id", noteId)
      .eq("created_by", user.id)
      .single();

    if (noteError) throw noteError;
    
    // Create platform-specific share URLs
    let platformShareUrl = '';
    const text = `Check out my research note: ${note.title}`;
    
    switch (platform) {
      case 'twitter':
        platformShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        platformShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        platformShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
    }
    
    // Record the share action in the database
    try {
      const { error: shareError } = await supabase
        .from("note_shares")
        .insert({
          note_id: noteId,
          user_id: user.id,
          platform,
          shared_at: new Date().toISOString()
        });
      
      if (shareError) {
        console.warn("Failed to record share action:", shareError);
        // Continue anyway, this is not critical
      }
    } catch (shareTrackingError) {
      console.warn("Error tracking share:", shareTrackingError);
      // Continue anyway, this is not critical for the user experience
    }
    
    return { success: true, shareUrl: platformShareUrl };
  } catch (error) {
    console.error(`Error sharing to ${platform}:`, error);
    if (errorMonitoringService?.recordHandledException) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'socialSharingService.shareToSocialPlatform',
        { severity: 'medium' }
      );
    }
    throw error;
  }
};

/**
 * Get share statistics for a note
 */
export const getNoteShareStats = async (
  user: UserProfile | null,
  noteId: string
): Promise<{ totalShares: number; platformBreakdown: Record<string, number> }> => {
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

    // Get share statistics
    const { data: shares, error: sharesError } = await supabase
      .from("note_shares")
      .select("platform")
      .eq("note_id", noteId);

    if (sharesError) throw sharesError;

    // Calculate platform breakdown
    const platformBreakdown: Record<string, number> = {};
    shares.forEach((share: any) => {
      const platform = share.platform;
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
    });

    return {
      totalShares: shares.length,
      platformBreakdown
    };
  } catch (error) {
    console.error("Error getting note share stats:", error);
    if (errorMonitoringService?.recordHandledException) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'socialSharingService.getNoteShareStats',
        { severity: 'low' }
      );
    }
    return { totalShares: 0, platformBreakdown: {} };
  }
};

/**
 * Check if a note is publicly accessible
 */
export const isNotePublic = async (noteId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("research_notes")
      .select("is_public")
      .eq("id", noteId)
      .single();
    
    if (error) return false;
    return data.is_public === true;
  } catch (error) {
    console.error("Error checking if note is public:", error);
    return false;
  }
};

/**
 * Track a view of a public note
 */
export const trackNoteView = async (noteId: string): Promise<void> => {
  try {
    // First check if the note is public
    const isPublic = await isNotePublic(noteId);
    if (!isPublic) return;
    
    // Track the view anonymously
    const { error } = await supabase
      .from("note_views")
      .insert({
        note_id: noteId,
        viewed_at: new Date().toISOString(),
        // We don't store the viewer's identity for privacy reasons
      });
    
    if (error) {
      console.warn("Failed to track note view:", error);
    }
  } catch (error) {
    console.error("Error tracking note view:", error);
    // We don't throw here since view tracking is not critical
  }
};

/**
 * Get view statistics for a note
 */
export const getNoteViewStats = async (
  user: UserProfile | null,
  noteId: string
): Promise<{ totalViews: number; viewsByDate: Record<string, number> }> => {
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

    // Get view statistics
    const { data: views, error: viewsError } = await supabase
      .from("note_views")
      .select("viewed_at")
      .eq("note_id", noteId);

    if (viewsError) throw viewsError;
    
    if (!views || views.length === 0) {
      return { totalViews: 0, viewsByDate: {} };
    }

    // Organize views by date
    const viewsByDate: Record<string, number> = {};
    views.forEach((view: any) => {
      const date = new Date(view.viewed_at).toLocaleDateString();
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    return {
      totalViews: views.length,
      viewsByDate
    };
  } catch (error) {
    console.error("Error getting note view stats:", error);
    if (errorMonitoringService?.recordHandledException) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'socialSharingService.getNoteViewStats',
        { severity: 'low' }
      );
    }
    return { totalViews: 0, viewsByDate: {} };
  }
};
