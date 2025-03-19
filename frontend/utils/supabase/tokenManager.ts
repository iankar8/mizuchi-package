import { supabase, refreshAuthToken } from "./client";

// Enable debug mode for detailed logging
const DEBUG = true;

// Singleton manager to handle token refreshes and prevent race conditions
class TokenRefreshManager {
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;
  private lastRefreshTime: number = 0;
  private tokenExpiresAt: number | null = null;
  private refreshListeners: Array<(success: boolean) => void> = [];
  
  // Rate limiting - don't refresh more than once per minute
  private MIN_REFRESH_INTERVAL = 60000; // 1 minute
  
  // Safe buffer before expiration to refresh token
  private REFRESH_BUFFER_SECONDS = 300; // 5 minutes
  
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Initialize by checking the current session
    this.updateTokenExpiration();
    
    // Set up periodic checks for token expiration
    this.checkInterval = setInterval(() => this.checkTokenExpiration(), 60000); // Check every minute
  }
  
  /**
   * Cleanup resources to prevent memory leaks
   */
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.refreshListeners = [];
  }
  
  /**
   * Updates the token expiration time based on current session
   */
  private async updateTokenExpiration(): Promise<void> {
    try {
      const { data } = await supabase.auth.getSession();
      
      if (data?.session?.expires_at) {
        this.tokenExpiresAt = data.session.expires_at;
        
        if (DEBUG) {
          const expiresInSeconds = this.tokenExpiresAt - Math.floor(Date.now() / 1000);
          console.log(`[TokenManager] Token expires in ${expiresInSeconds} seconds`);
        }
      } else {
        this.tokenExpiresAt = null;
      }
    } catch (error) {
      console.error('[TokenManager] Error getting session:', error);
      this.tokenExpiresAt = null;
    }
  }
  
  /**
   * Checks if the token is expiring soon and needs to be refreshed
   */
  private async checkTokenExpiration(): Promise<void> {
    // Skip if already refreshing
    if (this.isRefreshing) return;
    
    // Skip if no expiration information
    if (!this.tokenExpiresAt) {
      await this.updateTokenExpiration();
      return;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = this.tokenExpiresAt - now;
    
    // If token expires within buffer time, refresh it
    if (expiresInSeconds < this.REFRESH_BUFFER_SECONDS) {
      if (DEBUG) {
        console.log(`[TokenManager] Token expires in ${expiresInSeconds}s, refreshing...`);
      }
      
      await this.refreshToken();
    }
  }
  
  /**
   * Adds a listener that will be called when token refresh completes
   * @param listener Function to call with refresh success/failure
   * @returns Function to remove the listener
   */
  public onRefresh(listener: (success: boolean) => void): () => void {
    this.refreshListeners.push(listener);
    
    // Return a function to remove this listener
    return () => {
      this.refreshListeners = this.refreshListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Notifies all listeners of a refresh result
   */
  private notifyListeners(success: boolean): void {
    this.refreshListeners.forEach(listener => {
      try {
        listener(success);
      } catch (error) {
        console.error('[TokenManager] Error in refresh listener:', error);
      }
    });
  }
  
  /**
   * Gets the current token expiration time
   * @returns Token expiration timestamp in seconds, or null if unknown
   */
  public getTokenExpiresAt(): number | null {
    return this.tokenExpiresAt;
  }
  
  /**
   * Checks if the token is currently being refreshed
   */
  public isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }
  
  /**
   * Checks if the token has been refreshed recently
   * @param maxAgeMs Maximum age in milliseconds to consider a refresh "recent"
   */
  public hasRecentlyRefreshed(maxAgeMs = 5000): boolean {
    return (Date.now() - this.lastRefreshTime) < maxAgeMs;
  }
  
  /**
   * Refreshes the auth token, with debouncing to prevent multiple simultaneous refreshes
   * @returns Promise resolving to true if refresh succeeded, false otherwise
   */
  public async refreshToken(): Promise<boolean> {
    // If we've refreshed very recently, don't do it again
    if (Date.now() - this.lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
      if (DEBUG) {
        console.log(`[TokenManager] Token was just refreshed ${Date.now() - this.lastRefreshTime}ms ago, skipping`);
      }
      return true;
    }
    
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      if (DEBUG) {
        console.log('[TokenManager] Token refresh already in progress, reusing promise');
      }
      return this.refreshPromise;
    }
    
    try {
      // Start a new refresh
      this.isRefreshing = true;
      
      // Create a new promise for this refresh operation
      this.refreshPromise = new Promise<boolean>(async (resolve) => {
        try {
          if (DEBUG) {
            console.log('[TokenManager] Starting token refresh');
          }
          
          // Perform the actual token refresh
          const refreshed = await refreshAuthToken();
          
          // Update our state
          this.lastRefreshTime = Date.now();
          
          // If successful, update token expiration
          if (refreshed) {
            await this.updateTokenExpiration();
          }
          
          // Notify listeners
          this.notifyListeners(refreshed);
          
          if (DEBUG) {
            console.log(`[TokenManager] Token refresh ${refreshed ? 'succeeded' : 'failed'}`);
          }
          
          resolve(refreshed);
        } catch (error) {
          console.error('[TokenManager] Error refreshing token:', error);
          this.notifyListeners(false);
          resolve(false);
        } finally {
          this.isRefreshing = false;
        }
      });
      
      // Return the promise
      return this.refreshPromise;
    } catch (error) {
      console.error('[TokenManager] Unexpected error in refreshToken:', error);
      return false;
    } finally {
      // Double-safety to ensure the flag gets reset in case of hang
      setTimeout(() => {
        if (this.isRefreshing) {
          console.warn('[TokenManager] Force resetting isRefreshing flag after timeout');
          this.isRefreshing = false;
        }
      }, 15000); // 15 second safety timeout
    }
  }
}

// Export a singleton instance
export const tokenManager = new TokenRefreshManager();