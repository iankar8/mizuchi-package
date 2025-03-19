import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Enable debug mode for detailed logging in development only
const DEBUG = import.meta.env.MODE === 'development';

// Core configuration values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Throw error if missing in production
if (import.meta.env.MODE === 'production' && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error("Supabase credentials are required in production.");
}

// Use the configuration for global timeout value, default to 15 seconds
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

// Display configuration for debugging
if (DEBUG) {
  console.log(`Supabase Configuration:\n- URL: ${supabaseUrl}\n- Key: ${supabaseAnonKey.substring(0, 20)}...\n- Timeout: ${API_TIMEOUT}ms`);
}

// Warning for production use of fallback keys
if (import.meta.env.MODE === 'production' && 
    (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  console.warn(
    "WARNING: Using fallback Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env variables in production."
  );
}

// Instance management
let supabaseInstance: SupabaseClient<Database> | null = null;
let isInitializing = false;
let initializationError: Error | null = null;
let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;

// Standardize the storage key name across the app
const STORAGE_KEY = 'sb-mizuchi-auth-key-v3';

/**
 * Creates and returns a singleton Supabase client instance.
 * This implementation ensures only one client exists.
 */
export const createClient = (): SupabaseClient<Database> => {
  // Return existing instance if available
  if (supabaseInstance) {
    DEBUG && console.log('[Supabase] Using existing client instance');
    return supabaseInstance;
  }
  
  // Prevent concurrent initialization
  if (isInitializing) {
    throw new Error('Supabase client is currently initializing. Please wait.');
  }
  
  if (initializationError) {
    console.error('[Supabase] Previous initialization failed:', initializationError);
    // Reset error and try again
    initializationError = null;
  }
  
  DEBUG && console.log('[Supabase] Creating new client instance'); 
  
  try {
    isInitializing = true;
    
    // Create new Supabase client with optimized settings
    supabaseInstance = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: STORAGE_KEY,
        flowType: 'implicit', // Use implicit flow for simpler auth
        debug: DEBUG
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        headers: {
          'X-Mizuchi-Client': 'web-app',
          'X-Mizuchi-Version': '1.0'
        },
        // Add a fetch interceptor with timeout
        fetch: (url, options = {}) => {
          // Create an AbortController to handle timeouts
          const controller = new AbortController();
          const { signal } = controller;
          
          // Merge user-provided signal with our timeout signal
          const userSignal = (options as any).signal;
          
          if (userSignal) {
            // If the request already has a signal, respect it and combine with ours
            userSignal.addEventListener('abort', () => controller.abort());
          }
          
          // Set the timeout
          const timeoutId = setTimeout(() => {
            controller.abort();
          }, API_TIMEOUT);
          
          // Make the request with our signal
          return fetch(url, {
            ...options,
            signal
          }).then(response => {
            clearTimeout(timeoutId);
            return response;
          }).catch(error => {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
              // Transform the abort error into a timeout error
              throw new Error(`Request to ${url} timed out after ${API_TIMEOUT}ms`);
            }
            throw error;
          });
        }
      },
      db: {
        schema: 'public' as const
      }
    });
  
    DEBUG && console.log('[Supabase] Client created successfully');
  
    // Setup auth state listener for the new instance
    // Define the setupAuthStateListener function before calling it
    const setupAuthStateListener = () => {
      if (!supabaseInstance) return;
      
      try {
        supabaseInstance.auth.onAuthStateChange((event, session) => {
          DEBUG && console.log(`[Supabase] Auth state change: ${event}`, {
            hasSession: !!session,
            userId: session?.user?.id,
            email: session?.user?.email,
            expires: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
          });
          
          // Store a backup of critical session info in local storage
          if (session) {
            try {
              localStorage.setItem(`${STORAGE_KEY}_backup`, JSON.stringify({
                userId: session.user.id,
                email: session.user.email,
                aud: session.user.aud,
                expires_at: session.expires_at,
                timestamp: Date.now()
              }));
            } catch (e) {
              console.error('[Supabase] Failed to store session backup:', e);
            }
          }
        });
      } catch (error) {
        console.error('[Supabase] Failed to set up auth state listener:', error);
      }
    };
    
    setupAuthStateListener();
    
    // Setup token refresh mechanism
    setupTokenRefresh();
    
    return supabaseInstance;
  } catch (error) {
    // Handle initialization error
    initializationError = error instanceof Error ? error : new Error(String(error));
    console.error('[Supabase] Initialization failed:', initializationError);
    throw initializationError;
  } finally {
    isInitializing = false;
  }
};

/**
 * Setup proactive token refresh at regular intervals
 * This prevents token expiration issues by refreshing the token before it expires
 */
