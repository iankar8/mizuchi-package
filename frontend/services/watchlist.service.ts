/**
 * @deprecated This file is deprecated. Use the modular implementation from @/services/watchlist/index.ts instead.
 * 
 * This file now re-exports the centralized watchlist service to maintain
 * backward compatibility while we transition.
 */

import watchlistService from '@/services/watchlist';
// Define the types locally to avoid import issues
import type { UserProfile } from '@/types/auth';

// Re-export types for backward compatibility 
export interface Profile extends UserProfile {}

// Define Watchlist interface locally
export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  last_modified: string;
  member_count: number;
  profiles?: UserProfile | null | any;
  userRole?: 'owner' | 'admin' | 'editor' | 'viewer' | null;
}

// Define WatchlistItem interface locally
export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  added_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: UserProfile | null | any;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

// Define WatchlistCollaborator interface locally
export interface WatchlistCollaborator {
  id: string;
  watchlist_id: string;
  user_id: string;
  permission_level: 'view' | 'edit' | 'admin' | string;
  created_at: string;
  profiles?: UserProfile | null | any;
}

export interface WatchlistMember extends Omit<WatchlistCollaborator, 'permission_level'> {
  watchlist_id: string;
  user_id: string;
  joined_at?: string;
  permission_level: 'view' | 'edit' | 'admin' | string;
}

type RealtimeCallback = (payload: any) => void;

