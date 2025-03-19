/**
 * Supabase database types for Mizuchi application
 */

// Database status codes for error handling
export enum DBStatusCode {
  SUCCESS = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  SERVER_ERROR = 500
}

// Generic result type for database operations
export interface Result<T = any> {
  data: T | null;
  error: Error | null;
  status: DBStatusCode;
}

// User profiles
export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  updated_at?: string;
  created_at?: string;
}

// Watchlist types
export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  last_modified_by?: string | null;
  is_public?: boolean;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  added_by?: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  price?: number | null;
  price_updated_at?: string | null;
}

export interface WatchlistMember {
  id: string;
  watchlist_id: string;
  user_id: string;
  permission_level: 'view' | 'edit' | 'admin';
  created_at: string;
  updated_at?: string;
  invited_by?: string;
  profiles?: UserProfile;
}

// Realtime subscription types
export interface RealtimePostgresChangesPayload<T> {
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  new: T;
  old: T;
}

export interface WatchlistChanges extends Watchlist {}
export interface WatchlistItemChanges extends WatchlistItem {}

export type WatchlistRealtimeChanges = RealtimePostgresChangesPayload<Watchlist>;
export type WatchlistItemRealtimeChanges = RealtimePostgresChangesPayload<WatchlistItem>;
