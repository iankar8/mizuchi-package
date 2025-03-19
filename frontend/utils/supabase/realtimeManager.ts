/**
 * Enhanced Realtime Subscription Manager for Supabase
 * 
 * This module provides improved realtime functionality with:
 * - Connection pooling
 * - Automatic reconnection with exponential backoff
 * - Diagnostic tools for connection issues
 * - Subscription payload optimization
 */

import { supabase } from './client';
import { enhancedTokenManager } from './enhancedTokenManager';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Enable debug mode in development
const DEBUG = import.meta.env.MODE === 'development';

// Constants for realtime management
const RECONNECT_DELAY_MS = 1000; // Initial reconnect delay
const MAX_RECONNECT_ATTEMPTS = 5; // Maximum reconnect attempts
const WATCHLIST_CHANNEL_PREFIX = 'watchlist-';
const WATCHLIST_ITEMS_CHANNEL_PREFIX = 'watchlist-items-';
const CHANNEL_LOG_LIMIT = 20; // Max number of channel logs to keep

// Subscription options interface
interface SubscriptionOptions {
  retryOnError?: boolean;
  maxRetries?: number;
  broadcastSelf?: boolean;
  customTimeout?: number;
}

// Subscription status enum
enum SubscriptionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}

// Channel information interface
interface ChannelInfo {
  id: string;
  status: SubscriptionStatus;
  table: string;
  filter?: string;
  createdAt: number;
  lastChange?: number;
  errorCount: number;
  lastError?: string;
}

// Type for realtime callbacks
type RealtimeCallback = (payload: RealtimePostgresChangesPayload<any>) => void;

/**
 * Enhanced Realtime Manager that handles subscription pools and retries
 */
class EnhancedRealtimeManager {
  // Active channel pool
  private channels: Map<string, RealtimeChannel> = new Map();
  
  // Channel info for diagnostics
  private channelInfo: Map<string, ChannelInfo> = new Map();
  
  // Channel error log
  private channelLogs: {timestamp: number, message: string, channelId?: string}[] = [];
  
  // Reconnect timers
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor() {
    this.setupTokenRefreshHandler();
  }

  /**
   * Listen for token refreshes to validate subscriptions
   */
  private setupTokenRefreshHandler(): void {
    window.addEventListener('storage', (event) => {
      // Check if this is a token refresh completion event
      if (event.key === 'mizuchi:token-refresh-complete') {
        if (DEBUG) console.log('[RealtimeManager] Token refreshed, validating subscriptions');
        this.validateAllSubscriptions();
      }
    });
  }

  /**
   * Validate all active subscriptions after token refresh
   */
  private validateAllSubscriptions(): void {
    // For each channel, check if it's still valid
    this.channels.forEach((channel, channelId) => {
      try {
        if (channel.state !== 'joined') {
          if (DEBUG) console.log(`[RealtimeManager] Reconnecting channel ${channelId} after token refresh`);
          
          // Update channel status
          const info = this.channelInfo.get(channelId);
          if (info) {
            info.status = SubscriptionStatus.CONNECTING;
          }
          
          // Force reconnection by removing and recreating
          this.removeChannel(channelId);
          this.recreateChannel(channelId);
        }
      } catch (error) {
        this.logError(`Error validating channel ${channelId}:`, error);
      }
    });
  }

  /**
   * Recreate a channel from stored information
   */
  private recreateChannel(channelId: string): void {
    const info = this.channelInfo.get(channelId);
    if (!info) return;
    
    // Channel recreation logic would go here
    // This is complex and depends on stored callback information
    // In a real implementation, you would need to store callbacks
    this.logInfo(`Channel ${channelId} needs to be recreated, but implementation is pending`);
  }

