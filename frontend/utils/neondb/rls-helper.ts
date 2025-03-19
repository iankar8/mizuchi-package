// NeonDB Row Level Security (RLS) Helper
// Provides utilities for RLS user context management

import connectionManager from './connection-manager';
import { PoolClient } from 'pg';

/**
 * Sets the current user context for RLS policies
 * 
 * @param userId The UUID of the user to set in context, or null for anonymous access
 */
export async function setCurrentUser(userId: string | null): Promise<void> {
  const client = await connectionManager.getClient();
  try {
    if (!userId) {
      await client.query("SELECT set_current_user(NULL)");
    } else {
      await client.query("SELECT set_current_user($1)", [userId]);
    }
  } finally {
    client.release();
  }
}

/**
 * Executes a query with the user context automatically set for RLS
 * 
 * @param userId The user ID to set for RLS context
 * @param text SQL query text
 * @param params Query parameters 
 * @returns Query result with data and error properties
 */
export async function queryWithUser<T = any>(
  userId: string | null, 
  text: string, 
  params: any[] = []
): Promise<{ data: T[] | null, error: Error | null }> {
  const client = await connectionManager.getClient();
  try {
    // Set the user context for RLS
    await client.query("SELECT set_current_user($1)", [userId]);
    
    // Execute the query
    const result = await client.query(text, params);
    return { data: result.rows, error: null };
  } catch (error) {
    console.error('Database query error:', error);
    return { data: null, error: error as Error };
  } finally {
    client.release();
  }
}

/**
 * Executes multiple operations within a transaction with RLS user context
 * 
 * @param userId The user ID to set for RLS context
 * @param callback Function that receives client and executes queries
 * @returns Result from the callback function
 */
export async function withUserTransaction<T>(
  userId: string | null,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return connectionManager.withTransaction(async (client) => {
    // Set the user context for the transaction
    await client.query("SELECT set_current_user($1)", [userId]);
    return callback(client);
  });
}

/**
 * Tests if the current user can access a specific watchlist
 * 
 * @param userId The user ID to test
 * @param watchlistId The watchlist ID to check access for
 * @returns Boolean indicating if user has access
 */
export async function canAccessWatchlist(
  userId: string | null,
  watchlistId: string
): Promise<boolean> {
  const { data } = await queryWithUser(
    userId,
    `SELECT EXISTS (
      SELECT 1 FROM watchlists WHERE id = $1
    ) as has_access`,
    [watchlistId]
  );
  
  return data?.[0]?.has_access === true;
}

/**
 * Tests if the current user is the owner of a specific watchlist
 * 
 * @param userId The user ID to test
 * @param watchlistId The watchlist ID to check ownership for
 * @returns Boolean indicating if user is the owner
 */
export async function isWatchlistOwner(
  userId: string | null,
  watchlistId: string
): Promise<boolean> {
  if (!userId) return false;
  
  const { data } = await queryWithUser(
    userId,
    `SELECT EXISTS (
      SELECT 1 FROM watchlists WHERE id = $1 AND owner_id = $2
    ) as is_owner`,
    [watchlistId, userId]
  );
  
  return data?.[0]?.is_owner === true;
}

export default {
  setCurrentUser,
  queryWithUser,
  withUserTransaction,
  canAccessWatchlist,
  isWatchlistOwner
};