const setupTokenRefresh = () => {
  if (!supabaseInstance) return;
  
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }
  
  // Check token every 5 minutes (300000ms)
  tokenRefreshInterval = setInterval(async () => {
    try {
      const { data } = await supabaseInstance.auth.getSession();
      
      if (data.session) {
        const expiresAt = data.session.expires_at; 
        const expiresInSeconds = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : 0;
        
        DEBUG && console.log(`[Supabase] Token expires in ${expiresInSeconds} seconds`);
        
        // If token will expire in less than 10 minutes (600 seconds), refresh it
        if (expiresInSeconds < 600) {
          DEBUG && console.log('[Supabase] Token expiring soon, refreshing...');
          const { error } = await supabaseInstance.auth.refreshSession();
          
          if (error) {
            console.error('[Supabase] Failed to refresh token:', error);
          } else {
            DEBUG && console.log('[Supabase] Token refreshed successfully');
          }
        }
      }
    } catch (error) {
      console.error('[Supabase] Error checking token expiration:', error);
    }
  }, 300000); // Check every 5 minutes
};

/**
 * Attempt to refresh the authentication token
 * Returns true if successful, false otherwise
 */
export const refreshAuthToken = async (): Promise<boolean> => {
  if (!supabaseInstance) return false;
  
  // Use a timeout to prevent hanging indefinitely
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<{data: any, error: any}>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Token refresh timed out after 10s"));
    }, 10000);
  });
  
  try {
    // Race the refresh against a timeout
    const { data, error } = await Promise.race([
      supabaseInstance.auth.refreshSession(),
      timeoutPromise
    ]);
    clearTimeout(timeoutId);
  
    if (error) {
      console.error('[Supabase] Error refreshing token:', error);
      return false;
    }
    
    if (!data?.session) {
      console.error('[Supabase] Refresh succeeded but no session returned');
      return false;
    }
    
    DEBUG && console.log(`[Supabase] Token refreshed successfully, expires in ${
      data.session.expires_at ? 
        Math.floor((data.session.expires_at * 1000 - Date.now()) / 1000) + 's' : 
        'unknown'
    }`);
    
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[Supabase] Exception refreshing token:', error);
    return false;
  }
};

/**
 * Cleanup function to prevent memory leaks
 * Call this when your application is shutting down
 */
export const cleanupSupabaseClient = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
  // Perform any other cleanup needed
  console.log('[Supabase] Client resources cleaned up');
};

/**
 * Setup auth state listener to track auth changes
 */
