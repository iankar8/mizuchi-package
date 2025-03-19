import { useState, useEffect } from 'react';
import { runDiagnostics, quickHealthCheck, resetSupabaseConnection } from '@/utils/supabase/diagnostics';
import { refreshAuthToken } from '@/utils/supabase/client';
import { tokenManager } from '@/utils/supabase/tokenManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Check, Loader2, RefreshCw, X } from 'lucide-react';
import { isError } from '@/utils/supabase/resultUtils';

export default function SupabaseNewDiagnostics() {
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('health');
  const { toast } = useToast();

  // Run quick health check on component mount
  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      console.log('Running quick health check...');
      const result = await quickHealthCheck();
      setHealthCheck(result);
      console.log('Health check complete:', result);
    } catch (err) {
      console.error('Error running health check:', err);
      toast({
        title: 'Health Check Failed',
        description: 'There was an error running the health check',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const runFullDiagnostics = async () => {
    setLoading(true);
    try {
      console.log('Running full diagnostics...');
      toast({
        title: 'Running Diagnostics',
        description: 'This may take up to a minute to complete...',
      });
      
      const result = await runDiagnostics();
      setDiagnosticResults(result);
      setActiveTab('full');
      
      console.log('Full diagnostics complete:', result);
      
      // Show success/failure toast
      if (isError(result)) {
        toast({
          title: 'Diagnostics Error',
          description: result.error || 'Error running diagnostics',
          variant: 'destructive',
        });
      } else if (result.data?.success) {
        toast({
          title: 'Diagnostics Complete',
          description: 'All critical tests passed!',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Diagnostics Complete',
          description: 'Some tests failed. See details for more information.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error running diagnostics:', err);
      toast({
        title: 'Diagnostics Failed',
        description: 'There was an error running the diagnostics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetConnection = async () => {
    setLoading(true);
    try {
      console.log('Resetting Supabase connection...');
      const result = await resetSupabaseConnection();
      
      if (isError(result)) {
        toast({
          title: 'Reset Failed',
          description: result.error || 'Failed to reset connection',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Connection Reset',
          description: 'Supabase connection has been reset. Page will reload.',
          variant: 'default',
        });
        
        // Force page reload after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      console.error('Error resetting connection:', err);
      toast({
        title: 'Reset Failed',
        description: 'There was an error resetting the connection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    setLoading(true);
    try {
      console.log('Refreshing auth token...');
      const refreshed = await tokenManager.refreshToken();
      
      if (refreshed) {
        toast({
          title: 'Token Refreshed',
          description: 'Authentication token was successfully refreshed',
          variant: 'default',
        });
        
        // Re-run health check after token refresh
        await runHealthCheck();
      } else {
        toast({
          title: 'Token Refresh Failed',
          description: 'Unable to refresh authentication token',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error refreshing token:', err);
      toast({
        title: 'Token Refresh Failed',
        description: 'There was an error refreshing the token',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (unixTimestamp: number) => {
    if (!unixTimestamp) return 'Unknown';
    return new Date(unixTimestamp * 1000).toLocaleString();
  };

  const getStatusBadge = (status: boolean | undefined) => {
    if (status === undefined) return <Badge variant="outline">Unknown</Badge>;
    return status ? 
      <Badge className="bg-green-500 hover:bg-green-600">Success</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Supabase Diagnostics</h1>
          <p className="text-muted-foreground">
            Enhanced diagnostics for Supabase connection issues
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runFullDiagnostics} 
            disabled={loading}
            variant="default"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {loading ? 'Running...' : 'Run Full Diagnostics'}
          </Button>
          <Button
            onClick={resetConnection}
            disabled={loading}
            variant="outline"
          >
            Reset Connection
          </Button>
          <Button
            onClick={() => window.location.href = '/supabase-diagnostics'}
            variant="outline"
          >
            Legacy Diagnostics
          </Button>
        </div>
      </div>
      
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Status</AlertTitle>
        <AlertDescription>
          {healthCheck ? (
            healthCheck.data?.healthy ? (
              <span className="text-green-500 font-medium flex items-center">
                <Check className="mr-2 h-4 w-4" />
                Connection is healthy
              </span>
            ) : (
              <span className="text-red-500 font-medium flex items-center">
                <X className="mr-2 h-4 w-4" />
                Connection issues detected
              </span>
            )
          ) : (
            <span className="text-muted-foreground">Running connection check...</span>
          )}
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="health">Quick Health Check</TabsTrigger>
          <TabsTrigger value="full">Full Diagnostics</TabsTrigger>
          <TabsTrigger value="fixes">Common Fixes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Connection Health</CardTitle>
              <CardDescription>
                Quick check of your Supabase connection status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthCheck ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="font-medium mb-1">API Connection</div>
                      <div className="flex items-center">
                        {healthCheck.data?.apiAccessible ? (
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        {healthCheck.data?.apiAccessible ? 'Connected' : 'Failed'}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="font-medium mb-1">Authentication</div>
                      <div className="flex items-center">
                        {healthCheck.data?.authenticated ? (
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        {healthCheck.data?.authenticated ? 'Authenticated' : 'Not Authenticated'}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="font-medium mb-1">Database Access</div>
                      <div className="flex items-center">
                        {healthCheck.data?.databaseAccessible === true ? (
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                        ) : healthCheck.data?.databaseAccessible === false ? (
                          <X className="h-4 w-4 text-red-500 mr-2" />
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                        {healthCheck.data?.databaseAccessible === true ? 'Accessible' : 
                         healthCheck.data?.databaseAccessible === false ? 'Inaccessible' : 
                         'Not tested - no auth'}
                      </div>
                    </div>
                  </div>
                  
                  {healthCheck.error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{healthCheck.error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Accordion type="single" collapsible>
                    <AccordionItem value="raw">
                      <AccordionTrigger>Raw Health Check Data</AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
                          {JSON.stringify(healthCheck, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <div className="flex gap-2">
                <Button onClick={runHealthCheck} disabled={loading} variant="outline">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
                <Button onClick={refreshToken} disabled={loading} variant="outline">
                  Refresh Token
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="full">
          {diagnosticResults ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle>Full Diagnostic Results</CardTitle>
                  {getStatusBadge(diagnosticResults.data?.success)}
                </div>
                <CardDescription>
                  Comprehensive check of your Supabase connection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Connection Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Connection</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="font-medium mb-1">API Connection</div>
                        <div className="flex items-center">
                          {diagnosticResults.data?.tests.connection?.success ? (
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <X className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          {diagnosticResults.data?.tests.connection?.success ? 'Connected' : 'Failed'}
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <div className="font-medium mb-1">CORS Configuration</div>
                        <div className="flex items-center">
                          {diagnosticResults.data?.tests.connection?.cors?.success ? (
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <X className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          {diagnosticResults.data?.tests.connection?.cors?.success ? 'Configured' : 'Issues Detected'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Authentication Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Authentication</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <div className="font-medium mb-1">Session</div>
                        <div className="flex items-center">
                          {diagnosticResults.data?.tests.authentication?.success ? (
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <X className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          {diagnosticResults.data?.tests.authentication?.success ? 'Active' : 'None'}
                        </div>
                        {diagnosticResults.data?.tests.authentication?.success && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <div>User: {diagnosticResults.data?.tests.authentication?.userId || 'Unknown'}</div>
                            <div>Expires in: {diagnosticResults.data?.tests.authentication?.expiresIn || 'Unknown'} seconds</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <div className="font-medium mb-1">Token Refresh</div>
                        <div className="flex items-center">
                          {diagnosticResults.data?.tests.tokenRefresh?.success ? (
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <X className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          {diagnosticResults.data?.tests.tokenRefresh?.message || 'Unknown'}
                        </div>
                        {diagnosticResults.data?.tests.tokenManager && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <div>Manager State: {diagnosticResults.data?.tests.tokenManager?.isRefreshing ? 'Refreshing' : 'Idle'}</div>
                            {diagnosticResults.data?.tests.tokenManager?.expiresAt && (
                              <div>Expires At: {formatTimestamp(diagnosticResults.data?.tests.tokenManager?.expiresAt)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Database Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Database Access</h3>
                    <div className="border rounded-lg p-4">
                      <div className="font-medium mb-3">Table Access</div>
                      {diagnosticResults.data?.tests.databaseAccess ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Object.entries(diagnosticResults.data?.tests.databaseAccess)
                            .filter(([key]) => key !== 'message')
                            .map(([table, access]: [string, any]) => (
                              <div key={table} className="flex items-center">
                                <div className="font-medium mr-2">{table}:</div>
                                {access?.select ? (
                                  <Badge className="bg-green-500 hover:bg-green-600">Access</Badge>
                                ) : (
                                  <Badge variant="destructive">No Access</Badge>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          {diagnosticResults.data?.tests.databaseAccess?.message || 'Database access not tested'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Storage Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Storage</h3>
                    <div className="border rounded-lg p-4">
                      <div className="font-medium mb-1">LocalStorage Items</div>
                      {diagnosticResults.data?.tests.storage?.itemCount ? (
                        <div>
                          <div className="text-sm">
                            Found {diagnosticResults.data?.tests.storage?.itemCount} Supabase-related items
                            {diagnosticResults.data?.tests.storage?.hasToken ? ' (including auth token)' : ''}
                          </div>
                          
                          <Accordion type="single" collapsible className="mt-2">
                            <AccordionItem value="storage">
                              <AccordionTrigger className="text-sm">View Storage Items</AccordionTrigger>
                              <AccordionContent>
                                <ScrollArea className="h-40 w-full rounded border p-2">
                                  {diagnosticResults.data?.tests.storage?.items?.map((item: any, index: number) => (
                                    <div key={index} className="text-xs mb-1">
                                      <span className="font-mono">{item.key}</span> 
                                      <span className="text-muted-foreground ml-2">({item.length} bytes)</span>
                                    </div>
                                  ))}
                                </ScrollArea>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">No Supabase storage items found</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Realtime Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Realtime</h3>
                    <div className="border rounded-lg p-4">
                      <div className="font-medium mb-1">Websocket Connection</div>
                      <div className="flex items-center">
                        {diagnosticResults.data?.tests.realtime?.success ? (
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        {diagnosticResults.data?.tests.realtime?.success ? 
                          `Connected (${diagnosticResults.data?.tests.realtime?.status})` : 
                          `Failed (${diagnosticResults.data?.tests.realtime?.status || 'unknown'})`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Raw Data */}
                  <Accordion type="single" collapsible>
                    <AccordionItem value="raw">
                      <AccordionTrigger>Raw Diagnostic Data</AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
                          {JSON.stringify(diagnosticResults, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex gap-2">
                  <Button onClick={runFullDiagnostics} disabled={loading} variant="outline">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Run Again
                  </Button>
                  <Button onClick={resetConnection} disabled={loading} variant="outline">
                    Reset Connection
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Full Diagnostics</CardTitle>
                <CardDescription>
                  Run a comprehensive test of your Supabase connection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-4 text-muted-foreground">
                    Full diagnostics test your connection to Supabase API, authentication, 
                    database access, realtime subscriptions, and more.
                  </div>
                  <Button onClick={runFullDiagnostics} disabled={loading} size="lg" className="mt-2">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {loading ? 'Running...' : 'Run Full Diagnostics'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="fixes">
          <Card>
            <CardHeader>
              <CardTitle>Common Fixes</CardTitle>
              <CardDescription>
                Solutions for common Supabase connection issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="authentication">
                  <AccordionTrigger>Authentication Issues</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Token Expiration</h4>
                        <p className="text-sm text-muted-foreground">
                          If your token is expired, try refreshing it:
                        </p>
                        <Button 
                          onClick={refreshToken} 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                        >
                          Refresh Token
                        </Button>
                      </div>
                      <div>
                        <h4 className="font-medium">Session Issues</h4>
                        <p className="text-sm text-muted-foreground">
                          If there are persistent issues with your session, try resetting your Supabase storage:
                        </p>
                        <Button 
                          onClick={resetConnection} 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                        >
                          Reset Connection
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="database">
                  <AccordionTrigger>Database Access Issues</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">RLS Policy Problems</h4>
                      <p className="text-sm text-muted-foreground">
                        If you can authenticate but can't access data, you may have Row Level Security (RLS) policy issues:
                      </p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        <li>Ensure RLS is enabled on your tables</li>
                        <li>Check that your RLS policies allow the authenticated user to access the data</li>
                        <li>Verify that the user's role has the necessary permissions</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="cors">
                  <AccordionTrigger>CORS Configuration</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">CORS Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Cross-Origin Resource Sharing (CORS) issues can prevent your app from accessing Supabase:
                      </p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        <li>Add your app's origin URL to the allowed origins in Supabase Dashboard</li>
                        <li>Ensure you've included <code className="bg-muted px-1 rounded text-xs">https://your-app-domain.com</code> in the CORS settings</li>
                        <li>If testing locally, add <code className="bg-muted px-1 rounded text-xs">http://localhost:3000</code> (or your dev server port)</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="realtime">
                  <AccordionTrigger>Realtime Issues</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">Realtime Subscriptions</h4>
                      <p className="text-sm text-muted-foreground">
                        If realtime subscriptions aren't working:
                      </p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                        <li>Ensure Realtime is enabled for your project in Supabase Dashboard</li>
                        <li>Check that your table has realtime enabled</li>
                        <li>Verify that your subscription is using the correct channel name</li>
                        <li>Confirm that your subscription includes the correct event types</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}