/**
 * Enhanced Token Manager for Supabase authentication
 * 
 * This module provides improved token management with the following features:
 * - Proactive token refresh before expiration
 * - Robust error handling and retry mechanisms
 * - Distributed refresh events to prevent multiple refresh attempts
 * - Prevention of token expiration issues
 */

import { supabase } from './client';

// Enable debug mode in development
const DEBUG = import.meta.env.MODE === 'development';

// Constants for token management
const TOKEN_EXPIRY_THRESHOLD_SECONDS = 300; // Refresh token if less than 5 minutes remaining
const TOKEN_REFRESH_LOCK_KEY = 'mizuchi_token_refresh_lock';
const TOKEN_REFRESH_LOCK_EXPIRY = 10000; // Lock expiry in ms (10 seconds)
const TOKEN_REFRESH_RETRY_DELAY = 1000; // Initial retry delay in ms
const TOKEN_REFRESH_MAX_RETRIES = 3; // Maximum number of retries

// We use these events to coordinate token refresh between tabs
const TOKEN_REFRESH_REQUEST_EVENT = 'mizuchi:token-refresh-request';
const TOKEN_REFRESH_COMPLETE_EVENT = 'mizuchi:token-refresh-complete';

/**
 * Session info for diagnostics
 */
interface SessionInfo {
  userId?: string;
  email?: string;
  expiresAt?: number;
  expiresIn?: number;
  isValid: boolean;
  lastRefresh?: number;
}

/**
 * An enhanced token manager that provides robust token refresh capabilities
 */
class EnhancedTokenManager {
  private refreshPromise: Promise<boolean> | null = null;
  private lastRefreshAttempt: number = 0;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private isListening = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize the token manager
   */
  init(): void {
    if (DEBUG) console.log('[TokenManager] Initializing');
    this.setupRefreshInterval();
    this.setupEventListeners();
  }

