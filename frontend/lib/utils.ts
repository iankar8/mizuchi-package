import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getDatabaseDiagnostics } from "@/utils/supabase/dbUtils";
import { supabase, testSupabaseConnection, refreshAuthToken } from "@/utils/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a random string for CSRF tokens
 * @param length Length of the token to generate
 * @returns A random string of the specified length
 */
export function generateCSRFToken(length: number = 32): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let result = '';
  
  // Use crypto API if available for better randomness
  if (window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += characters[values[i] % charactersLength];
    }
  } else {
    // Fallback to Math.random
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
  }
  
  return result;
}

/**
 * Get a CSRF token from sessionStorage or generate a new one
 * @returns A CSRF token
 */
export function getCSRFToken(): string {
  let token = sessionStorage.getItem('csrf_token');
  
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('csrf_token', token);
  }
  
  return token;
}

/**
 * Validate that a CSRF token matches the one in sessionStorage
 * @param token The token to validate
 * @returns True if the token is valid, false otherwise
 */
export function validateCSRFToken(token: string): boolean {
  const storedToken = sessionStorage.getItem('csrf_token');
  
  if (!storedToken || !token) {
    return false;
  }
  
  // Use constant time comparison to prevent timing attacks
  return timingSafeEqual(token, storedToken);
}

/**
 * Perform a constant-time comparison of two strings to prevent timing attacks
 * @param a First string
 * @param b Second string 
 * @returns True if the strings are equal, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Run comprehensive diagnostics on Supabase connection
 * Useful for troubleshooting connection and authentication issues
 * @returns Detailed diagnostic information
 */
export const runConnectionDiagnostics = async () => {
  console.log('Running Supabase connection diagnostics...');
  
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: import.meta.env.MODE,
    steps: {}
  };
  
  // Step 1: Basic connectivity test
  try {
    const connectionTest = await testSupabaseConnection();
    results.steps.connectionTest = connectionTest;
  } catch (error) {
    results.steps.connectionTest = { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
  
  // Step 2: Get current auth status
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    results.steps.authStatus = {
      authenticated: !!session,
      error: error ? { message: error.message } : null,
      sessionInfo: session ? {
        userId: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        expiresIn: session.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : null,
      } : null
    };
    
    // If session exists but is expiring soon, refresh it
    if (session && session.expires_at) {
      const expiresInSeconds = session.expires_at - Math.floor(Date.now() / 1000);
      
      if (expiresInSeconds < 600) { // Less than 10 minutes
        results.steps.tokenRefresh = { needed: true };
        try {
          const refreshed = await refreshAuthToken();
          results.steps.tokenRefresh.success = refreshed;
        } catch (refreshError) {
          results.steps.tokenRefresh.success = false;
          results.steps.tokenRefresh.error = refreshError instanceof Error ? 
            refreshError.message : String(refreshError);
        }
      } else {
        results.steps.tokenRefresh = { needed: false };
      }
    }
  } catch (authError) {
    results.steps.authStatus = {
      authenticated: false,
      error: authError instanceof Error ? authError.message : String(authError)
    };
  }
  
  // Step 3: Check database tables
  try {
    const dbDiagnostics = await getDatabaseDiagnostics();
    results.steps.databaseDiagnostics = dbDiagnostics;
  } catch (dbError) {
    results.steps.databaseDiagnostics = {
      error: dbError instanceof Error ? dbError.message : String(dbError)
    };
  }
  
  // Step 4: Look for local storage conflicts
  try {
    const storageKeys = Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') || k.includes('supabase') || k.includes('mizuchi'))
      .map(k => ({ key: k, length: (localStorage.getItem(k) || '').length }));
    
    results.steps.localStorage = {
      count: storageKeys.length,
      keys: storageKeys
    };
  } catch (storageError) {
    results.steps.localStorage = {
      error: storageError instanceof Error ? storageError.message : String(storageError)
    };
  }
  
  // Compute overall status
  results.overallStatus = {
    connected: results.steps.connectionTest?.success || false,
    authenticated: results.steps.authStatus?.authenticated || false,
    databaseAccessible: results.steps.databaseDiagnostics?.tables ? 
      Object.values(results.steps.databaseDiagnostics.tables).some((t: any) => t.accessible) : 
      false
  };
  
  return results;
};
