// Neon DB configuration
import { Pool, PoolClient } from 'pg';

// Create an optimized connection pool for NeonDB
const pool = new Pool({
  connectionString: process.env.NEONDB_URL,
  ssl: {
    // In production, this should be set to true for better security
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
  // NeonDB-specific optimizations
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection couldn't be established
});

// Monitor the connection pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle NeonDB client', err);
});

// Function to get a client with retry logic
async function getClientWithRetry(maxRetries = 3, initialDelay = 300): Promise<PoolClient> {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      return await pool.connect();
    } catch (err) {
      lastError = err;
      retries++;
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, retries) * (0.5 + Math.random() * 0.5);
      console.log(`NeonDB connection attempt ${retries} failed, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Failed to connect to NeonDB after ${maxRetries} attempts: ${lastError}`);
}

// Function to set the current user for RLS
export async function setCurrentUser(userId: string | null) {
  const client = await getClientWithRetry();
  try {
    if (!userId) {
      await client.query("SELECT set_current_user(NULL)");
      return;
    }
    
    await client.query("SELECT set_current_user($1)", [userId]);
  } finally {
    client.release();
  }
}

// Query wrapper with automatic user context setting
export async function queryWithUser(userId: string | null, text: string, params: any[] = []) {
  let client;
  try {
    client = await getClientWithRetry();
    
    // Set the user context for RLS
    await client.query("SELECT set_current_user($1)", [userId]);
    
    // Execute the query
    const result = await client.query(text, params);
    return { data: result.rows, error: null };
  } catch (error) {
    console.error('Database query error:', error);
    return { data: null, error };
  } finally {
    if (client) client.release();
  }
}

// Simple query function without user context
export async function query(text: string, params: any[] = []) {
  let client;
  try {
    client = await getClientWithRetry();
    const result = await client.query(text, params);
    return { data: result.rows, error: null };
  } catch (error) {
    console.error('Database query error:', error);
    return { data: null, error };
  } finally {
    if (client) client.release();
  }
}

// Transaction support with retry logic
export async function withTransaction(callback: (client: PoolClient) => Promise<any>) {
  let client;
  try {
    client = await getClientWithRetry();
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (client) {
      try {
        // Attempt to roll back the transaction
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Health check function to test database connection
export async function healthCheck(): Promise<boolean> {
  try {
    const { error } = await query('SELECT 1');
    return !error;
  } catch (err) {
    console.error('Database health check failed:', err);
    return false;
  }
}

// Export the pool for direct use
export const db = pool;

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing NeonDB pool connections...');
  try {
    await pool.end();
    console.log('NeonDB pool has ended');
  } catch (err) {
    console.error('Error closing NeonDB pool:', err);
  }
  process.exit(0);
});
