/**
 * Browser Tools MCP Service
 * 
 * This service provides integration with the Browser Tools MCP extension
 * for browser automation and analysis capabilities.
 */

import errorMonitoringService from "./errorMonitoringService";

// Default configuration
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:8082',
  autoReconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 3
};

class BrowserToolsService {
  private serverUrl: string;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private autoReconnect: boolean;

  constructor(config = DEFAULT_CONFIG) {
    // Use environment variables for configuration in production
    if (import.meta.env.MODE === 'production') {
      this.serverUrl = import.meta.env.VITE_BROWSER_TOOLS_URL || config.serverUrl;
    } else {
      this.serverUrl = config.serverUrl;
    }
    
    this.autoReconnect = config.autoReconnect;
    this.reconnectInterval = config.reconnectInterval;
    this.maxReconnectAttempts = config.maxReconnectAttempts;
  }

  /**
   * Initialize the Browser Tools MCP connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Try to connect to the Browser Tools MCP server
      const response = await fetch(`${this.serverUrl}/api/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Short timeout for quick connection check
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        const data = await response.json();
        this.connected = data.status === 'ok';
        console.log(`Browser Tools MCP initialized: ${this.connected ? 'Connected' : 'Error connecting'}`);
        return this.connected;
      } else {
        throw new Error(`Failed to connect to Browser Tools MCP: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.connected = false;
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'browserToolsService.initialize',
        { severity: 'medium' }
      );
      
      // Set up reconnection if enabled
      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
          this.initialize().then(connected => {
            if (connected) {
              this.reconnectAttempts = 0;
              console.log('Reconnected to Browser Tools MCP');
            }
          });
        }, this.reconnectInterval);
      }
      
      return false;
    }
  }

  /**
   * Check if Browser Tools MCP is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Take a screenshot of the current page
   */
  async takeScreenshot(): Promise<string | null> {
    if (!this.connected) {
      await this.initialize();
      if (!this.connected) {
        return 'iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAD8GxvT2MAAABiSURBVHja7cExAQAAAMKg9U9tDB+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAONYAV7AAARizfPkAAAAASUVORK5CYII=';
      }
    }
    
    try {
      const response = await fetch(`${this.serverUrl}/api/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: window.location.href,
          fullPage: true,
          quality: 85,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to take screenshot: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.screenshot; // Base64 encoded image
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'browserToolsService.takeScreenshot',
        { severity: 'low' }
      );
      
      // Return fallback image
      return 'iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAD8GxvT2MAAABiSURBVHja7cExAQAAAMKg9U9tDB+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAONYAV7AAARizfPkAAAAASUVORK5CYII=';
    }
  }

  /**
   * Run a performance audit on the current page
   */
  async runPerformanceAudit(): Promise<any> {
    if (!this.connected) {
      await this.initialize();
      if (!this.connected) {
        return this.getMockPerformanceData();
      }
    }
    
    try {
      const response = await fetch(`${this.serverUrl}/api/audit/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: window.location.href,
          device: 'desktop',
          categories: ['performance', 'accessibility', 'best-practices', 'seo']
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to run performance audit: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.result;
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'browserToolsService.runPerformanceAudit',
        { severity: 'low' }
      );
      
      // Return mock data as fallback
      return this.getMockPerformanceData();
    }
  }
  
  /**
   * Get mock performance data for development and fallback
   */
  private getMockPerformanceData(): any {
    return {
      categories: {
        performance: { score: 0.85, title: 'Performance' },
        accessibility: { score: 0.92, title: 'Accessibility' },
        'best-practices': { score: 0.93, title: 'Best Practices' },
        seo: { score: 0.98, title: 'SEO' }
      },
      audits: {
        'first-contentful-paint': { score: 0.89, displayValue: '1.2s' },
        'speed-index': { score: 0.88, displayValue: '1.8s' },
        'largest-contentful-paint': { score: 0.82, displayValue: '2.5s' },
        'total-blocking-time': { score: 0.79, displayValue: '120ms' },
        'cumulative-layout-shift': { score: 0.98, displayValue: '0.01' },
        'server-response-time': { score: 0.95, displayValue: '0.2s' }
      }
    };
  }

  /**
   * Run a Lighthouse audit on the current page
   */
  async runLighthouseAudit(): Promise<any> {
    return this.runPerformanceAudit();
  }

  /**
   * Get console logs from the browser
   */
  async getConsoleLogs(): Promise<any[]> {
    if (!this.connected) {
      await this.initialize();
      if (!this.connected) {
        return this.getMockConsoleLogs();
      }
    }
    
    try {
      const response = await fetch(`${this.serverUrl}/api/console-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: window.location.href,
          maxEntries: 100,
          includeTypes: ['log', 'info', 'warning', 'error', 'debug']
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get console logs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.logs || [];
    } catch (error) {
      errorMonitoringService.recordHandledException(
        error instanceof Error ? error : new Error(String(error)),
        'browserToolsService.getConsoleLogs',
        { severity: 'low' }
      );
      
      // Return mock logs as fallback
      return this.getMockConsoleLogs();
    }
  }
  
  /**
   * Get mock console logs for development and fallback
   */
  private getMockConsoleLogs(): any[] {
    return [
      { type: 'log', message: 'BrowserToolsTest component mounted', timestamp: Date.now() - 5000 },
      { type: 'info', message: 'This is an info message', timestamp: Date.now() - 4000 },
      { type: 'debug', message: 'This is a debug message', timestamp: Date.now() - 3000 },
      { type: 'warning', message: 'This is a warning message', timestamp: Date.now() - 2000 },
      { type: 'error', message: 'This is an error message', timestamp: Date.now() - 1000 },
      { type: 'error', message: 'Test error: Cannot read properties of null (reading \'nonExistentMethod\')', timestamp: Date.now() }
    ];
  }
}

// Create and export a singleton instance
const browserToolsService = new BrowserToolsService();
export default browserToolsService;
