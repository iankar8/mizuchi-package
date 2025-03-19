// NeonDB client configuration
import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.NEONDB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Simple query function with error handling
export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { data: result.rows, error: null };
  } catch (error) {
    console.error('Database query error:', error);
    return { data: null, error };
  } finally {
    client.release();
  }
}

// Transaction support
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Export the pool for direct use
export const db = pool;