// Re-export the watchlist service methods
export const WatchlistService = {
  // Forward all requests to the new modular service

  testConnection: async () => {
    console.warn('Using deprecated WatchlistService.testConnection. Please migrate to the new service.');
    const { testSupabaseConnection } = await import('@/utils/supabase/client');
    return testSupabaseConnection();
  },

  getWatchlists: async () => {
    console.warn('Using deprecated WatchlistService.getWatchlists. Please migrate to the new service.');
    const result = await watchlistService.getUserWatchlists();
    return { data: result, error: null };
  },

  getWatchlistItems: async (watchlistId: string) => {
    console.warn('Using deprecated WatchlistService.getWatchlistItems. Please migrate to the new service.');
    const { items } = await watchlistService.getWatchlistWithItems(watchlistId);
    return { data: items, error: null };
  },

  getWatchlistWithItems: async (watchlistId: string) => {
    console.warn('Using deprecated WatchlistService.getWatchlistWithItems. Please migrate to the new service.');
    return watchlistService.getWatchlistWithItems(watchlistId);
  },

  createWatchlist: async (name: string, isShared: boolean = false, symbols: string[] = []) => {
    console.warn('Using deprecated WatchlistService.createWatchlist. Please migrate to the new service.');
    const watchlist = await watchlistService.createWatchlist({
      name, 
      is_shared: isShared,
      description: null
    });
    
    if (watchlist && symbols.length > 0) {
      for (const symbol of symbols) {
        await watchlistService.addItemToWatchlist(watchlist.id, symbol);
      }
    }
    
    return { watchlist, error: null };
  },

  addItems: async (watchlistId: string, symbols: string[], notes: string = '') => {
    console.warn('Using deprecated WatchlistService.addItems. Please migrate to the new service.');
    const results = [];
    for (const symbol of symbols) {
      const item = await watchlistService.addItemToWatchlist(watchlistId, symbol, notes);
      if (item) results.push(item);
    }
    return { data: results, error: null };
  },

  removeItem: async (watchlistId: string, symbol: string) => {
    console.warn('Using deprecated WatchlistService.removeItem. Please migrate to the new service.');
    // First get the item ID
    const { items } = await watchlistService.getWatchlistWithItems(watchlistId);
    // Add type assertion to WatchlistItem
    const item = items.find((i: any) => i.symbol === symbol) as WatchlistItem;
    if (!item?.id) return { data: null, error: { message: 'Item not found' } };
    
    const success = await watchlistService.removeItemFromWatchlist(item.id);
    return { data: success, error: null };
  },

  shareWatchlist: async (watchlistId: string, userEmail: string, role: 'viewer' | 'editor' | 'admin' = 'viewer') => {
    console.warn('Using deprecated WatchlistService.shareWatchlist. Please migrate to the new service.');
    // Map legacy role values to new permission level values
    const permissionLevel = role === 'viewer' ? 'view' : role === 'editor' ? 'edit' : 'admin';
    const success = await watchlistService.shareWatchlist(watchlistId, userEmail, permissionLevel);
    return { data: success, error: null };
  },

  removeUserFromWatchlist: async (watchlistId: string, userId: string) => {
    console.warn('Using deprecated WatchlistService.removeUserFromWatchlist. Please migrate to the new service.');
    // Get the collaborator ID
    const collaborators = await watchlistService.getWatchlistCollaborators(watchlistId);
    const collab = collaborators.find(c => c.user_id === userId);
    if (!collab?.id) return { data: null, error: { message: 'Collaborator not found' } };
    
    const success = await watchlistService.removeCollaborator(collab.id);
    return { data: success, error: null };
  },

  getWatchlistMembers: async (watchlistId: string) => {
    console.warn('Using deprecated WatchlistService.getWatchlistMembers. Please migrate to the new service.');
    const collaborators = await watchlistService.getWatchlistCollaborators(watchlistId);
    return { data: collaborators, error: null };
  },

  getUserRole: async (watchlistId: string) => {
    console.warn('Using deprecated WatchlistService.getUserRole. Please migrate to the new service.');
    const { items } = await watchlistService.getWatchlistWithItems(watchlistId);
    const watchlist = await watchlistService.getUserWatchlists();
    const owned = watchlist.some(w => w.id === watchlistId && w.userRole === 'owner');
    if (owned) return 'owner';
    
    // Get collaborator role
    const collaborators = await watchlistService.getWatchlistCollaborators(watchlistId);
    const { supabase } = await import('@/utils/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const collab = collaborators.find(c => c.user_id === user.id);
    return collab?.permission_level || null;
  },

  isWatchlistOwner: async (watchlistId: string) => {
    console.warn('Using deprecated WatchlistService.isWatchlistOwner. Please migrate to the new service.');
    const role = await WatchlistService.getUserRole(watchlistId);
    return role === 'owner';
  },

  hasPermission: async (watchlistId: string, requiredRole: 'viewer' | 'editor' | 'admin') => {
    console.warn('Using deprecated WatchlistService.hasPermission. Please migrate to the new service.');
    const role = await WatchlistService.getUserRole(watchlistId);
    
    if (!role) return false;
    if (role === 'owner') return true;
    
    const roleHierarchy: Record<string, number> = {
      viewer: 0,
      editor: 1,
      admin: 2
    };
    
    // Make sure role is a valid key in our hierarchy
    if (!(role in roleHierarchy)) {
      console.error(`Unknown role: ${role}`);
      return false;
    }
    
    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  },

  deleteWatchlist: async (watchlistId: string) => {
    console.warn('Using deprecated WatchlistService.deleteWatchlist. Please migrate to the new service.');
    const success = await watchlistService.deleteWatchlist(watchlistId);
    return { data: success, error: null };
  },

  updateWatchlist: async (watchlistId: string, updates: { name?: string, is_public?: boolean }) => {
    console.warn('Using deprecated WatchlistService.updateWatchlist. Please migrate to the new service.');
    const success = await watchlistService.updateWatchlist(watchlistId, {
      name: updates.name,
      is_shared: updates.is_public
    });
    return { data: success, error: null };
  },

  subscribeToWatchlist: (watchlistId: string, callback: RealtimeCallback) => {
    console.warn('Using deprecated WatchlistService.subscribeToWatchlist. Please migrate to the new service.');
    return watchlistService.subscribeToWatchlist(watchlistId, callback);
  },

  subscribeToAllWatchlists: (callback: RealtimeCallback) => {
    console.warn('Using deprecated WatchlistService.subscribeToAllWatchlists. Please migrate to the new service.');
    return watchlistService.subscribeToAllWatchlists(callback);
  },

  subscribeToWatchlistItems: (watchlistId: string, callback: RealtimeCallback) => {
    console.warn('Using deprecated WatchlistService.subscribeToWatchlistItems. Please migrate to the new service.');
    return watchlistService.subscribeToWatchlistItems(watchlistId, callback);
  }
};
