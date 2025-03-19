// Store app start time for performance tracking
(window as any).appStartTime = performance.now();

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import Geist fonts
import { GeistSans, GeistMono } from './lib/fonts'

// Import error handling 
import ErrorBoundary from './components/error/ErrorBoundary'
import errorMonitoringService from './services/errorMonitoringService'

// For testing auth and Supabase
import TestApp from './TestApp';

// Mark navigation timing for performance analysis
performance.mark('app_bootstrap_start');

// Use a testing route if the URL includes ?test=true
const useTestApp = new URLSearchParams(window.location.search).get('test') === 'true';

// Wrap the app in an error boundary
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary 
    onError={(error, errorInfo) => {
      errorMonitoringService.captureException(error, {
        errorInfo,
        source: 'root-error-boundary'
      });
    }}
  >
    {useTestApp ? <TestApp /> : <App />}
  </ErrorBoundary>
);
