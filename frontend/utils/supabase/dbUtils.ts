import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, refreshAuthToken } from './client';

// Enable debug mode for detailed logging
const DEBUG = true;

/**
 * Helper function to safely execute a database query with
 * automatic token refresh and retry logic for RLS errors
 */
export const safeQuery = async <T = any>(
  queryFn: (client: SupabaseClient) => Promise<{ data: T; error: any }>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    name?: string;
  } = {}
): Promise<{ data: T; error: any }> => {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    name = 'database query'
  } = options;

  let lastResult = { data: null as any, error: null as any };
  let attempts = 0;

  while (attempts <= maxRetries) {
    attempts++;
    
    if (attempts > 1 && DEBUG) {
      console.log(`[DB] Retry attempt ${attempts-1} for ${name}`);
    }

    try {
      lastResult = await queryFn(supabase);

      // If no error, return the result
      if (!lastResult.error) {
        return lastResult;
      }

      // Handle specific error types
      if (lastResult.error.code === 'PGRST301') {
        if (DEBUG) console.warn(`[DB] Permission denied (${lastResult.error.code}) on ${name}, refreshing token...`);
        
        // Try to refresh the token
        const refreshed = await refreshAuthToken();
        if (!refreshed) {
          if (DEBUG) console.error(`[DB] Token refresh failed on ${name}`);
          
          // If this is the last attempt, just return
          if (attempts >= maxRetries) break;
        } else {
          if (DEBUG) console.log(`[DB] Token refreshed successfully for ${name}`);
        }
      } else if (lastResult.error.code === 'PGRST116') {
        // No rows found is not an error to retry
        return lastResult;
      } else {
        if (DEBUG) console.error(`[DB] Query error (${lastResult.error.code}) on ${name}:`, lastResult.error);
        
        // If this is the last attempt, just return
        if (attempts >= maxRetries) break;
      }

      // Wait before retrying
      if (attempts <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      console.error(`[DB] Exception executing ${name}:`, error);
      lastResult.error = error;
      
      // If this is the last attempt, just break out
      if (attempts >= maxRetries) break;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  return lastResult;
};

/**
 * Map database field names to TypeScript interface field names
 * This ensures consistent handling of field name differences
 */
export const mapDatabaseFields = <T>(
  data: any,
  fieldMappings: Record<string, string>
): T => {
  if (!data) return null;
  
  // Copy the original data
  const result = { ...data };
  
  // Apply field mappings
  for (const [dbField, interfaceField] of Object.entries(fieldMappings)) {
    if (dbField in result) {
      result[interfaceField] = result[dbField];
      // Only delete the source field if it's different from the target
      if (dbField !== interfaceField) {
        delete result[dbField];
      }
    }
  }
  
  return result as T;
};

/**
 * Map TypeScript interface field names to database field names
 * This is the opposite of mapDatabaseFields and is used for write operations
 */
export const mapInterfaceFields = <T>(
  data: any,
  fieldMappings: Record<string, string>
): T => {
  if (!data) return null;
  
  // Copy the original data
  const result = { ...data };
  
  // Apply reverse field mappings
  for (const [dbField, interfaceField] of Object.entries(fieldMappings)) {
    if (interfaceField in result) {
      result[dbField] = result[interfaceField];
      // Only delete the source field if it's different from the target
      if (dbField !== interfaceField) {
        delete result[interfaceField];
      }
    }
  }
  
  return result as T;
};

/**
 * Common field mappings for watchlist-related entities
 * This centralizes the mapping definitions to avoid duplication
 */
export const watchlistFieldMappings = {
  is_public: 'is_shared',
  created_by: 'owner_id',
};

/**
 * Check if a database table exists and is accessible
 * Returns true if the table exists and is accessible, false otherwise
 */
export const checkTableAccess = async (tableName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1)
      .single();
    
    // PGRST116 means "No rows found" which is fine - the table exists but is empty
    return !error || error.code === 'PGRST116';
  } catch (error) {
    console.error(`[DB] Error checking table access for ${tableName}:`, error);
    return false;
  }
};

/**
 * Get diagnostic information about database connection and tables
 * Useful for troubleshooting connection issues
 */
export const getDatabaseDiagnostics = async (): Promise<Record<string, any>> => {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tables: {}
  };
  
  // Check authentication first
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    results.auth = {
      authenticated: !!session,
      error: error ? { message: error.message, code: error.code } : null,
      userId: session?.user?.id,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
    };
  } catch (authError) {
    results.auth = {
      authenticated: false,
      error: { message: String(authError) }
    };
  }
  
  // Check common tables
  const tablesToCheck = [
    'profiles', 
    'watchlists', 
    'watchlist_items', 
    'watchlist_collaborators',
    'research_notes',
    'note_collaborators'
  ];
  
  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
        .single();
      
      results.tables[table] = {
        accessible: !error || error.code === 'PGRST116',
        error: error && error.code !== 'PGRST116' ? { 
          message: error.message, 
          code: error.code,
          details: error.details
        } : null
      };
    } catch (tableError) {
      results.tables[table] = {
        accessible: false,
        error: { message: String(tableError) }
      };
    }
    
    // Add a small delay between checks to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};