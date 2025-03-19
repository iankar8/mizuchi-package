// NeonDB Connection Manager
// This class provides optimized connection handling specifically for NeonDB serverless Postgres

import { Pool, PoolClient } from 'pg';

interface ConnectionManagerOptions {
  maxPoolSize?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  maxRetries?: number;
  initialRetryDelayMs?: number;
}

export class NeonDBConnectionManager {
  private static instance: NeonDBConnectionManager;
  private pool: Pool;
  private maxRetries: number;
  private initialRetryDelayMs: number;
  private isShuttingDown: boolean = false;

  private constructor(connectionString: string, options: ConnectionManagerOptions = {}) {
    const {
      maxPoolSize = 10,
      idleTimeoutMillis = 30000,
      connectionTimeoutMillis = 10000,
      maxRetries = 3,
      initialRetryDelayMs = 300
    } = options;

    this.maxRetries = maxRetries;
    this.initialRetryDelayMs = initialRetryDelayMs;

    // Create connection pool with NeonDB optimized settings
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      },
      max: maxPoolSize,
      idleTimeoutMillis,
      connectionTimeoutMillis,
    });

    // Set up error handling for the pool
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle NeonDB client', err);
    });

    // Set up graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * Get singleton instance of the connection manager
   */
  public static getInstance(connectionString?: string, options?: ConnectionManagerOptions): NeonDBConnectionManager {
    if (!NeonDBConnectionManager.instance) {
      if (!connectionString) {
        connectionString = process.env.NEONDB_URL;
        if (!connectionString) {
          throw new Error('NeonDB connection string is required');
        }
      }
      NeonDBConnectionManager.instance = new NeonDBConnectionManager(connectionString, options);
    }
    return NeonDBConnectionManager.instance;
  }

  /**
   * Get a client from the pool with retry logic
   */
  public async getClient(): Promise<PoolClient> {
    let retries = 0;
    let lastError: any;

    while (retries < this.maxRetries && !this.isShuttingDown) {
      try {
        return await this.pool.connect();
      } catch (err) {
        lastError = err;
        retries++;
        
        // Exponential backoff with jitter for more natural retry timing
        const delay = this.initialRetryDelayMs * Math.pow(2, retries) * (0.5 + Math.random() * 0.5);
        console.log(`NeonDB connection attempt ${retries} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (this.isShuttingDown) {
      throw new Error('Cannot get database connection during shutdown');
    }

    throw new Error(`Failed to connect to NeonDB after ${this.maxRetries} attempts: ${lastError}`);
  }

  /**
   * Execute a query with a client from the pool
   */
  public async query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const client = await this.getClient();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  /**
   * Execute a function within a transaction
   */
  public async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
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

  /**
   * Check database connection health
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (err) {
      console.error('Database health check failed:', err);
      return false;
    }
  }

  /**
   * Set up graceful shutdown of the connection pool
   */
  private setupGracefulShutdown(): void {
    // Handle process termination signals
    const shutdownHandler = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log('Closing NeonDB pool connections...');
      try {
        await this.pool.end();
        console.log('NeonDB connection pool has closed');
      } catch (err) {
        console.error('Error closing NeonDB connection pool:', err);
      }
    };

    // Register handlers for common termination signals
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
    process.on('SIGUSR2', shutdownHandler); // For Nodemon restart
  }

  /**
   * Close the connection pool explicitly
   */
  public async close(): Promise<void> {
    this.isShuttingDown = true;
    await this.pool.end();
  }
}

// Export a default instance
export default NeonDBConnectionManager.getInstance();