const setupAuthStateListener = () => {
  if (!supabaseInstance) return;
  
  try {
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      DEBUG && console.log(`[Supabase] Auth state change: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        expires: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
      });
      
      // Store a backup of critical session info in local storage
      if (session) {
        try {
          localStorage.setItem(`${STORAGE_KEY}_backup`, JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            aud: session.user.aud,
            expires_at: session.expires_at,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('[Supabase] Failed to store session backup:', e);
        }
      }
    });
  } catch (error) {
    console.error('[Supabase] Failed to set up auth state listener:', error);
  }
};

/**
 * Export the singleton instance for use throughout the app
 * This ensures all components use the same Supabase instance
 */
export const supabase = createClient();

/**
 * Ensures that a valid session exists before performing an operation
 * If the session is invalid or expiring soon, it attempts to refresh it
 * Uses the tokenManager to prevent race conditions during token refresh
 */
export const withSessionCheck = async <T>(
  operation: () => Promise<T>,
  options: { timeout?: number; retries?: number } = {}
): Promise<T> => {
  // Default options
  const { timeout, retries = 1 } = options;
  let attemptCount = 0;
  
  async function attemptOperation(): Promise<T> {
    try {
      attemptCount++;
      
      // Check if session exists or is expiring soon
      const { data } = await supabase.auth.getSession();
      const tokenManager = (await import('./tokenManager')).tokenManager;
      
      if (!data.session) {
        // No session exists, attempt to refresh
        DEBUG && console.log('[Supabase] No session found, attempting refresh');
        
        const refreshResult = await tokenManager.refreshToken();
        if (!refreshResult) {
          throw new Error('No valid authentication session found');
        }
      } else {
        // Check if token is expiring soon (within 5 minutes)
        const expiresAt = data.session.expires_at;
        const expiresInSeconds = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : 0;
        
        if (expiresInSeconds < 300) {
          // Token expiring soon, refresh it
          DEBUG && console.log(`[Supabase] Token expires in ${expiresInSeconds}s, refreshing before operation`);
          await tokenManager.refreshToken();
        }
      }
      
      // Apply timeout if specified
      if (timeout) {
        return withTimeout(operation(), timeout, 'Database operation');
      }
      
      // Run the operation with valid session
      return await operation();
    } catch (error: any) {
      // Check if this is an RLS/permission error that might benefit from a token refresh
      const isAuthError = 
        error.code === 'PGRST301' || 
        error.message?.includes('JWT') || 
        error.message?.includes('permission denied') ||
        error.message?.includes('not authenticated');
      
      // For auth errors, try refreshing the token if we haven't exceeded retry count
      if (isAuthError && attemptCount <= retries) {
        DEBUG && console.log(`[Supabase] Auth error detected (attempt ${attemptCount}), refreshing token and retrying`);
        
        // Import tokenManager dynamically to avoid circular dependencies
        const tokenManager = (await import('./tokenManager')).tokenManager;
        
        // Force refresh the token
        const refreshed = await tokenManager.refreshToken();
        
        if (refreshed) {
          // Wait a brief moment for the refresh to take effect
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Retry the operation
          return attemptOperation();
        }
      }
      
      // Either not an auth error or we've exceeded retries
      console.error(`[Supabase] Error in withSessionCheck (attempt ${attemptCount}/${retries + 1}):`, error);
      throw error;
    }
  }
  
  // Start the first attempt
  return attemptOperation();
};

/**
 * Helper function to create a promise with timeout
 */
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation "${operationName}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
};

/**
 * Tests the Supabase connection comprehensively.
 * This improved version includes more detailed diagnostics information.
 */
export const testSupabaseConnection = async () => {
  DEBUG && console.log('[Supabase] Testing connection...');
  
  const results: any = {
    timestamp: new Date().toISOString(),
    clientInfo: {
      storageKey: STORAGE_KEY,
      url: supabaseUrl,
      anonKey: supabaseAnonKey.substring(0, 12) + '...',
      environment: import.meta.env.MODE,
      browserUrl: window.location.href,
    },
    storage: {
      localStorageKeys: Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') || k.includes('supabase') || k.includes('mizuchi'))
        .map(k => ({ key: k, length: (localStorage.getItem(k) || '').length }))
    }
  };
  
  try {
    // Test 1: Test basic API connectivity (no auth required)
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        }
      });
      
      results.apiConnectivity = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
      
      if (!response.ok) {
        console.error(`[Supabase] API connectivity test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      results.apiConnectivity = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('[Supabase] API connectivity test failed:', error);
    }
    
    // Test 2: Check authentication status
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    results.auth = {
      success: !!session,
      message: session ? 'Authenticated' : 'Not authenticated',
      data: session ? {
        userId: session.user.id,
        email: session.user.email,
        expires: new Date(session.expires_at * 1000).toISOString(),
      } : null,
      error: authError
    };
    
    if (authError) {
      console.error('[Supabase] Auth error:', authError);
    }

    // Test 3: Check database access
    try {
      const { error: publicError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      // PGRST116 is "No rows found" which is fine - we're just testing connectivity
      results.database = {
        success: !publicError || publicError.code === 'PGRST116',
        message: !publicError || publicError.code === 'PGRST116' ? 
                'Database connection successful' : 'Database connection failed',
        error: publicError && publicError.code !== 'PGRST116' ? publicError : null
      };
    } catch (error) {
      results.database = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('[Supabase] Database test failed:', error);
    }
    
    if (results.database && !results.database.success) {
      console.error('[Supabase] Database connection failed:', results.database.error);
    }
    
    // Test 4: Try a more specific database query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .maybeSingle();
    
    // If we get PGRST116, that's actually fine - we just don't have data yet
    if (error && error.code !== 'PGRST116') {
      console.error('[Supabase] Specific query failed:', error);
    }
    
    // Test 5: Check realtime connection by attempting to subscribe
    // and unsubscribe to a channel
    let realtimeSuccess = false;
    let realtimeError = null;
    try {
      const channel = supabase.channel('test-connection');
      const subscription = channel
        .on('presence', { event: 'sync' }, () => {})
        .subscribe((status) => {
          realtimeSuccess = status === 'SUBSCRIBED';
        });
      
      // Wait briefly for the subscription to establish
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clean up subscription
      supabase.removeChannel(channel);
    } catch (e) {
      realtimeError = e;
      console.error('[Supabase] Realtime connection failed:', e);
    }
    
    results.realtime = {
      success: realtimeSuccess,
      message: realtimeSuccess ? 'Realtime connection successful' : 'Realtime connection failed',
      error: realtimeError
    };
    
    // Test 6: Check token refresh capability
    try {
      const refreshResult = await refreshAuthToken();
      results.tokenRefresh = {
        attempted: true,
        success: refreshResult
      };
    } catch (e) {
      results.tokenRefresh = {
        attempted: true,
        success: false,
        error: e
      };
    }
    
    return {
      success: results.auth.success && results.database.success,
      ...results
    };
  } catch (error) {
    console.error('[Supabase] Connection test failed with exception:', error);
    return { success: false, error, timestamp: new Date().toISOString() };
  }
};

/**
 * Comprehensively clears all Supabase-related storage and resets the client.
 * This is a nuclear option for fixing auth issues.
 */
export const clearSupabaseStorage = async () => {
  DEBUG && console.log('[Supabase] Clearing all storage...');
  
  try {
    // Step 1: Sign out the current user with global scope
    try {
      await supabase.auth.signOut({ scope: 'global' });
      DEBUG && console.log('[Supabase] User signed out successfully');
    } catch (e) {
      console.error('[Supabase] Error during signOut:', e);
      // Continue with cleanup even if signOut fails
    }
    
    // Step 2: Clear all localStorage items related to Supabase
    const keysToRemove: string[] = [];
    const prefixesToMatch = ['sb-', 'supabase', 'mizuchi', 'GoTrue'];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && prefixesToMatch.some(prefix => key.includes(prefix))) {
        keysToRemove.push(key);
        DEBUG && console.log(`[Supabase] Removing localStorage item: ${key}`);
        localStorage.removeItem(key);
      }
    }
    
    // Try clearing by direct key names known to be used by Supabase
    const directKeys = [
      STORAGE_KEY,
      'sb-refresh-token',
      'sb-access-token',
      'supabase.auth.token',
      'supabase.auth.refreshToken',
      'sb-provider-token',
      'supabase.auth.user',
      'sb-provider-token'
    ];
    
    directKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore errors
      }
    });
    
    // Step 3: Clear any session cookies
    const cookiesRemoved: string[] = [];
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.trim().split('=')[0];
      if (name && prefixesToMatch.some(prefix => name.includes(prefix))) {
        // Remove cookie with different path/domain combinations to be thorough
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname};`;
        cookiesRemoved.push(name);
      }
    });
    
    // Step 4: Clean up refresh interval
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
      tokenRefreshInterval = null;
    }
    
    // Step 5: Completely reset the Supabase instance
    supabaseInstance = null;
    
    DEBUG && console.log('[Supabase] Storage cleared successfully', {
      localStorageKeysRemoved: keysToRemove,
      cookiesRemoved
    });
    
    return true;
  } catch (error) {
    console.error('[Supabase] Error clearing storage:', error);
    return false;
  }
};

/**
 * Gets the current authentication status with detailed session information.
 * This function adds extensive logging to help diagnose auth issues.
 */
export const getAuthStatus = async () => {
  DEBUG && console.log('[Supabase] Checking auth status...');
  
  try {
    // Get the current session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Supabase] Error getting session:', error);
      return { authenticated: false, error };
    }
    
    const sessionInfo = data?.session ? {
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        role: data.session.user.role,
        aud: data.session.user.aud,
      },
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_at ? 
                 Math.floor((data.session.expires_at * 1000 - Date.now()) / 1000) : 
                 null,
    } : null;
    
    DEBUG && console.log('[Supabase] Auth status:', {
      hasSession: !!data.session,
      sessionInfo,
      storageItems: Object.keys(localStorage)
        .filter(key => key.startsWith('sb-') || key.includes(STORAGE_KEY))
        .length
    });
    
    if (data.session) {
      return { 
        authenticated: true, 
        session: sessionInfo,
        raw: data.session
      };
    } else {
      return { authenticated: false, error: 'No session found' };
    }
  } catch (e) {
    console.error('[Supabase] Error checking auth status:', e);
    return { authenticated: false, error: e };
  }
};

/**
 * Performs a direct authentication check by calling the Supabase auth API.
 * This is useful for troubleshooting when the normal auth flow isn't working.
 */
export const performDirectAuthCheck = async () => {
  try {
    // Create a completely separate client instance
    const directClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        flowType: 'implicit',
        storageKey: 'direct_auth_check',
      }
    });
    
    // Try to get the session
    const { data, error } = await directClient.auth.getSession();
    
    // Compare with our main client
    const mainStatus = await getAuthStatus();
    
    return {
      directAuth: {
        success: !!data?.session,
        hasUser: !!data?.session?.user,
        error: error || null,
      },
      mainAuth: mainStatus,
      storage: {
        keys: Object.keys(localStorage)
          .filter(key => key.startsWith('sb-') || 
                         key.includes('supabase') || 
                         key.includes('mizuchi')),
      }
    };
  } catch (e) {
    console.error('[Supabase] Direct auth check failed:', e);
    return { success: false, error: e };
  }
};


