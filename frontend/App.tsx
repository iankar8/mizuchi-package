
import { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/auth";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import AppRoutes from "@/routes/AppRoutes";
import { GeistSans } from "@/lib/fonts";
import { FeatureFlagsProvider } from "@/lib/feature-flags";
import { supabase } from "@/utils/supabase/client";
import errorMonitoringService from "@/services/errorMonitoringService";
import analyticsService from "@/services/analyticsService";
import browserToolsService from "@/services/browserToolsService";

import "./App.css";

function App() {
  // Initialize services and check database connection
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize error monitoring
        errorMonitoringService.initialize();
        
        // Initialize analytics (without user data initially)
        analyticsService.initialize();
        
        // Initialize browser tools service
        await browserToolsService.initialize();
        
        // Test Supabase connection
        console.log('Testing Supabase connection...');
        
        try {
          console.log('Testing supabase client...');
          const { data: session } = await supabase.auth.getSession();
          console.log('Session data:', session);
          
          if (!session?.session) {
            console.log('No valid session found');
          }
          
          // Import WatchlistService for comprehensive connection testing
          const { WatchlistService } = await import('@/services/watchlist.service');
          const connectionTest = await WatchlistService.testConnection();
          
          console.log('Supabase client test:', connectionTest);
          
          // Check database connection based on the test result
          const isConnected = connectionTest.success;
          console.log('Database connection:', isConnected ? 'OK' : 'Failed');
          
          if (!isConnected) {
            // Report database connection issue with detailed diagnostics
            errorMonitoringService.recordHandledException(
              new Error(`Database connection failed: Auth=${connectionTest.auth}, DB=${connectionTest.database}, Realtime=${connectionTest.realtime}`),
              'App.tsx:useEffect',
              { severity: 'critical', metadata: connectionTest }
            );
            
            // Log to analytics
            analyticsService.trackError('Database connection failed', { 
              severity: 'critical',
              component: 'App.tsx',
              metadata: connectionTest
            });
          }
        } catch (e) {
          console.error('Supabase client test failed:', e);
          
          // Report error
          errorMonitoringService.recordHandledException(
            e instanceof Error ? e : new Error('Supabase client test failed'),
            'App.tsx:useEffect',
            { severity: 'critical' }
          );
        }
      } catch (error) {
        console.error('App initialization error:', error);
        
        if (error instanceof Error) {
          errorMonitoringService.captureException(error, {
            component: 'App.tsx'
          });
        }
      }
    };
    
    initializeApp();
    
    // Track app load performance
    const loadTime = performance.now() - (window as any).appStartTime || 0;
    analyticsService.trackPerformance('app_initial_load', loadTime);
    
    // Set performance marker for navigation timing
    performance.mark('app_initialized');
  }, []);
  
  return (
    <div className={GeistSans}>
      <ErrorBoundary>
        <Router>
          <FeatureFlagsProvider>
            <AuthProvider>
              <AppRoutes />
              <Toaster />
            </AuthProvider>
          </FeatureFlagsProvider>
        </Router>
      </ErrorBoundary>
    </div>
  );
}

export default App;
