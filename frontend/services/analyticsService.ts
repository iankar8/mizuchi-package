import { supabase } from '@/utils/supabase/client';
import { Json } from '@/integrations/supabase/types';

// Types
export type EventType = 
  | 'page_view'  
  | 'feature_usage'  
  | 'user_interaction'  
  | 'performance'
  | 'error';

export type EventData = {
  path?: string;
  feature?: string;
  action?: string;
  value?: string | number;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Analytics Service for tracking user activity
 */
class AnalyticsService {
  private userId: string | null = null;
  private userEmail: string | null = null;
  private sessionId: string | null = null;
  private isBetaUser: boolean = false;
  private isAnalyticsEnabled: boolean = true;
  private batchedEvents: Array<{eventType: EventType, data: EventData}> = [];
  private batchInterval: number = 5000; // 5 seconds
  private batchTimer: NodeJS.Timeout | null = null;
  private cachedUserProperties: Record<string, unknown> = {};

  constructor() {
    // Default to enabled in production, configurable in development
    this.isAnalyticsEnabled = import.meta.env.MODE === 'production' 
      ? true 
      : localStorage.getItem('enableAnalytics') !== 'false';
      
    // Create a unique session ID
    this.sessionId = this.generateSessionId();
      
    // Initialize batch processing
    this.startBatchProcessing();
  }

  /**
   * Initialize the analytics service with user information
   */
  initialize(userId?: string, userEmail?: string, isBetaUser = false): void {
    this.userId = userId || null;
    this.userEmail = userEmail || null;
    this.isBetaUser = isBetaUser;
    
    if (userId) {
      this.fetchUserProperties(userId);
    }
    
    // Track initialization
    this.trackEvent('page_view', {
      path: window.location.pathname,
      action: 'session_start'
    });
    
    // Add page view tracking
    this.setupPageViewTracking();
  }

  /**
   * Enable or disable analytics tracking
   */
  setEnabled(enabled: boolean): void {
    this.isAnalyticsEnabled = enabled;
    localStorage.setItem('enableAnalytics', String(enabled));
    
    if (!enabled) {
      // Clear any pending events
      this.batchedEvents = [];
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
        this.batchTimer = null;
      }
    } else if (!this.batchTimer) {
      this.startBatchProcessing();
    }
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.isAnalyticsEnabled;
  }

  /**
   * Track a user event
   */
  trackEvent(eventType: EventType, data: EventData): void {
    if (!this.isAnalyticsEnabled) return;
    
    // Add to batch queue
    this.batchedEvents.push({ eventType, data });
    
    // If we're debugging, log to console
    if (import.meta.env.MODE !== 'production') {
      console.log('[Analytics]', eventType, data);
    }
  }

  /**
   * Track page view
   */
  trackPageView(path: string): void {
    this.trackEvent('page_view', { path });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, action: string, value?: string | number): void {
    this.trackEvent('feature_usage', { feature, action, value });
  }

  /**
   * Track user interaction
   */
  trackInteraction(action: string, metadata?: Record<string, unknown>): void {
    this.trackEvent('user_interaction', { action, metadata });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(action: string, duration: number, metadata?: Record<string, unknown>): void {
    this.trackEvent('performance', { action, duration, metadata });
  }

  /**
   * Track errors
   */
  trackError(error: Error | string, metadata?: Record<string, unknown>): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.trackEvent('error', { 
      error: errorMessage, 
      metadata: {
        ...metadata,
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }

  /**
   * Identify user and update properties
   */
  identifyUser(userId: string, userEmail: string, properties?: Record<string, unknown>): void {
    this.userId = userId;
    this.userEmail = userEmail;
    
    if (properties) {
      this.updateUserProperties(properties);
    }
    
    this.fetchUserProperties(userId);
  }

  /**
   * Update user properties
   */
  updateUserProperties(properties: Record<string, unknown>): void {
    if (!this.isAnalyticsEnabled || !this.userId) return;
    
    // Update cached properties
    this.cachedUserProperties = {
      ...this.cachedUserProperties,
      ...properties
    };
    
    // Send to analytics database
    this.sendUserProperties();
  }

  /**
   * Start background batch processing
   */
  private startBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.batchInterval);
    
    // Process on page unload/beforeunload
    window.addEventListener('beforeunload', () => {
      this.processBatch(true); // process immediately
    });
  }

  /**
   * Process batch of events
   */
  private processBatch(immediate = false): void {
    if (!this.isAnalyticsEnabled || this.batchedEvents.length === 0) return;
    
    const events = [...this.batchedEvents];
    this.batchedEvents = [];
    
    // Send events to your analytics endpoint
    this.sendEvents(events, immediate);
  }

  /**
   * Send events to analytics database
   */
  private async sendEvents(
    events: Array<{eventType: EventType, data: EventData}>, 
    immediate = false
  ): Promise<void> {
    if (!this.isAnalyticsEnabled || events.length === 0) return;
    
    const timestamp = new Date().toISOString();
    const analyticsData = events.map(({ eventType, data }) => ({
      user_id: this.userId,
      session_id: this.sessionId,
      event_type: eventType,
      timestamp,
      is_beta_user: this.isBetaUser,
      page_path: data.path || window.location.pathname,
      feature: data.feature || null,
      action: data.action || null,
      value: data.value !== undefined ? String(data.value) : null,
      duration: data.duration || null,
      error: data.error || null,
      metadata: data.metadata as Json || null,
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      screen_size: `${window.innerWidth}x${window.innerHeight}`
    }));
    
    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert(analyticsData);
        
      if (error) {
        console.error('[Analytics] Error sending events:', error);
      }
    } catch (err) {
      console.error('[Analytics] Failed to send events:', err);
      
      // If we failed to send, and it's not immediate, add back to queue
      if (!immediate) {
        this.batchedEvents = [...this.batchedEvents, ...events];
      }
    }
  }

  /**
   * Send user properties to analytics database
   */
  private async sendUserProperties(): Promise<void> {
    if (!this.isAnalyticsEnabled || !this.userId) return;
    
    try {
      const { error } = await supabase
        .from('analytics_users')
        .upsert(
          {
            user_id: this.userId,
            email: this.userEmail,
            last_seen: new Date().toISOString(),
            properties: this.cachedUserProperties as Json,
            is_beta_user: this.isBetaUser
          },
          { onConflict: 'user_id' }
        );
        
      if (error) {
        console.error('[Analytics] Error updating user properties:', error);
      }
    } catch (err) {
      console.error('[Analytics] Failed to update user properties:', err);
    }
  }

  /**
   * Fetch existing user properties from analytics database
   */
  private async fetchUserProperties(userId: string): Promise<void> {
    if (!this.isAnalyticsEnabled) return;
    
    try {
      const { data, error } = await supabase
        .from('analytics_users')
        .select('properties, is_beta_user')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        // This might be a new user, so we'll just create a record
        return;
      }
      
      if (data) {
        this.cachedUserProperties = (data.properties as Record<string, unknown>) || {};
        this.isBetaUser = data.is_beta_user || false;
      }
    } catch (err) {
      console.error('[Analytics] Failed to fetch user properties:', err);
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Set up page view tracking for SPA navigation
   */
  private setupPageViewTracking(): void {
    // Track initial page load
    this.trackPageView(window.location.pathname);
    
    // Set up history listener for SPA navigation
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleRouteChange();
    };
    
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });
  }

  /**
   * Handle route change in SPA
   */
  private handleRouteChange(): void {
    this.trackPageView(window.location.pathname);
  }
}

const analyticsService = new AnalyticsService();

export default analyticsService;