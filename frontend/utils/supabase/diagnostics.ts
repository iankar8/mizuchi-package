import { supabase, withTimeout, testSupabaseConnection, refreshAuthToken } from './client';
import { tokenManager } from './tokenManager';
import { withResultHandling } from './resultUtils';
import { testRLSPolicies } from './errorHandlers';
import { DBStatusCode, Result } from "@/types/supabase";

// Import legacy diagnostics dependencies
import { verifyRLSPolicies, diagnoseRLSError } from './rlsVerifier';
import { validateDatabaseSchema } from './schemaValidator';

/**
 * Run a comprehensive set of Supabase connection diagnostics
 * @returns Result object with detailed diagnostics information
 */
export async function runDiagnostics(): Promise<Result<any>> {
  return withResultHandling(async () => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE,
      tests: {}
    };
    
    // Test 1: Basic connection
    try {
      const connectionResult = await withTimeout(
        testSupabaseConnection(),
        15000,
        "Connection Test"
      );
      results.tests.connection = connectionResult;
    } catch (error) {
      results.tests.connection = { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
    
    // Test 2: Authentication
    try {
      const { data: { session } } = await supabase.auth.getSession();
      results.tests.authentication = {
        success: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresIn: session?.expires_at ? 
                   Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : 
                   null
      };
    } catch (error) {
      results.tests.authentication = { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
    
    // Test 3: Token refresh
    try {
      if (results.tests.authentication?.success) {
        const refreshed = await refreshAuthToken();
        results.tests.tokenRefresh = {
          success: refreshed,
          message: refreshed ? "Token refreshed successfully" : "Token refresh failed"
        };
      } else {
        results.tests.tokenRefresh = {
          success: false,
          message: "Skipped - not authenticated"
        };
      }
    } catch (error) {
      results.tests.tokenRefresh = { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
    
    // Test 4: TokenManager status
    try {
      results.tests.tokenManager = {
        isRefreshing: tokenManager.isCurrentlyRefreshing(),
        expiresAt: tokenManager.getTokenExpiresAt(),
        hasRecentlyRefreshed: tokenManager.hasRecentlyRefreshed()
      };
    } catch (error) {
      results.tests.tokenManager = { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
    
    // Test 5: Database tables access - test key tables with RLS
    if (results.tests.authentication?.success) {
      const tables = ['profiles', 'watchlists', 'watchlist_items', 'watchlist_collaborators'];
      results.tests.databaseAccess = {};
      
      for (const table of tables) {
        try {
          const result = await testRLSPolicies(table, ['select']);
          results.tests.databaseAccess[table] = result.data || { select: false };
        } catch (error) {
          results.tests.databaseAccess[table] = { 
            select: false,
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      }
    } else {
      results.tests.databaseAccess = {
        message: "Skipped - not authenticated"
      };
    }
    
    // Test 6: Check storage - env vars and localStorage
    try {
      const keys = Object.keys(localStorage)
        .filter(k => k.includes('supabase') || k.startsWith('sb-') || k.includes('mizuchi'))
        .map(key => ({
          key,
          length: (localStorage.getItem(key) || '').length,
          preview: (localStorage.getItem(key) || '').substring(0, 20) + '...'
        }));
        
      results.tests.storage = {
        itemCount: keys.length,
        hasToken: keys.some(k => k.key.includes('auth.token')),
        items: keys
      };
    } catch (error) {
      results.tests.storage = { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
    
    // Test 7: Realtime connection test
    try {
      let realtimeStatus = "unknown";
      const connectionPromise = new Promise<string>((resolve) => {
        const channel = supabase.channel('diagnostics');
        
        // Set a timeout
        const timeoutId = setTimeout(() => {
          resolve("timeout");
          supabase.removeChannel(channel);
        }, 5000);
        
        channel
          .on('presence', { event: 'sync' }, () => {
            clearTimeout(timeoutId);
            resolve("connected");
            supabase.removeChannel(channel);
          })
          .on('system', { event: 'disconnect' }, () => {
            resolve("disconnected");
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeoutId);
              resolve("subscribed");
            } else if (status === 'CHANNEL_ERROR') {
              clearTimeout(timeoutId);
              resolve("error");
              supabase.removeChannel(channel);
            }
          });
      });
      
      realtimeStatus = await connectionPromise;
      
      results.tests.realtime = {
        success: realtimeStatus === "subscribed" || realtimeStatus === "connected",
        status: realtimeStatus
      };
    } catch (error) {
      results.tests.realtime = { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
    
    // Overall success - all critical tests passed
    results.success = 
      results.tests.connection?.success && 
      results.tests.authentication?.success &&
      results.tests.databaseAccess?.profiles?.select === true;
    
    return results;
  });
}

/**
 * Run a quick health check for Supabase
 * @returns Result object with health status
 */
export async function quickHealthCheck(): Promise<Result<{ healthy: boolean }>> {
  return withResultHandling(async () => {
    try {
      // Check if we can access the API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (!response.ok) {
        return {
          healthy: false,
          status: response.status,
          message: `API returned ${response.status}: ${response.statusText}`
        };
      }
      
      // Check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      const hasSession = !!session;
      
      // If we have a session, check database access
      let databaseAccessible = false;
      if (hasSession) {
        try {
          // A simple query that should work with RLS if authenticated
          const { error } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .maybeSingle();
            
          databaseAccessible = !error || error.code === 'PGRST116'; // PGRST116 is "no rows found" - that's ok
        } catch (e) {
          databaseAccessible = false;
        }
      }
      
      return {
        healthy: response.ok && (!hasSession || databaseAccessible),
        apiAccessible: response.ok,
        authenticated: hasSession,
        databaseAccessible: hasSession ? databaseAccessible : null
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
}

/**
 * Clear all Supabase related data and reset the connection
 * @returns Result object indicating success or failure
 */
export async function resetSupabaseConnection(): Promise<Result<boolean>> {
  return withResultHandling(async () => {
    try {
      // 1. Sign out the user
      await supabase.auth.signOut({ scope: 'global' });
      
      // 2. Clear all local storage related to Supabase
      const keysToRemove = Object.keys(localStorage)
        .filter(key => key.includes('supabase') || key.startsWith('sb-') || key.includes('mizuchi'));
      
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
      
      // 3. Clear session storage
      const sessionKeysToRemove = Object.keys(sessionStorage)
        .filter(key => key.includes('supabase') || key.startsWith('sb-') || key.includes('mizuchi'));
      
      for (const key of sessionKeysToRemove) {
        sessionStorage.removeItem(key);
      }
      
      // 4. Clear cookies
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.trim().split('=')[0];
        if (name.includes('supabase') || name.startsWith('sb') || name.includes('mizuchi')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      });
      
      // 5. Attempt to refresh the page if we're in a browser
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      
      return true;
    } catch (error) {
      console.error("Error resetting Supabase connection:", error);
      return false;
    }
  });
}

/**
 * Diagnostics utility for Supabase connection issues
 * @deprecated Use the functional approaches runDiagnostics(), quickHealthCheck(), and resetSupabaseConnection() instead
 */
export class SupabaseDiagnostics {
  /**
   * Helper method to add timeout to promises used in diagnostics
   */
  private static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs = 5000,
    defaultValue: T
  ): Promise<T> {
    try {
      const timeoutPromise = new Promise<T>((_, reject) => {
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
      console.error(`Diagnostic operation timed out:`, error);
      return defaultValue;
    }
  }

  static async runConnectionDiagnostics() {
    console.warn('SupabaseDiagnostics.runConnectionDiagnostics is deprecated. Use runDiagnostics() instead.');
    
    const startTime = Date.now();
    
    // Results object
    const results = {
      success: false,
      authStatus: {
        isAuthenticated: false,
        userInfo: null,
        tokenExpiry: null,
        errorMessage: null
      },
      connectionStatus: {
        connected: false,
        latency: null,
        errorMessage: null
      },
      schemaStatus: {
        valid: false,
        version: null,
        missingTables: [],
        missingFields: {},
        accessErrors: {}
      },
      rlsPolicyStatus: {
        checkedTables: [],
        policiesVerified: 0,
        accessGranted: 0,
        accessDenied: 0,
        tableResults: []
      },
      diagnosticTime: 0
    };
    
    try {
      // 1. Check authentication status
      await this.checkAuthStatus(results);
      
      // 2. Check connection status with ping
      await this.checkConnectionStatus(results);
      
      // Only continue with other checks if authentication and connection succeed
      if (results.authStatus.isAuthenticated && results.connectionStatus.connected) {
        // 3. Verify schema
        await this.checkSchema(results);
        
        // 4. Check RLS policies for main tables
        await this.checkRLSPolicies(results);
      }
      
      // Mark overall success based on auth and connection
      results.success = results.authStatus.isAuthenticated && results.connectionStatus.connected;
    } catch (error) {
      console.error('[SupabaseDiagnostics] Error running diagnostics:', error);
    }
    
    // Calculate total diagnostic time
    results.diagnosticTime = Date.now() - startTime;
    
    return results;
  }
  
  /**
   * Check authentication status
   */
  private static async checkAuthStatus(results: any) {
    try {
      // Get the current session and user
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        results.authStatus.errorMessage = error.message;
        return;
      }
      
      if (data?.session) {
        results.authStatus.isAuthenticated = true;
        
        // Extract user info
        const { user } = data.session;
        results.authStatus.userInfo = {
          id: user.id,
          email: user.email,
          lastSignIn: user.last_sign_in_at,
          createdAt: user.created_at
        };
        
        // Get token expiry information
        results.authStatus.tokenExpiry = {
          expiresAt: data.session.expires_at,
          expiresIn: data.session.expires_at 
            ? (data.session.expires_at - Math.floor(Date.now() / 1000)) 
            : null,
          refreshToken: !!data.session.refresh_token
        };
        
        // Get token expiry from token manager
        const tokenExpiresAt = tokenManager.getTokenExpiresAt();
        if (tokenExpiresAt) {
          results.authStatus.tokenExpiry.managerExpiresAt = tokenExpiresAt;
          results.authStatus.tokenExpiry.managerExpiresIn = 
            tokenExpiresAt - Math.floor(Date.now() / 1000);
        }
      }
    } catch (error) {
      console.error('[SupabaseDiagnostics] Error checking auth status:', error);
      results.authStatus.errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown authentication error';
    }
  }
  
  /**
   * Check connection status with a ping
   */
  private static async checkConnectionStatus(results: any) {
    try {
      const startTime = Date.now();
      
      // Perform a simple query to check connection
      const { data, error } = await this.withTimeout(
        supabase.from('profiles').select('count').limit(1),
        5000,
        { data: null, error: { message: "Connection test timed out" } }
      );
        
      const endTime = Date.now();
      
      if (error) {
        results.connectionStatus.errorMessage = error.message;
        return;
      }
      
      results.connectionStatus.connected = true;
      results.connectionStatus.latency = endTime - startTime;
    } catch (error) {
      console.error('[SupabaseDiagnostics] Error checking connection:', error);
      results.connectionStatus.errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown connection error';
    }
  }
  
  /**
   * Check database schema
   */
  private static async checkSchema(results: any) {
    try {
      const schemaResults = await validateDatabaseSchema();
      
      results.schemaStatus = {
        valid: schemaResults.valid,
        version: schemaResults.version,
        missingTables: schemaResults.missingTables,
        missingFields: schemaResults.missingFields,
        accessErrors: schemaResults.accessErrors
      };
    } catch (error) {
      console.error('[SupabaseDiagnostics] Error checking schema:', error);
      results.schemaStatus.errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown schema validation error';
    }
  }
  
  /**
   * Check RLS policies for critical tables
   */
  private static async checkRLSPolicies(results: any) {
    try {
      const tables = ['watchlists', 'watchlist_items', 'profiles', 'research_notes'];
      const policyResults = await verifyRLSPolicies(tables);
      
      results.rlsPolicyStatus.checkedTables = tables;
      results.rlsPolicyStatus.tableResults = [];
      
      let totalPolicies = 0;
      let grantedAccess = 0;
      let deniedAccess = 0;
      
      // Process the results for each table
      for (const [table, tableResults] of policyResults.entries()) {
        const tableData = {
          table,
          operations: tableResults.map(result => ({
            operation: result.operation,
            hasAccess: result.hasAccess,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          }))
        };
        
        results.rlsPolicyStatus.tableResults.push(tableData);
        
        // Count totals
        totalPolicies += tableResults.length;
        grantedAccess += tableResults.filter(r => r.hasAccess).length;
        deniedAccess += tableResults.filter(r => !r.hasAccess).length;
      }
      
      results.rlsPolicyStatus.policiesVerified = totalPolicies;
      results.rlsPolicyStatus.accessGranted = grantedAccess;
      results.rlsPolicyStatus.accessDenied = deniedAccess;
    } catch (error) {
      console.error('[SupabaseDiagnostics] Error checking RLS policies:', error);
      results.rlsPolicyStatus.errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown RLS policy verification error';
    }
  }
  
  /**
   * Diagnose a specific Supabase error
   * @param error The error to diagnose
   * @param context Additional context about the operation
   * @returns Diagnostic information about the error
   */
  static async diagnoseError(error: any, context: any = {}) {
    try {
      // Get basic error information
      const errorInfo = {
        message: error instanceof Error ? error.message : String(error),
        code: error.code,
        details: error.details,
        stack: error instanceof Error ? error.stack : undefined
      };
      
      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession();
      const authStatus = {
        isAuthenticated: !!session,
        expiresAt: session?.expires_at,
        expiresIn: session?.expires_at 
          ? (session.expires_at - Math.floor(Date.now() / 1000)) 
          : null
      };
      
      // Check if it's an RLS policy error
      const rlsDiagnosis = await diagnoseRLSError(error, context);
      
      return {
        timestamp: new Date().toISOString(),
        error: errorInfo,
        authStatus,
        rlsDiagnosis: rlsDiagnosis.data,
        tokenManager: {
          isRefreshing: tokenManager.isCurrentlyRefreshing(),
          expiresAt: tokenManager.getTokenExpiresAt(),
          recentlyRefreshed: tokenManager.hasRecentlyRefreshed()
        },
        context
      };
    } catch (diagError) {
      console.error('[SupabaseDiagnostics] Error during diagnosis:', diagError);
      return {
        timestamp: new Date().toISOString(),
        error: {
          message: error instanceof Error ? error.message : String(error),
          diagnosisError: diagError instanceof Error ? diagError.message : String(diagError)
        },
        context
      };
    }
  }
}