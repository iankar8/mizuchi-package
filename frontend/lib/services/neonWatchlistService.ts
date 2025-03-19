import { queryWithUser } from '@/utils/neondb/config';

// Interface definitions aligned with database schema
interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  owner_id: string;
  updated_at: string;
}

interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  notes: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

interface WatchlistCollaborator {
  id: string;
  watchlist_id: string;
  user_id: string;
  permission_level: 'read' | 'write' | 'admin';
  created_at: string;
}

// Neon DB implementation of the watchlist service
export const neonWatchlistService = {
  // Get all watchlists for a user
  async getWatchlists(userId: string | null): Promise<Watchlist[]> {
    if (!userId) return [];
    
    const { data, error } = await queryWithUser(
      userId,
      'SELECT * FROM watchlists ORDER BY created_at DESC'
    );
    
    if (error) {
      console.error('Error fetching watchlists:', error);
      return [];
    }
    
    return data || [];
  },
  
  // Get a specific watchlist by ID
  async getWatchlist(userId: string | null, watchlistId: string): Promise<Watchlist | null> {
    if (!userId || !watchlistId) return null;
    
    const { data, error } = await queryWithUser(
      userId,
      'SELECT * FROM watchlists WHERE id = $1',
      [watchlistId]
    );
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    return data[0];
  },
  
  // Create a new watchlist
  async createWatchlist(
    userId: string,
    name: string,
    description: string | null = null,
    isPublic: boolean = false
  ): Promise<Watchlist | null> {
    if (!userId) return null;
    
    const { data, error } = await queryWithUser(
      userId,
      `INSERT INTO watchlists (name, description, owner_id, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, userId, isPublic]
    );
    
    if (error || !data || data.length === 0) {
      console.error('Error creating watchlist:', error);
      return null;
    }
    
    // Log activity
    await this.logActivity(userId, data[0].id, 'create_watchlist', { name });
    
    return data[0];
  },
  
  // Update a watchlist
  async updateWatchlist(
    userId: string,
    watchlistId: string,
    updates: Partial<Watchlist>
  ): Promise<Watchlist | null> {
    if (!userId || !watchlistId) return null;
    
    // Build the SET clause dynamically based on provided updates
    const setFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (updates.name !== undefined) {
      setFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      setFields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    
    if (updates.is_public !== undefined) {
      setFields.push(`is_public = $${paramIndex++}`);
      values.push(updates.is_public);
    }
    
    if (setFields.length === 0) return null;
    
    // Add the watchlist ID to the values array
    values.push(watchlistId);
    
    const { data, error } = await queryWithUser(
      userId,
      `UPDATE watchlists 
       SET ${setFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (error || !data || data.length === 0) {
      console.error('Error updating watchlist:', error);
      return null;
    }
    
    // Log activity
    await this.logActivity(userId, watchlistId, 'update_watchlist', updates);
    
    return data[0];
  },
  
  // Delete a watchlist
  async deleteWatchlist(userId: string, watchlistId: string): Promise<boolean> {
    if (!userId || !watchlistId) return false;
    
    const { error } = await queryWithUser(
      userId,
      'DELETE FROM watchlists WHERE id = $1',
      [watchlistId]
    );
    
    if (error) {
      console.error('Error deleting watchlist:', error);
      return false;
    }
    
    return true;
  },
  
  // Get all items in a watchlist
  async getWatchlistItems(userId: string | null, watchlistId: string): Promise<WatchlistItem[]> {
    if (!userId || !watchlistId) return [];
    
    const { data, error } = await queryWithUser(
      userId,
      'SELECT * FROM watchlist_items WHERE watchlist_id = $1 ORDER BY created_at DESC',
      [watchlistId]
    );
    
    if (error) {
      console.error('Error fetching watchlist items:', error);
      return [];
    }
    
    return data || [];
  },
  
  // Add an item to a watchlist
  async addWatchlistItem(
    userId: string,
    watchlistId: string,
    symbol: string,
    notes: string | null = null
  ): Promise<WatchlistItem | null> {
    if (!userId || !watchlistId) return null;
    
    const { data, error } = await queryWithUser(
      userId,
      `INSERT INTO watchlist_items (watchlist_id, symbol, notes, added_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [watchlistId, symbol, notes, userId]
    );
    
    if (error || !data || data.length === 0) {
      console.error('Error adding watchlist item:', error);
      return null;
    }
    
    // Log activity
    await this.logActivity(userId, watchlistId, 'add_item', { symbol });
    
    return data[0];
  },
  
  // Update a watchlist item
  async updateWatchlistItem(
    userId: string,
    itemId: string,
    updates: Partial<WatchlistItem>
  ): Promise<WatchlistItem | null> {
    if (!userId || !itemId) return null;
    
    // Build the SET clause dynamically based on provided updates
    const setFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (updates.symbol !== undefined) {
      setFields.push(`symbol = $${paramIndex++}`);
      values.push(updates.symbol);
    }
    
    if (updates.notes !== undefined) {
      setFields.push(`notes = $${paramIndex++}`);
      values.push(updates.notes);
    }
    
    if (setFields.length === 0) return null;
    
    // Add the item ID to the values array
    values.push(itemId);
    
    const { data, error } = await queryWithUser(
      userId,
      `UPDATE watchlist_items 
       SET ${setFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (error || !data || data.length === 0) {
      console.error('Error updating watchlist item:', error);
      return null;
    }
    
    // Get the watchlist ID for activity logging
    const watchlistId = data[0].watchlist_id;
    
    // Log activity
    await this.logActivity(userId, watchlistId, 'update_item', updates);
    
    return data[0];
  },
  
  // Delete a watchlist item
  async deleteWatchlistItem(userId: string, itemId: string): Promise<boolean> {
    if (!userId || !itemId) return false;
    
    // First get the item to get the watchlist_id for activity logging
    const { data: itemData } = await queryWithUser(
      userId,
      'SELECT * FROM watchlist_items WHERE id = $1',
      [itemId]
    );
    
    const watchlistId = itemData?.[0]?.watchlist_id;
    const symbol = itemData?.[0]?.symbol;
    
    const { error } = await queryWithUser(
      userId,
      'DELETE FROM watchlist_items WHERE id = $1',
      [itemId]
    );
    
    if (error) {
      console.error('Error deleting watchlist item:', error);
      return false;
    }
    
    // Log activity if we have the watchlist ID
    if (watchlistId) {
      await this.logActivity(userId, watchlistId, 'delete_item', { symbol });
    }
    
    return true;
  },
  
  // Get collaborators for a watchlist
  async getCollaborators(userId: string, watchlistId: string): Promise<WatchlistCollaborator[]> {
    if (!userId || !watchlistId) return [];
    
    const { data, error } = await queryWithUser(
      userId,
      'SELECT * FROM watchlist_collaborators WHERE watchlist_id = $1',
      [watchlistId]
    );
    
    if (error) {
      console.error('Error fetching collaborators:', error);
      return [];
    }
    
    return data || [];
  },
  
  // Add a collaborator to a watchlist
  async addCollaborator(
    userId: string,
    watchlistId: string,
    collaboratorId: string,
    permissionLevel: 'read' | 'write' | 'admin' = 'read'
  ): Promise<WatchlistCollaborator | null> {
    if (!userId || !watchlistId || !collaboratorId) return null;
    
    const { data, error } = await queryWithUser(
      userId,
      `INSERT INTO watchlist_collaborators (watchlist_id, user_id, permission_level)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [watchlistId, collaboratorId, permissionLevel]
    );
    
    if (error || !data || data.length === 0) {
      console.error('Error adding collaborator:', error);
      return null;
    }
    
    // Log activity
    await this.logActivity(userId, watchlistId, 'add_collaborator', { collaboratorId, permissionLevel });
    
    return data[0];
  },
  
  // Remove a collaborator from a watchlist
  async removeCollaborator(
    userId: string,
    watchlistId: string,
    collaboratorId: string
  ): Promise<boolean> {
    if (!userId || !watchlistId || !collaboratorId) return false;
    
    const { error } = await queryWithUser(
      userId,
      'DELETE FROM watchlist_collaborators WHERE watchlist_id = $1 AND user_id = $2',
      [watchlistId, collaboratorId]
    );
    
    if (error) {
      console.error('Error removing collaborator:', error);
      return false;
    }
    
    // Log activity
    await this.logActivity(userId, watchlistId, 'remove_collaborator', { collaboratorId });
    
    return true;
  },
  
  // Log activity for a watchlist
  async logActivity(
    userId: string,
    watchlistId: string,
    actionType: string,
    actionDetails: any = {}
  ): Promise<void> {
    if (!userId || !watchlistId) return;
    
    try {
      await queryWithUser(
        userId,
        `INSERT INTO watchlist_activity (watchlist_id, user_id, action_type, action_details)
         VALUES ($1, $2, $3, $4)`,
        [watchlistId, userId, actionType, JSON.stringify(actionDetails)]
      );
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },
  
  // Get activity for a watchlist
  async getActivity(userId: string, watchlistId: string): Promise<any[]> {
    if (!userId || !watchlistId) return [];
    
    const { data, error } = await queryWithUser(
      userId,
      `SELECT * FROM watchlist_activity 
       WHERE watchlist_id = $1 
       ORDER BY created_at DESC`,
      [watchlistId]
    );
    
    if (error) {
      console.error('Error fetching activity:', error);
      return [];
    }
    
    return data || [];
  }
};

export default neonWatchlistService;
