import { supabase } from '../../utils/supabase/client';

// Define proper types matching your database schema
interface Watchlist {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
  owner_id: string;
}

// Simplified security service that handles access control at the application layer
// This is designed to work with the existing watchlist service
export const watchlistSecurityService = {
  // Check if a user can access a watchlist
  async canAccessWatchlist(userId: string, watchlistId: string): Promise<boolean> {
    if (!userId || !watchlistId) return false;

    // First, check if the watchlist is public
    const { data, error } = await supabase
      .from('watchlists')
      .select('is_public, owner_id')
      .eq('id', watchlistId)
      .single();

    if (error || !data) return false;
    
    // Type assertion to match our Watchlist interface
    const watchlist = data as Watchlist;

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

    const { data, error } = await supabase
      .from('watchlists')
      .select('owner_id')
      .eq('id', watchlistId)
      .single();

    if (error || !data) return false;
    
    // Type assertion to match our Watchlist interface
    const watchlist = data as Watchlist;
    
    return watchlist.owner_id === userId;
  },

  // Apply security check middleware for data modification operations
  async assertCanModifyWatchlist(userId: string, watchlistId: string): Promise<void> {
    const isOwner = await this.isWatchlistOwner(userId, watchlistId);
    if (!isOwner) {
      throw new Error('Only the watchlist owner can modify this watchlist');
    }
  },
  
  // Apply security check middleware for data access operations
  async assertCanAccessWatchlist(userId: string, watchlistId: string): Promise<void> {
    const canAccess = await this.canAccessWatchlist(userId, watchlistId);
    if (!canAccess) {
      throw new Error('You do not have permission to access this watchlist');
    }
  }
};
