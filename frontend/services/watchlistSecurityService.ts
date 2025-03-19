import { supabase } from '../utils/supabase';

// Interface definitions
interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Simplified security service that handles access control at the application layer
export const watchlistSecurityService = {
  // Check if a user can access a watchlist
  async canAccessWatchlist(userId: string, watchlistId: string): Promise<boolean> {
    if (!userId || !watchlistId) return false;

    // First, check if the watchlist is public
    const { data: watchlist, error: watchlistError } = await supabase
      .from('watchlists')
      .select('is_public, owner_id')
      .eq('id', watchlistId)
      .single();

    if (watchlistError || !watchlist) return false;

    // If the user is the owner or the watchlist is public, they can access it
    if (watchlist.owner_id === userId || watchlist.is_public) {
      return true;
    }

    // Check if the user is a collaborator
    const { data: collaborator, error: collabError } = await supabase
      .from('watchlist_collaborators')
      .select('id')
      .eq('watchlist_id', watchlistId)
      .eq('user_id', userId)
      .maybeSingle();

    if (collabError) return false;
    
    return !!collaborator;
  },

  // Check if a user is the owner of a watchlist
  async isWatchlistOwner(userId: string, watchlistId: string): Promise<boolean> {
    if (!userId || !watchlistId) return false;

    const { data: watchlist, error: watchlistError } = await supabase
      .from('watchlists')
      .select('owner_id')
      .eq('id', watchlistId)
      .single();

    if (watchlistError || !watchlist) return false;
    
    return watchlist.owner_id === userId;
  },

  // Get all watchlists a user can access
  async getAccessibleWatchlists(userId: string): Promise<Watchlist[]> {
    if (!userId) return [];

    // Get owned watchlists
    const { data: ownedWatchlists, error: ownedError } = await supabase
      .from('watchlists')
      .select('*')
      .eq('owner_id', userId);

    // Get public watchlists
    const { data: publicWatchlists, error: publicError } = await supabase
      .from('watchlists')
      .select('*')
      .eq('is_public', true);

    // Get watchlists where user is a collaborator
    const { data: collaborations, error: collabError } = await supabase
      .from('watchlist_collaborators')
      .select('watchlist_id')
      .eq('user_id', userId);

    if (collabError || !collaborations) {
      // Just return owned and public watchlists if collab query fails
      const combinedWatchlists = [...(ownedWatchlists || []), ...(publicWatchlists || [])];
      
      // Remove duplicates
      return Array.from(new Map(combinedWatchlists.map(item => [item.id, item])).values());
    }

    // Get the actual watchlists where user is a collaborator
    const collaboratorWatchlistIds = collaborations.map(collab => collab.watchlist_id);
    let collaboratorWatchlists: Watchlist[] = [];
    
    if (collaboratorWatchlistIds.length > 0) {
      const { data: watchlists, error: watchlistsError } = await supabase
        .from('watchlists')
        .select('*')
        .in('id', collaboratorWatchlistIds);
        
      if (!watchlistsError && watchlists) {
        collaboratorWatchlists = watchlists;
      }
    }

    // Combine all watchlists
    const combinedWatchlists = [
      ...(ownedWatchlists || []), 
      ...(publicWatchlists || []), 
      ...collaboratorWatchlists
    ];
    
    // Remove duplicates and return
    return Array.from(new Map(combinedWatchlists.map(item => [item.id, item])).values());
  },
  
  // Check before executing any data modification operations
  async assertCanModifyWatchlist(userId: string, watchlistId: string): Promise<void> {
    const isOwner = await this.isWatchlistOwner(userId, watchlistId);
    if (!isOwner) {
      throw new Error('Only the watchlist owner can modify this watchlist');
    }
  },
  
  // Check before executing any data access operations
  async assertCanAccessWatchlist(userId: string, watchlistId: string): Promise<void> {
    const canAccess = await this.canAccessWatchlist(userId, watchlistId);
    if (!canAccess) {
      throw new Error('You do not have permission to access this watchlist');
    }
  }
};
