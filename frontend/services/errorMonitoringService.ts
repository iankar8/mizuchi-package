/**
 * Error monitoring service for centralized error handling and reporting
 * 
 * This service provides utilities for capturing, reporting, and tracking errors
 * across the application. In production, this integrates with Sentry
 * for error monitoring and tracking.
 */

// Add type declarations for Sentry to avoid TS errors
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error) => void;
      withScope: (callback: (scope: any) => void) => void;
    };
  }
}

// Global error metadata to track session info
// Define a type for the metadata object
type ErrorMetadata = {
  sessionStartedAt: string;
  environment: string;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  [key: string]: unknown;
};

let metadata: ErrorMetadata = {
  sessionStartedAt: new Date().toISOString(),
  environment: import.meta.env.MODE || 'development',
  userAgent: navigator.userAgent
};

/**
 * Error monitoring service with methods for logging, tracking, and reporting errors
 */
const errorMonitoringService = {
  /**
   * Send error data to a centralized error tracking service
   * 
   * @param errorData The error data to send
   * @param severity Optional severity level (default: 'error')
   */
  sendToErrorTrackingService: async (errorData: any, severity: 'error' | 'warning' | 'info' = 'error') => {
    // If Sentry is available, use it
    if (typeof window.Sentry !== 'undefined') {
      try {
        const { error, context, metadata } = errorData;
        window.Sentry.withScope((scope: any) => {
          // Add context and metadata to the error
          scope.setLevel(severity);
          
          // Add user context if available
          if (metadata.userId) {
            scope.setUser({
              id: metadata.userId,
              email: metadata.userEmail
            });
          }
          
          // Add additional context
          Object.entries({ ...context, ...metadata }).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
          
          // Capture the exception
          window.Sentry.captureException(error);
        });
      } catch (sentryError) {
        console.error('[ErrorMonitoring] Failed to send to Sentry:', sentryError);
      }
    }
    
    // Log to application monitoring endpoint
    try {
      // Log to your own API endpoint for error aggregation
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/error-logs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...errorData,
            severity,
            app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
          }),
        }
      );
      
      if (!response.ok) {
        console.error('[ErrorMonitoring] Failed to send to error API:', response.statusText);
      }
    } catch (apiError) {
      // Don't throw - just log the error to avoid recursive errors
      console.error('[ErrorMonitoring] Error API call failed:', apiError);
    }
  },
  /**
   * Initialize the error monitoring service with user data
   * 
   * @param userId Optional user identifier for error attribution
   * @param userEmail Optional user email for error attribution
   * @param extraData Additional context data to include in error reports
   */
  initialize: (userId?: string, userEmail?: string, extraData: Record<string, unknown> = {}) => {
    // Update metadata with user information if available
    if (userId) {
      metadata.userId = userId;
    }
    
    if (userEmail) {
      metadata.userEmail = userEmail;
    }
    
    // Add any extra data passed to initialization
    metadata = { ...metadata, ...extraData };
    
    // Set up global error handling
    window.addEventListener('error', (event) => {
      errorMonitoringService.captureException(event.error || new Error(event.message), {
        source: 'window.onerror',
        lineno: event.lineno,
        colno: event.colno,
        filename: event.filename
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? 
        event.reason : 
        new Error(String(event.reason));
        
      errorMonitoringService.captureException(error, {
        source: 'unhandledRejection'
      });
    });
    
    console.log('[ErrorMonitoring] Initialized');
  },
  
  /**
   * Capture and report an exception
   * 
   * @param error The error object to capture
   * @param context Additional context for the error
   */
  captureException: (error: Error, context: Record<string, unknown> = {}) => {
    // In development, log to console
    console.error('[ErrorMonitoring] Error captured:', error, {
      ...metadata,
      ...context,
      timestamp: new Date().toISOString()
    });
    
    // In production, send to error monitoring service
    if (import.meta.env.MODE === 'production') {
      // Send to a centralized error tracking service
      this.sendToErrorTrackingService({
        error,
        metadata,
        context,
        timestamp: new Date().toISOString()
      });
    }
    
    // Return error ID for reference (would come from error service in production)
    return `error-${Date.now()}`;
  },
  
  /**
   * Set additional context data that will be included with all error reports
   * 
   * @param key Context key name
   * @param value Context value
   */
  setContext: (key: string, value: unknown) => {
    metadata[key] = value;
  },
  
  /**
   * Remove context data
   * 
   * @param key Context key to remove
   */
  removeContext: (key: string) => {
    delete metadata[key];
  },
  
  /**
   * Get current error tracking metadata
   */
  getMetadata: () => {
    return { ...metadata };
  },
  
  /**
   * Manually record a handled exception that doesn't need to be propagated
   * 
   * @param error The caught error
   * @param handledBy Component or function that handled the error
   * @param additionalData Any extra context
   */
  recordHandledException: (error: Error, handledBy: string, additionalData: Record<string, unknown> = {}) => {
    console.warn('[ErrorMonitoring] Handled exception:', {
      error,
      handledBy,
      ...additionalData,
      timestamp: new Date().toISOString()
    });
    
    // In production, track handled exceptions at a lower severity
    if (import.meta.env.MODE === 'production') {
      this.sendToErrorTrackingService({
        error,
        handledBy,
        ...additionalData,
        metadata,
        timestamp: new Date().toISOString()
      }, 'warning');
    }
  }
};

export default errorMonitoringService;