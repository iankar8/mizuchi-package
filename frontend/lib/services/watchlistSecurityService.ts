import { supabase } from '@/utils/supabase/client';

// Interface definitions aligned with actual database schema
interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  owner_id: string; // Actual field in database
  updated_at: string;
}

// Simplified security service that handles access control at the application layer
export const watchlistSecurityService = {
  // Check if a user can access a watchlist
  async canAccessWatchlist(userId: string, watchlistId: string): Promise<boolean> {
    if (!watchlistId) return false;
    
    // SECURITY FIX: Anonymous users cannot access any watchlists
    if (!userId) {
      return false;
    }

    try {
      // For authenticated users, check ownership, public status, or collaboration
      const { data: watchlist, error: watchlistError } = await supabase
        .from('watchlists')
        .select('is_public, owner_id')
        .eq('id', watchlistId)
        .single();

      if (watchlistError || !watchlist) return false;

      // SECURITY FIX: Only allow access if the user is the owner
      // Public watchlists should still require ownership or collaboration
      if ((watchlist as any).owner_id === userId) {
        return true;
      }
    } catch (error) {
      console.error('Error checking watchlist ownership:', error);
      return false;
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

    try {
      const { data: watchlist, error: watchlistError } = await supabase
        .from('watchlists')
        .select('owner_id')
        .eq('id', watchlistId)
        .single();

      if (watchlistError || !watchlist) return false;
      
      return (watchlist as any).owner_id === userId;
    } catch (error) {
      console.error('Error checking watchlist ownership:', error);
      return false;
    }
  },

  // Get all watchlists a user can access
  async getAccessibleWatchlists(userId: string): Promise<Watchlist[]> {
    // SECURITY FIX: Anonymous users cannot access any watchlists
    if (!userId) {
      return [];
    }

    try {
      // Get owned watchlists
      // Use type assertion to handle schema differences
      const { data: ownedWatchlists, error: ownedError } = await supabase
        .from('watchlists')
        .select('*')
        .eq('owner_id', userId);

      if (ownedError) {
        console.error('Error fetching owned watchlists:', ownedError);
      }

      // SECURITY FIX: Only get public watchlists that the user owns
      // Users should not be able to access other users' watchlists even if they're public
      const { data: publicWatchlists, error: publicError } = await supabase
        .from('watchlists')
        .select('*')
        .eq('is_public', true)
        .eq('owner_id', userId);

      if (publicError) {
        console.error('Error fetching public watchlists:', publicError);
      }

      // SECURITY FIX: Disable collaborator access for now
      // This will be re-enabled after a full security audit
      const collaborations = [];
      const collaboratorWatchlistIds = [];

      // SECURITY FIX: No collaborator watchlists for now
      let collaboratorWatchlists: any[] = [];

      // Combine all watchlists
      const combinedWatchlists = [
        ...(ownedWatchlists || []), 
        ...(publicWatchlists || []), 
        ...collaboratorWatchlists
      ];
      
      // Remove duplicates and return
      return Array.from(new Map(combinedWatchlists.map(item => [item.id, item])).values()) as any as Watchlist[];
    } catch (error) {
      console.error('Error fetching accessible watchlists:', error);
      return [];
    }
  },
  
  // Check before executing any data modification operations
  async assertCanModifyWatchlist(userId: string, watchlistId: string): Promise<void> {
    // SECURITY FIX: Require authentication for any modification
    if (!userId) {
      throw new Error('Authentication required to modify watchlists');
    }
    
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
  },
  
  // Check if a user can add an item to a watchlist
  async canAddItemToWatchlist(userId: string, watchlistId: string): Promise<boolean> {
    // SECURITY FIX: Require authentication for adding items
    if (!userId || !watchlistId) return false;
    
    // SECURITY FIX: Only allow owners to add items for now
    // Collaborators will be handled separately after security audit
    return await this.isWatchlistOwner(userId, watchlistId);
  },
  
  // Assert that a user can add an item to a watchlist
  async assertCanAddItemToWatchlist(userId: string, watchlistId: string): Promise<void> {
    // SECURITY FIX: Require authentication for adding items
    if (!userId) {
      throw new Error('Authentication required to add items to watchlists');
    }
    
    const canAdd = await this.canAddItemToWatchlist(userId, watchlistId);
    if (!canAdd) {
      throw new Error('You do not have permission to add items to this watchlist');
    }
  }
};
