/**
 * Cache service for optimizing API calls and data retrieval
 * 
 * This service provides a centralized way to cache data throughout the application
 * to reduce redundant API calls and improve performance. It supports both memory
 * and localStorage caching with configurable TTLs.
 */

// Type for cached items with metadata
interface CacheItem<T> {
  value: T;
  expires: number; // timestamp when the cache expires
}

// Cache options
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'local'; // Type of storage (memory or localStorage)
}

// Default options
const DEFAULT_OPTIONS: CacheOptions = {
  ttl: 5 * 60 * 1000, // 5 minutes
  storage: 'memory',
};

// In-memory cache store
const memoryCache: Map<string, CacheItem<any>> = new Map();

/**
 * Cache management service
 */
const cacheService = {
  /**
   * Set a value in the cache
   * 
   * @param key The key to store the value under
   * @param value The value to cache
   * @param options Cache options (ttl, storage type)
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const { ttl, storage } = { ...DEFAULT_OPTIONS, ...options };
    const expires = Date.now() + ttl!;
    const item: CacheItem<T> = { value, expires };

    if (storage === 'local') {
      try {
        localStorage.setItem(
          `cache:${key}`,
          JSON.stringify({ value, expires })
        );
      } catch (e) {
        console.error('Error storing item in localStorage:', e);
        // Fallback to memory cache if localStorage fails
        memoryCache.set(key, item);
      }
    } else {
      memoryCache.set(key, item);
    }
  },

  /**
   * Get a value from the cache
   * 
   * @param key The key to retrieve
   * @param options Cache options
   * @returns The cached value or undefined if not found or expired
   */
  get<T>(key: string, options: CacheOptions = {}): T | undefined {
    const { storage } = { ...DEFAULT_OPTIONS, ...options };
    
    let item: CacheItem<T> | undefined;
    
    if (storage === 'local') {
      try {
        const storedItem = localStorage.getItem(`cache:${key}`);
        if (storedItem) {
          item = JSON.parse(storedItem) as CacheItem<T>;
        }
      } catch (e) {
        console.error('Error retrieving item from localStorage:', e);
        item = memoryCache.get(key) as CacheItem<T>;
      }
    } else {
      item = memoryCache.get(key) as CacheItem<T>;
    }

    // If item doesn't exist or has expired, return undefined
    if (!item || item.expires < Date.now()) {
      this.remove(key, options);
      return undefined;
    }

    return item.value;
  },

  /**
   * Remove an item from the cache
   * 
   * @param key The key to remove
   * @param options Cache options
   */
  remove(key: string, options: CacheOptions = {}): void {
    const { storage } = { ...DEFAULT_OPTIONS, ...options };
    
    if (storage === 'local') {
      try {
        localStorage.removeItem(`cache:${key}`);
      } catch (e) {
        console.error('Error removing item from localStorage:', e);
      }
    }
    
    memoryCache.delete(key);
  },

  /**
   * Clear all cached items
   * 
   * @param storage Whether to clear 'memory', 'local', or 'all' (both)
   */
  clear(storage: 'memory' | 'local' | 'all' = 'all'): void {
    if (storage === 'memory' || storage === 'all') {
      memoryCache.clear();
    }
    
    if (storage === 'local' || storage === 'all') {
      try {
        // Only clear cache-related items
        Object.keys(localStorage)
          .filter(key => key.startsWith('cache:'))
          .forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.error('Error clearing localStorage:', e);
      }
    }
  },
  
  /**
   * Retrieve a value from cache or fetch it if not available
   * 
   * @param key The cache key
   * @param fetchFn Function to call if cache miss
   * @param options Cache options
   * @returns The cached or fetched value
   */
  async getOrFetch<T>(
    key: string, 
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = this.get(key, options) as T | undefined;
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // On cache miss, fetch the data
    try {
      const newValue = await fetchFn();
      
      // Cache the fetched value
      this.set(key, newValue, options);
      
      return newValue;
    } catch (error) {
      console.error(`Error fetching data for key ${key}:`, error);
      throw error;
    }
  },
  
  /**
   * Check if a key exists and is not expired in the cache
   * 
   * @param key The key to check
   * @param options Cache options
   * @returns Whether the key exists and is valid
   */
  has(key: string, options: CacheOptions = {}): boolean {
    return this.get(key, options) !== undefined;
  },
  
  /**
   * Get all keys in the cache
   * 
   * @param storage Which storage to get keys from ('memory', 'local', or 'all')
   * @returns Array of cache keys
   */
  keys(storage: 'memory' | 'local' | 'all' = 'all'): string[] {
    const keys: string[] = [];
    
    if (storage === 'memory' || storage === 'all') {
      // Get keys from memory cache
      memoryCache.forEach((_, key) => keys.push(key));
    }
    
    if (storage === 'local' || storage === 'all') {
      try {
        // Get keys from localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cache:')) {
            keys.push(key.substring(6)); // Remove 'cache:' prefix
          }
        }
      } catch (e) {
        console.error('Error getting keys from localStorage:', e);
      }
    }
    
    return [...new Set(keys)]; // Remove duplicates
  },
  
  /**
   * Get the remaining TTL for a cached item in milliseconds
   * 
   * @param key The key to check
   * @param options Cache options
   * @returns Remaining TTL in milliseconds, or 0 if expired/not found
   */
  getTTL(key: string, options: CacheOptions = {}): number {
    const { storage } = { ...DEFAULT_OPTIONS, ...options };
    
    let item: CacheItem<any> | undefined;
    
    if (storage === 'local') {
      try {
        const storedItem = localStorage.getItem(`cache:${key}`);
        if (storedItem) {
          item = JSON.parse(storedItem) as CacheItem<any>;
        }
      } catch (e) {
        console.error('Error retrieving TTL from localStorage:', e);
        item = memoryCache.get(key);
      }
    } else {
      item = memoryCache.get(key);
    }
    
    if (!item) return 0;
    
    const remainingTime = item.expires - Date.now();
    return Math.max(0, remainingTime);
  }
};

export default cacheService;