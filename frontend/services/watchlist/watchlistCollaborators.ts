
import { supabase } from "@/utils/supabase/client";
import { WatchlistCollaborator, Result, DBStatusCode } from "@/types/supabase";
import { 
  createSuccess, 
  createError, 
  createNotFoundError, 
  mapSupabaseResponse,
  withResultHandling
} from "@/utils/supabase/resultUtils";

// Share a watchlist with another user
export const shareWatchlist = async (
  watchlistId: string, 
  userEmail: string, 
  permissionLevel: 'view' | 'edit' | 'admin' = 'view'
): Promise<Result<boolean>> => {
  return withResultHandling(async () => {
    // Validate input
    if (!watchlistId || !userEmail) {
      return createError<boolean>(
        "Watchlist ID and user email are required", 
        DBStatusCode.VALIDATION_ERROR
      );
    }
    
    // First verify the watchlist exists and current user has admin access
    const { data: watchlistData, error: watchlistError } = await supabase
      .from('watchlists')
      .select('id, created_by')
      .eq('id', watchlistId)
      .single();
      
    if (watchlistError) {
      if (watchlistError.code === 'PGRST116') {
        return createNotFoundError<boolean>('Watchlist', watchlistId);
      }
      
      if (watchlistError.code === 'PGRST301') {
        return createError<boolean>(
          "You don't have permission to share this watchlist",
          DBStatusCode.RLS_ERROR
        );
      }
      
      return createError<boolean>(watchlistError.message, DBStatusCode.QUERY_ERROR);
    }
    
    // Get the current user ID for permission check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return createError<boolean>("Not authenticated", DBStatusCode.UNAUTHORIZED);
    }
    
    // Only the owner or admin collaborators can share the watchlist
    if (watchlistData.created_by !== user.id) {
      // Check if the current user is an admin collaborator
      const { data: collabData, error: collabError } = await supabase
        .from('watchlist_collaborators')
        .select('permission_level')
        .eq('watchlist_id', watchlistId)
        .eq('user_id', user.id)
        .single();
        
      if (collabError || !collabData || collabData.permission_level !== 'admin') {
        return createError<boolean>(
          "You don't have admin access to share this watchlist",
          DBStatusCode.FORBIDDEN
        );
      }
    }
    
    // Get the user's ID from their email
    const { data: targetUserData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();
      
    if (userError) {
      if (userError.code === 'PGRST116') {
        return createError<boolean>(
          `User with email ${userEmail} was not found`,
          DBStatusCode.NOT_FOUND
        );
      }
      return createError<boolean>(userError.message, DBStatusCode.QUERY_ERROR);
    }
    
    // Check if the user is already a collaborator
    const { data: existingCollabs, error: existingError } = await supabase
      .from('watchlist_collaborators')
      .select('id')
      .eq('watchlist_id', watchlistId)
      .eq('user_id', targetUserData.id);
      
    if (existingError) {
      return createError<boolean>(
        "Error checking existing collaborators",
        DBStatusCode.QUERY_ERROR
      );
    }
    
    if (existingCollabs && existingCollabs.length > 0) {
      // Update existing collaboration instead of creating a new one
      const { error: updateError } = await supabase
        .from('watchlist_collaborators')
        .update({ permission_level: permissionLevel })
        .eq('id', existingCollabs[0].id);
        
      if (updateError) {
        return createError<boolean>(
          updateError.message,
          DBStatusCode.QUERY_ERROR
        );
      }
      
      return createSuccess(true, { 
        action: 'updated', 
        collaboratorId: existingCollabs[0].id 
      });
    }
    
    // Add user as a collaborator
    const { data: newCollab, error: insertError } = await supabase
      .from('watchlist_collaborators')
      .insert({
        watchlist_id: watchlistId,
        user_id: targetUserData.id,
        permission_level: permissionLevel
      })
      .select()
      .single();
      
    if (insertError) {
      return createError<boolean>(
        insertError.message,
        DBStatusCode.QUERY_ERROR
      );
    }
    
    return createSuccess(true, { 
      action: 'created', 
      collaboratorId: newCollab.id 
    });
  });
};

// Get collaborators for a watchlist
export const getWatchlistCollaborators = async (
  watchlistId: string
): Promise<Result<WatchlistCollaborator[]>> => {
  return withResultHandling(async () => {
    // Verify the watchlist exists and current user has access
    const { data: watchlistData, error: watchlistError } = await supabase
      .from('watchlists')
      .select('id')
      .eq('id', watchlistId)
      .single();
      
    if (watchlistError) {
      if (watchlistError.code === 'PGRST116') {
        return createNotFoundError<WatchlistCollaborator[]>('Watchlist', watchlistId);
      }
      
      if (watchlistError.code === 'PGRST301') {
        return createError<WatchlistCollaborator[]>(
          "You don't have permission to view this watchlist's collaborators",
          DBStatusCode.RLS_ERROR
        );
      }
      
      return createError<WatchlistCollaborator[]>(
        watchlistError.message, 
        DBStatusCode.QUERY_ERROR
      );
    }
    
    // Get collaborators with profile information
    const response = await supabase
      .from('watchlist_collaborators')
      .select(`
        *,
        profiles:user_id(id, email, full_name, avatar_url, created_at, updated_at)
      `)
      .eq('watchlist_id', watchlistId);
      
    return mapSupabaseResponse<any[], WatchlistCollaborator[]>(
      response,
      (data) => (data || []) as WatchlistCollaborator[]
    );
  });
};

// Remove a collaborator from a watchlist
export const removeCollaborator = async (
  collaboratorId: string
): Promise<Result<boolean>> => {
  return withResultHandling(async () => {
    // Get the collaborator details first to check permissions
    const { data: collabData, error: collabError } = await supabase
      .from('watchlist_collaborators')
      .select('id, watchlist_id, user_id')
      .eq('id', collaboratorId)
      .single();
      
    if (collabError) {
      if (collabError.code === 'PGRST116') {
        return createNotFoundError<boolean>('Collaborator', collaboratorId);
      }
      
      return createError<boolean>(
        collabError.message, 
        DBStatusCode.QUERY_ERROR
      );
    }
    
    // Get the watchlist to check ownership
    const { data: watchlistData, error: watchlistError } = await supabase
      .from('watchlists')
      .select('created_by')
      .eq('id', collabData.watchlist_id)
      .single();
      
    if (watchlistError) {
      return createError<boolean>(
        watchlistError.message, 
        DBStatusCode.QUERY_ERROR
      );
    }
    
    // Get current user for permission check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return createError<boolean>(
        "Not authenticated", 
        DBStatusCode.UNAUTHORIZED
      );
    }
    
    // Check if user is the owner or an admin collaborator
    if (watchlistData.created_by !== user.id) {
      // Check if they're an admin collaborator
      const { data: adminCheck, error: adminError } = await supabase
        .from('watchlist_collaborators')
        .select('permission_level')
        .eq('watchlist_id', collabData.watchlist_id)
        .eq('user_id', user.id)
        .single();
        
      if (adminError || !adminCheck || adminCheck.permission_level !== 'admin') {
        return createError<boolean>(
          "You don't have permission to remove collaborators from this watchlist",
          DBStatusCode.FORBIDDEN
        );
      }
    }
    
    // Remove the collaborator
    const { error: deleteError } = await supabase
      .from('watchlist_collaborators')
      .delete()
      .eq('id', collaboratorId);
      
    if (deleteError) {
      return createError<boolean>(
        deleteError.message,
        DBStatusCode.QUERY_ERROR
      );
    }
    
    return createSuccess(true);
  });
};