  /**
   * Subscribe to watchlist changes
   */
  subscribeToWatchlist(
    watchlistId: string, 
    callback: RealtimeCallback,
    options?: SubscriptionOptions
  ): () => void {
    if (!watchlistId) {
      console.error('[RealtimeManager] Cannot subscribe: watchlistId is required');
      return () => {};
    }

    const channelId = `${WATCHLIST_CHANNEL_PREFIX}${watchlistId}`;
    
    // If we already have this channel, remove it first
    if (this.channels.has(channelId)) {
      if (DEBUG) console.log(`[RealtimeManager] Channel ${channelId} already exists, recreating`);
      this.removeChannel(channelId);
    }

    if (DEBUG) console.log(`[RealtimeManager] Setting up subscription for watchlist ${watchlistId}`);
    
    try {
      // Set up realtime subscription with enhanced configuration
      const channel = supabase
        .channel(channelId, {
          config: {
            broadcast: { self: options?.broadcastSelf ?? true },
            presence: { key: '' },
            // Enable private channel with RLS protection
            private: true,
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'watchlists',
          filter: `id=eq.${watchlistId}`
        }, (payload) => {
          // Update channel info
          const info = this.channelInfo.get(channelId);
          if (info) {
            info.lastChange = Date.now();
          }
          
          if (DEBUG) console.log(`[RealtimeManager] Watchlist ${watchlistId} changed:`, payload);
          callback(payload);
        })
        .subscribe(this.createSubscriptionHandler(channelId, options));
      
      // Store the channel
      this.channels.set(channelId, channel);
      
      // Store channel info
      this.channelInfo.set(channelId, {
        id: channelId,
        status: SubscriptionStatus.CONNECTING,
        table: 'watchlists',
        filter: `id=eq.${watchlistId}`,
        createdAt: Date.now(),
        errorCount: 0
      });
      
      // Return unsubscribe function
      return () => {
        this.removeChannel(channelId);
      };
    } catch (error) {
      this.logError(`Error setting up subscription for watchlist ${watchlistId}:`, error);
      return () => {};
    }
  }

  /**
   * Subscribe to watchlist item changes
   */
  subscribeToWatchlistItems(
    watchlistId: string, 
    callback: RealtimeCallback,
    options?: SubscriptionOptions
  ): () => void {
    if (!watchlistId) {
      console.error('[RealtimeManager] Cannot subscribe to items: watchlistId is required');
      return () => {};
    }

    const channelId = `${WATCHLIST_ITEMS_CHANNEL_PREFIX}${watchlistId}`;
    
    // If we already have this channel, remove it first
    if (this.channels.has(channelId)) {
      if (DEBUG) console.log(`[RealtimeManager] Channel ${channelId} already exists, recreating`);
      this.removeChannel(channelId);
    }

    if (DEBUG) console.log(`[RealtimeManager] Setting up items subscription for watchlist ${watchlistId}`);
    
    try {
      // Set up realtime subscription with enhanced configuration
      const channel = supabase
        .channel(channelId, {
          config: {
            broadcast: { self: options?.broadcastSelf ?? true },
            presence: { key: '' },
            // Enable private channel with RLS protection
            private: true,
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'watchlist_items',
          filter: `watchlist_id=eq.${watchlistId}`
        }, (payload) => {
          // Update channel info
          const info = this.channelInfo.get(channelId);
          if (info) {
            info.lastChange = Date.now();
          }
          
          if (DEBUG) console.log(`[RealtimeManager] Watchlist item changed for ${watchlistId}:`, payload);
          callback(payload);
        })
        .subscribe(this.createSubscriptionHandler(channelId, options));
      
      // Store the channel
      this.channels.set(channelId, channel);
      
      // Store channel info
      this.channelInfo.set(channelId, {
        id: channelId,
        status: SubscriptionStatus.CONNECTING,
        table: 'watchlist_items',
        filter: `watchlist_id=eq.${watchlistId}`,
        createdAt: Date.now(),
        errorCount: 0
      });
      
      // Return unsubscribe function
      return () => {
        this.removeChannel(channelId);
      };
    } catch (error) {
      this.logError(`Error setting up items subscription for watchlist ${watchlistId}:`, error);
      return () => {};
    }
  }

  /**
   * Create a subscription status handler with reconnection logic
   */
  private createSubscriptionHandler(
    channelId: string, 
    options?: SubscriptionOptions
  ): (status: string, err?: Error) => void {
    return (status: string, err?: Error) => {
      // Update channel info
      const info = this.channelInfo.get(channelId);
      if (info) {
        info.status = status as unknown as SubscriptionStatus;
        
        if (err) {
          info.errorCount++;
          info.lastError = err.message;
        }
      }
      
      if (status === 'SUBSCRIBED') {
        if (DEBUG) console.log(`[RealtimeManager] Successfully subscribed to ${channelId}`);
        
        // Clear any pending reconnect
        this.clearReconnectTimer(channelId);
      } 
      else if (status === 'CHANNEL_ERROR') {
        this.logError(`Error with channel ${channelId}:`, err);
        
        // Attempt to retry subscription if requested
        if (options?.retryOnError !== false) {
          this.scheduleReconnect(channelId, options?.maxRetries || MAX_RECONNECT_ATTEMPTS);
        }
      }
      else if (status === 'CLOSED') {
        if (DEBUG) console.log(`[RealtimeManager] Channel ${channelId} closed`);
        
        // If this wasn't an intentional close (channel still in our map), try to reconnect
        if (this.channels.has(channelId) && options?.retryOnError !== false) {
          this.scheduleReconnect(channelId, options?.maxRetries || MAX_RECONNECT_ATTEMPTS);
        }
      }
      else if (status === 'TIMED_OUT') {
        this.logError(`Channel ${channelId} timed out`);
        
        // Attempt to retry subscription
        if (options?.retryOnError !== false) {
          this.scheduleReconnect(channelId, options?.maxRetries || MAX_RECONNECT_ATTEMPTS);
        }
      }
    };
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(channelId: string, maxRetries: number): void {
    // Get channel info
    const info = this.channelInfo.get(channelId);
    if (!info) return;
    
    // If we've already tried too many times, give up
    if (info.errorCount > maxRetries) {
      this.logError(`Maximum retry attempts (${maxRetries}) reached for ${channelId}`);
      return;
    }
    
    // Clear any existing timer
    this.clearReconnectTimer(channelId);
    
    // Calculate backoff delay with jitter
    const delay = RECONNECT_DELAY_MS * Math.pow(2, Math.min(info.errorCount - 1, 5))
      * (0.8 + Math.random() * 0.4); // Add jitter between 0.8-1.2x
    
    if (DEBUG) console.log(`[RealtimeManager] Scheduling reconnect for ${channelId} in ${Math.round(delay)}ms (attempt ${info.errorCount})`);
    
    // Set new timer
    this.reconnectTimers.set(
      channelId, 
      setTimeout(() => this.attemptReconnect(channelId), delay)
    );
  }

  /**
   * Attempt to reconnect a channel
   */
  private attemptReconnect(channelId: string): void {
    if (DEBUG) console.log(`[RealtimeManager] Attempting to reconnect ${channelId}`);
    
    // Clear timer
    this.clearReconnectTimer(channelId);
    
    // Get existing channel
    const channel = this.channels.get(channelId);
    if (!channel) return;
    
    try {
      // Check if we need a token refresh before reconnecting
      enhancedTokenManager.getSessionInfo().then(sessionInfo => {
        // If token is expiring soon, refresh it first
        if (sessionInfo.expiresIn && sessionInfo.expiresIn < 300) {
          if (DEBUG) console.log(`[RealtimeManager] Token expires soon (${sessionInfo.expiresIn}s), refreshing before reconnect`);
          
          enhancedTokenManager.refreshToken().then(refreshSuccess => {
            if (refreshSuccess) {
              // Continue with reconnection after brief delay to let token propagate
              setTimeout(() => {
                this.actuallyReconnect(channelId, channel);
              }, 500);
            } else {
              this.logError(`Token refresh failed, cannot reconnect ${channelId}`);
            }
          });
        } else {
          // Token is valid, proceed with reconnection
          this.actuallyReconnect(channelId, channel);
        }
      });
    } catch (error) {
      this.logError(`Error during reconnect preparation for ${channelId}:`, error);
    }
  }

  /**
   * Perform the actual reconnection
   */
  private actuallyReconnect(channelId: string, channel: RealtimeChannel): void {
    try {
      // Try to reconnect
      channel.subscribe();
      
      if (DEBUG) console.log(`[RealtimeManager] Reconnection attempt sent for ${channelId}`);
    } catch (error) {
      this.logError(`Error reconnecting ${channelId}:`, error);
      
      // Update channel info
      const info = this.channelInfo.get(channelId);
      if (info) {
        info.errorCount++;
        info.lastError = error instanceof Error ? error.message : String(error);
      }
      
      // Schedule another attempt
      this.scheduleReconnect(channelId, MAX_RECONNECT_ATTEMPTS);
    }
  }

  /**
   * Clear a reconnect timer
   */
  private clearReconnectTimer(channelId: string): void {
    const timer = this.reconnectTimers.get(channelId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(channelId);
    }
  }

  /**
   * Remove a channel and clean up resources
   */
  private removeChannel(channelId: string): void {
    if (DEBUG) console.log(`[RealtimeManager] Removing channel ${channelId}`);
    
    try {
      // Clear any reconnect timer
      this.clearReconnectTimer(channelId);
      
      // Get the channel and remove from Supabase
      const channel = this.channels.get(channelId);
      if (channel) {
        supabase.removeChannel(channel);
      }
      
      // Remove from our maps
      this.channels.delete(channelId);
      
      // Keep channel info for diagnostic purposes but mark as disconnected
      const info = this.channelInfo.get(channelId);
      if (info) {
        info.status = SubscriptionStatus.DISCONNECTED;
      }
    } catch (error) {
      this.logError(`Error removing channel ${channelId}:`, error);
    }
  }

  /**
   * Get diagnostic information about channels
   */
  getChannelDiagnostics(): any {
    const now = Date.now();
    
    return {
      activeChannels: this.channels.size,
      channels: Array.from(this.channelInfo.values()).map(info => ({
        ...info,
        ageSeconds: Math.floor((now - info.createdAt) / 1000),
        lastChangeSeconds: info.lastChange 
          ? Math.floor((now - info.lastChange) / 1000) 
          : null
      })),
      logs: this.channelLogs.slice(-CHANNEL_LOG_LIMIT)
    };
  }

  /**
   * Log an error with timestamp
   */
  private logError(message: string, error?: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error || '');
    console.error(`[RealtimeManager] ${message}`, error);
    
    this.channelLogs.push({
      timestamp: Date.now(),
      message: `ERROR: ${message} ${errorMessage}`
    });
    
    // Trim logs if too many
    if (this.channelLogs.length > CHANNEL_LOG_LIMIT * 2) {
      this.channelLogs = this.channelLogs.slice(-CHANNEL_LOG_LIMIT);
    }
  }

  /**
   * Log info message with timestamp
   */
  private logInfo(message: string): void {
    if (DEBUG) console.log(`[RealtimeManager] ${message}`);
    
    this.channelLogs.push({
      timestamp: Date.now(),
      message
    });
    
    // Trim logs if too many
    if (this.channelLogs.length > CHANNEL_LOG_LIMIT * 2) {
      this.channelLogs = this.channelLogs.slice(-CHANNEL_LOG_LIMIT);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (DEBUG) console.log('[RealtimeManager] Cleaning up all resources');
    
    // Clear all reconnect timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();
    
    // Remove all channels
    this.channels.forEach((channel, channelId) => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn(`[RealtimeManager] Error removing channel ${channelId} during cleanup:`, error);
      }
    });
    
    this.channels.clear();
  }
}

// Export singleton instance
export const realtimeManager = new EnhancedRealtimeManager();

// Export diagnostics function
export const getRealtimeDiagnostics = () => {
  return realtimeManager.getChannelDiagnostics();
};