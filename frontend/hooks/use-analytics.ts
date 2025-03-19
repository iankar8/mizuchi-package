import React, { useCallback, useEffect } from 'react';
import { useAuth } from '@/context/auth';
import analyticsService, { EventData } from '@/services/analyticsService';
import { useLocation } from 'react-router-dom';

/**
 * Hook for using analytics in components
 */
export function useAnalytics() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Initialize analytics with user data when available
  useEffect(() => {
    if (isAuthenticated && user) {
      analyticsService.initialize(
        user.id,
        user.email,
        // Check if user is a beta user based on beta_user table
        // This is a placeholder - would need to be updated with real beta status
        !!localStorage.getItem('is_beta_user')
      );
    } else {
      // Initialize without user info for anonymous tracking
      analyticsService.initialize();
    }
    
    // Set up automatic page view tracking for route changes
    const currentPath = location.pathname;
    analyticsService.trackPageView(currentPath);
  }, [user, isAuthenticated, location.pathname]);
  
  // Track feature usage
  const trackFeature = useCallback((feature: string, action: string, value?: string | number) => {
    analyticsService.trackFeatureUsage(feature, action, value);
  }, []);
  
  // Track user interaction 
  const trackInteraction = useCallback((action: string, metadata?: Record<string, any>) => {
    analyticsService.trackInteraction(action, metadata);
  }, []);
  
  // Track performance
  const trackPerformance = useCallback((action: string, duration: number, metadata?: Record<string, any>) => {
    analyticsService.trackPerformance(action, duration, metadata);
  }, []);
  
  // Track errors
  const trackError = useCallback((error: Error | string, metadata?: Record<string, any>) => {
    analyticsService.trackError(error, metadata);
  }, []);
  
  // Utility to time an operation and automatically track performance
  const timeOperation = useCallback(async <T>(
    action: string, 
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      analyticsService.trackPerformance(action, duration, metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      analyticsService.trackPerformance(
        `${action}_error`, 
        duration, 
        { ...metadata, error: error instanceof Error ? error.message : String(error) }
      );
      analyticsService.trackError(error instanceof Error ? error : String(error), metadata);
      throw error;
    }
  }, []);
  
  // Update user properties
  const updateUserProperties = useCallback((properties: Record<string, any>) => {
    analyticsService.updateUserProperties(properties);
  }, []);
  
  // Enable/disable analytics
  const setAnalyticsEnabled = useCallback((enabled: boolean) => {
    analyticsService.setEnabled(enabled);
  }, []);
  
  // Check if analytics is enabled
  const isAnalyticsEnabled = useCallback(() => {
    return analyticsService.isEnabled();
  }, []);
  
  return {
    trackFeature,
    trackInteraction,
    trackPerformance,
    trackError,
    timeOperation,
    updateUserProperties,
    setAnalyticsEnabled,
    isAnalyticsEnabled
  };
}

/**
 * HOC for tracking performance of a component render
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  return (props: P) => {
    const startTime = performance.now();
    
    useEffect(() => {
      const renderTime = performance.now() - startTime;
      analyticsService.trackPerformance(`render_${componentName}`, renderTime);
    }, []);
    
    // @ts-ignore - This is valid JSX but esbuild is having issues parsing it
    return React.createElement(Component, props);
  };
}