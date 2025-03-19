
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: undefined
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info for potential reporting
    this.setState({ errorInfo });
    
    // Log the error
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // If onError callback is provided, call it
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // In production, we would send this to an error tracking service
    if (import.meta.env.MODE === 'production') {
      // Example: sendToErrorTrackingService(error, errorInfo);
      // This is where you would integrate with services like Sentry, LogRocket, etc.
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: undefined
    });
  };
  
  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center bg-background border border-border rounded-lg shadow-sm">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground max-w-md mb-4">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90"
            >
              <RefreshCw size={16} /> Try Again
            </button>
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <RefreshCw size={16} /> Reload Page
            </button>
          </div>
          {(import.meta.env.MODE !== 'production') && this.state.errorInfo && (
            <details className="mt-4 text-left w-full">
              <summary className="cursor-pointer text-sm text-muted-foreground">Error Details</summary>
              <pre className="mt-2 text-xs overflow-auto p-2 bg-muted rounded-md">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
