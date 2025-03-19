import React, { useEffect, useState } from 'react';
import { BrowserTools } from '@/components/ui/browser-tools';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// No need to import Geist font as we're using CSS classes

/**
 * Test page for Browser Tools MCP
 */
export default function BrowserToolsTest() {
  const [count, setCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Generate some console logs for testing
  useEffect(() => {
    console.log('BrowserToolsTest component mounted');
    console.info('This is an info message');
    console.debug('This is a debug message');
    console.warn('This is a warning message');
    console.error('This is an error message');
    
    // Log the environment variables
    console.log('Environment variables:', {
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      FMP_API_KEY: import.meta.env.VITE_FMP_API_KEY ? 'Set' : 'Not set',
      PERPLEXITY_API_KEY: import.meta.env.VITE_PERPLEXITY_API_KEY ? 'Set' : 'Not set',
      MISTRAL_API_KEY: import.meta.env.VITE_MISTRAL_API_KEY ? 'Set' : 'Not set'
    });
  }, []);

  // Add a log entry
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  // Generate a test error
  const generateError = () => {
    try {
      // @ts-ignore - Intentional error for testing
      const obj = null;
      obj.nonExistentMethod();
    } catch (error) {
      console.error('Test error:', error);
      addLog(`Generated error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-background font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Browser Tools MCP Test</CardTitle>
            <CardDescription>
              This page tests the integration with the Browser Tools MCP extension
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-8 border rounded-md">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Counter: {count}</h2>
                <div className="flex space-x-4">
                  <Button onClick={() => {
                    setCount(prev => prev + 1);
                    addLog('Incremented counter');
                  }}>
                    Increment
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCount(prev => prev - 1);
                      addLog('Decremented counter');
                    }}
                  >
                    Decrement
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={generateError}
                  >
                    Generate Error
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Activity Log:</h3>
              <div className="h-32 overflow-y-auto bg-muted p-2 rounded-md">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="text-sm py-1 border-b border-border last:border-0">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No activity yet. Try clicking the buttons above.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full">
              <h3 className="font-medium mb-4">Browser Tools Component:</h3>
              <BrowserTools />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
