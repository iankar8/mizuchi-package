import React, { useState } from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import browserToolsService from '@/services/browserToolsService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Separator } from './separator';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
// Using CSS classes for fonts

/**
 * Browser Tools Component
 * 
 * Provides a UI for interacting with the Browser Tools MCP extension
 */
export function BrowserTools() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Take a screenshot of the current page
  const handleTakeScreenshot = async () => {
    setLoading('screenshot');
    const result = await browserToolsService.takeScreenshot();
    
    // Check if the result is a message instead of a base64 image
    if (typeof result === 'string' && !result.startsWith('data:') && !result.match(/^[A-Za-z0-9+/=]+$/)) {
      // Display a message instead of an image
      console.log('Screenshot message:', result);
      // Set a placeholder image
      setScreenshot('placeholder');
    } else {
      setScreenshot(result);
    }
    
    setLoading(null);
  };

  // Get console logs from the browser
  const handleGetLogs = async () => {
    setLoading('logs');
    const result = await browserToolsService.getConsoleLogs();
    setLogs(result);
    setLoading(null);
  };

  // Run a performance audit on the current page
  const handleRunAudit = async () => {
    setLoading('audit');
    const result = await browserToolsService.runPerformanceAudit();
    setAuditResults(result);
    setLoading(null);
  };

  // Format log level for display
  const getLogLevelBadge = (level: string) => {
    const levelMap: Record<string, { color: string, label: string }> = {
      'error': { color: 'bg-red-500', label: 'Error' },
      'warning': { color: 'bg-yellow-500', label: 'Warning' },
      'info': { color: 'bg-blue-500', label: 'Info' },
      'log': { color: 'bg-gray-500', label: 'Log' },
      'debug': { color: 'bg-green-500', label: 'Debug' }
    };

    const { color, label } = levelMap[level] || { color: 'bg-gray-500', label: level };
    
    return (
      <Badge variant="outline" className={`${color} text-white`}>
        {label}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Browser Tools</CardTitle>
        <CardDescription>
          Interact with the browser using the Browser Tools MCP extension
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="screenshot">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
            <TabsTrigger value="logs">Console Logs</TabsTrigger>
            <TabsTrigger value="audit">Lighthouse Audit</TabsTrigger>
          </TabsList>
          
          <TabsContent value="screenshot" className="mt-4">
            {screenshot ? (
              <div className="mt-4">
                {screenshot === 'placeholder' ? (
                  <div className="p-4 border rounded-md bg-muted text-center">
                    <p className="font-medium mb-2">Browser Extension Required</p>
                    <p className="text-sm text-muted-foreground">
                      Screenshots require the Chrome browser with the Browser Tools extension installed.
                      <br />
                      Please install the extension from the GitHub repository.
                    </p>
                  </div>
                ) : (
                  <img 
                    src={`data:image/png;base64,${screenshot}`} 
                    alt="Page Screenshot" 
                    className="w-full border rounded-md"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border rounded-md bg-muted">
                <p className="text-muted-foreground">No screenshot taken yet</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="logs" className="mt-4">
            <ScrollArea className="h-64 border rounded-md p-4">
              {logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-2">
                        {getLogLevelBadge(log.type)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-xs p-2 bg-muted rounded-md overflow-x-auto font-mono">
                        {log.message}
                      </pre>
                      <Separator className="my-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No logs retrieved yet</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="audit" className="mt-4">
            {auditResults ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(auditResults.categories).map(([key, category]: [string, any]) => (
                    <Card key={key}>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm">{category.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">
                            {Math.round(category.score * 100)}
                          </span>
                          <span className="text-xs text-muted-foreground">/100</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Audit Details</h3>
                  <ScrollArea className="h-64">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(auditResults, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border rounded-md bg-muted">
                <p className="text-muted-foreground">No audit results yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          onClick={handleTakeScreenshot} 
          disabled={loading === 'screenshot'}
        >
          {loading === 'screenshot' ? 'Taking Screenshot...' : 'Take Screenshot'}
        </Button>
        <Button 
          onClick={handleGetLogs} 
          disabled={loading === 'logs'}
          variant="outline"
        >
          {loading === 'logs' ? 'Getting Logs...' : 'Get Console Logs'}
        </Button>
        <Button 
          onClick={handleRunAudit} 
          disabled={loading === 'audit'}
          variant="secondary"
        >
          {loading === 'audit' ? 'Running Audit...' : 'Run Lighthouse Audit'}
        </Button>
      </CardFooter>
    </Card>
  );
}
