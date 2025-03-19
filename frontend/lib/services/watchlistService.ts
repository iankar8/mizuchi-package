import { supabase } from '@/utils/supabase/client';
import { watchlistSecurityService } from './watchlistSecurityService';

// Types - aligned with the database schema
interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  owner_id: string;
  updated_at: string;
}

// Database schema types
interface WatchlistDB {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  added_by: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

interface WatchlistCollaborator {
  id: string;
  watchlist_id: string;
  user_id: string;
  permission_level: string;
  created_at: string;
}

// Watchlist Service
export const watchlistService = {
  // Get all watchlists accessible to the current user
  async getAccessibleWatchlists(): Promise<Watchlist[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      return await watchlistSecurityService.getAccessibleWatchlists(userId);
    } catch (error) {
      console.error('Error fetching watchlists:', error);
      throw error;
    }
  },

  // Create a new watchlist
  async createWatchlist(name: string, description: string = '', isPublic: boolean = false): Promise<Watchlist> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User must be authenticated');

    // Type assertion to match the database schema
    const { data, error } = await supabase
      .from('watchlists')
      .insert({
        name,
        description,
        owner_id: session.user.id,
        is_public: isPublic
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating watchlist:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Failed to create watchlist');
    }
    
    // Convert to Watchlist type with type assertion to handle schema differences
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      is_public: data.is_public,
      owner_id: (data as any).owner_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  // Update watchlist details (only allowed for owners)
  async updateWatchlist(watchlistId: string, updates: { name?: string; description?: string; is_public?: boolean }): Promise<Watchlist> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User must be authenticated');

    // Check if user is owner using our security service
    await watchlistSecurityService.assertCanModifyWatchlist(session.user.id, watchlistId);

    const { data, error } = await supabase
      .from('watchlists')
      .update(updates)
      .eq('id', watchlistId)
      .select()
      .single();

    if (error) {
      console.error('Error updating watchlist:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Failed to update watchlist');
    }
    
    // Convert to Watchlist type with type assertion to handle schema differences
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      is_public: data.is_public,
      owner_id: (data as any).owner_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  // Delete a watchlist (only allowed for owners)
  async deleteWatchlist(watchlistId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User must be authenticated');

    // Check if user is owner using our security service
    await watchlistSecurityService.assertCanModifyWatchlist(session.user.id, watchlistId);

    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('id', watchlistId);

    if (error) {
      console.error('Error deleting watchlist:', error);
      throw error;
    }
  },

  // Get watchlist items
  async getWatchlistItems(watchlistId: string): Promise<WatchlistItem[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    // Check if user can access this watchlist
    await watchlistSecurityService.assertCanAccessWatchlist(session.user.id, watchlistId);
    
    // If they can access it, fetch the items directly
    const { data, error } = await supabase
      .from('watchlist_items')
      .select('*')
      .eq('watchlist_id', watchlistId);

    if (error) {
      console.error('Error fetching watchlist items:', error);
      throw error;
    }

    return data || [];
  },

  // Add item to watchlist (only allowed for owners and collaborators)
  async addWatchlistItem(watchlistId: string, symbol: string, notes: string = ''): Promise<WatchlistItem> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User must be authenticated');

    // SECURITY FIX: Use the specific security method for adding items
    await watchlistSecurityService.assertCanAddItemToWatchlist(session.user.id, watchlistId);

    // Add the item directly
    const { data, error } = await supabase
      .from('watchlist_items')
      .insert({
        watchlist_id: watchlistId,
        symbol: symbol,
        notes: notes,
        added_by: session.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding watchlist item:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Failed to add watchlist item');
    }
    
    // Convert to WatchlistItem type
    return {
      id: data.id,
      watchlist_id: data.watchlist_id,
      symbol: data.symbol,
      added_by: data.added_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      notes: data.notes
    };
  },

  // Remove item from watchlist (only allowed for owners)
  async removeWatchlistItem(watchlistId: string, itemId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User must be authenticated');

    // SECURITY FIX: Use the specific security method for modifying items
    // Only the owner should be able to remove items
    await watchlistSecurityService.assertCanAddItemToWatchlist(session.user.id, watchlistId);

    // Delete the item directly
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('id', itemId)
      .eq('watchlist_id', watchlistId);

    if (error) {
      console.error('Error removing watchlist item:', error);
      throw error;
    }
  },

  // Add collaborator to watchlist (only allowed for owners)
  async addCollaborator(watchlistId: string, collaboratorId: string): Promise<WatchlistCollaborator> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User must be authenticated');

    // Check if user is owner
    await watchlistSecurityService.assertCanModifyWatchlist(session.user.id, watchlistId);

    // Add the collaborator directly
    const { data, error } = await supabase
      .from('watchlist_collaborators')
      .insert({
        watchlist_id: watchlistId,
        user_id: collaboratorId,
        permission_level: 'read'
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Failed to add collaborator');
    }
    
    // Convert to WatchlistCollaborator type
    return {
      id: data.id,
      watchlist_id: data.watchlist_id,
      user_id: data.user_id,
      permission_level: data.permission_level,
      created_at: data.created_at
    };
  },

  // Remove collaborator from watchlist (only allowed for owners)
  async removeCollaborator(watchlistId: string, collaboratorId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User must be authenticated');

    // Check if user is owner
    await watchlistSecurityService.assertCanModifyWatchlist(session.user.id, watchlistId);

    // Delete the collaborator directly
    const { error } = await supabase
      .from('watchlist_collaborators')
      .delete()
      .eq('watchlist_id', watchlistId)
      .eq('user_id', collaboratorId);

    if (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  },

  // Get collaborators for a watchlist
  async getCollaborators(watchlistId: string): Promise<WatchlistCollaborator[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    // Check if user can access this watchlist
    await watchlistSecurityService.assertCanAccessWatchlist(session.user.id, watchlistId);
    
    // If they can access it, fetch the collaborators directly
    const { data, error } = await supabase
      .from('watchlist_collaborators')
      .select('*')
      .eq('watchlist_id', watchlistId);

    if (error) {
      console.error('Error fetching collaborators:', error);
      throw error;
    }

    return data || [];
  }
};