  /**
   * Set up token refresh interval
   */
  private setupRefreshInterval(): void {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Check token every 2 minutes
    this.refreshInterval = setInterval(async () => {
      try {
        const sessionInfo = await this.getSessionInfo();
        
        if (!sessionInfo.isValid) {
          if (DEBUG) console.log('[TokenManager] No valid session found during interval check');
          return;
        }
        
        // If token will expire in less than threshold, refresh it
        if (sessionInfo.expiresIn && sessionInfo.expiresIn < TOKEN_EXPIRY_THRESHOLD_SECONDS) {
          if (DEBUG) console.log(`[TokenManager] Token expires in ${sessionInfo.expiresIn}s, refreshing proactively`);
          await this.refreshToken();
        }
      } catch (error) {
        console.error('[TokenManager] Error in refresh interval:', error);
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  /**
   * Set up event listeners for cross-tab coordination
   */
  private setupEventListeners(): void {
    if (this.isListening) return;
    
    try {
      // Listen for refresh requests from other tabs
      window.addEventListener('storage', async (event) => {
        if (event.key === TOKEN_REFRESH_REQUEST_EVENT) {
          if (DEBUG) console.log('[TokenManager] Received refresh request from another tab');
          
          // Only one tab should handle the refresh to prevent race conditions
          const shouldRefresh = this.acquireRefreshLock();
          if (shouldRefresh) {
            await this.refreshToken();
            this.releaseRefreshLock();
            localStorage.setItem(TOKEN_REFRESH_COMPLETE_EVENT, Date.now().toString());
          }
        }
      });
      
      this.isListening = true;
    } catch (error) {
      console.error('[TokenManager] Error setting up event listeners:', error);
    }
  }

  /**
   * Acquire a lock for token refresh
   */
  private acquireRefreshLock(): boolean {
    try {
      const now = Date.now();
      const currentLock = localStorage.getItem(TOKEN_REFRESH_LOCK_KEY);
      
      // If there's a current lock, check if it's expired
      if (currentLock) {
        const lockTime = parseInt(currentLock, 10);
        if (now - lockTime < TOKEN_REFRESH_LOCK_EXPIRY) {
          // Lock is still valid, another tab is handling it
          return false;
        }
      }
      
      // Acquire the lock
      localStorage.setItem(TOKEN_REFRESH_LOCK_KEY, now.toString());
      return true;
    } catch (error) {
      console.error('[TokenManager] Error acquiring refresh lock:', error);
      return false;
    }
  }

  /**
   * Release the refresh lock
   */
  private releaseRefreshLock(): void {
    try {
      localStorage.removeItem(TOKEN_REFRESH_LOCK_KEY);
    } catch (error) {
      console.error('[TokenManager] Error releasing refresh lock:', error);
    }
  }

  /**
   * Get current session information
   * @returns Object with session info
   */
  async getSessionInfo(): Promise<SessionInfo> {
    try {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        return { isValid: false };
      }
      
      const { user, expires_at } = data.session;
      const expiresInSeconds = expires_at ? expires_at - Math.floor(Date.now() / 1000) : 0;
      
      return {
        userId: user?.id,
        email: user?.email,
        expiresAt: expires_at,
        expiresIn: expiresInSeconds,
        isValid: expiresInSeconds > 0,
        lastRefresh: this.lastRefreshAttempt || undefined
      };
    } catch (error) {
      console.error('[TokenManager] Error getting session info:', error);
      return { isValid: false };
    }
  }

  /**
   * Request token refresh across all tabs
   */
  requestRefreshAcrossTabs(): void {
    try {
      localStorage.setItem(TOKEN_REFRESH_REQUEST_EVENT, Date.now().toString());
    } catch (error) {
      console.error('[TokenManager] Error requesting refresh across tabs:', error);
    }
  }

  /**
   * Refresh the auth token with retry and timeout logic
   * @returns True if successful, false otherwise
   */
  async refreshToken(): Promise<boolean> {
    // If a refresh is already in progress, return that promise
    if (this.refreshPromise) {
      if (DEBUG) console.log('[TokenManager] Refresh already in progress, joining existing operation');
      return this.refreshPromise;
    }
    
    // Create a new refresh promise
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      return await this.refreshPromise;
    } finally {
      // Clear the promise after it completes
      this.refreshPromise = null;
    }
  }

  /**
   * Internal implementation of token refresh with retries
   */
  private async performTokenRefresh(): Promise<boolean> {
    let retryCount = 0;
    let lastError: any = null;
    this.lastRefreshAttempt = Date.now();
    
    while (retryCount <= TOKEN_REFRESH_MAX_RETRIES) {
      try {
        if (retryCount > 0) {
          if (DEBUG) console.log(`[TokenManager] Retry attempt ${retryCount}/${TOKEN_REFRESH_MAX_RETRIES}`);
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(
            resolve, 
            TOKEN_REFRESH_RETRY_DELAY * Math.pow(2, retryCount - 1)
          ));
        }
        
        // Perform the token refresh
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          lastError = error;
          console.error('[TokenManager] Error refreshing token:', error);
          retryCount++;
          continue;
        }
        
        if (!data?.session) {
          lastError = new Error('No session returned from refresh');
          console.error('[TokenManager] Refresh succeeded but no session returned');
          retryCount++;
          continue;
        }
        
        // Success!
        const expiresInSeconds = data.session.expires_at 
          ? Math.floor((data.session.expires_at * 1000 - Date.now()) / 1000) 
          : 0;
        
        if (DEBUG) console.log(`[TokenManager] Token refreshed successfully, expires in ${expiresInSeconds}s`);
        
        // Store session backup
        try {
          localStorage.setItem('sb-mizuchi-auth-key-v3_backup', JSON.stringify({
            userId: data.session.user.id,
            email: data.session.user.email,
            aud: data.session.user.aud,
            expires_at: data.session.expires_at,
            refreshed_at: Date.now()
          }));
        } catch (e) {
          console.warn('[TokenManager] Could not store session backup:', e);
        }
        
        return true;
      } catch (error) {
        lastError = error;
        console.error('[TokenManager] Unexpected error refreshing token:', error);
        retryCount++;
      }
    }
    
    // All retries failed
    console.error('[TokenManager] All refresh attempts failed:', lastError);
    return false;
  }

  /**
   * Clear resources when shutting down
   */
  cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    this.isListening = false;
  }
}

// Export the singleton instance
export const enhancedTokenManager = new EnhancedTokenManager();

// Export utilities
export const getSessionDiagnostics = async () => {
  return await enhancedTokenManager.getSessionInfo();
};

export const forceTokenRefresh = async () => {
  return await enhancedTokenManager.refreshToken();
};