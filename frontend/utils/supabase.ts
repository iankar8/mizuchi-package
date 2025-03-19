import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// In a production environment, these would be pulled from environment variables
const supabaseUrl = 'https://example.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || 'public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      watchlists: {
        Row: {
          id: string
          name: string
          created_at: string
          user_id: string
          description?: string | null
          is_default: boolean
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          user_id: string
          description?: string | null
          is_default?: boolean
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          user_id?: string
          description?: string | null
          is_default?: boolean
        }
      }
      watchlist_items: {
        Row: {
          id: string
          watchlist_id: string
          symbol: string
          added_at: string
          notes?: string | null
        }
        Insert: {
          id?: string
          watchlist_id: string
          symbol: string
          added_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          watchlist_id?: string
          symbol?: string
          added_at?: string
          notes?: string | null
        }
      }
      recent_searches: {
        Row: {
          id: string
          user_id: string
          symbol: string
          company_name: string
          searched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          company_name: string
          searched_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          company_name?: string
          searched_at?: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
