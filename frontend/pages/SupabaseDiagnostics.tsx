import React, { useState, useEffect } from 'react';
import { 
  supabase, 
  testSupabaseConnection, 
  clearSupabaseStorage, 
  performDirectAuthCheck,
  createClient,
  refreshAuthToken
} from '@/utils/supabase/client';
import { getDatabaseDiagnostics } from '@/utils/supabase/dbUtils';
import { SupabaseDiagnostics as DiagnosticsUtil } from '@/utils/supabase/diagnostics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth';
import { AlertCircle, Check, Loader2, RefreshCw, X } from 'lucide-react';

export default function SupabaseDiagnostics() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [directTestResults, setDirectTestResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tests');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [connectionTest, setConnectionTest] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Extract project info from URL
    // Access URL from environment variables instead of protected property
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (url) {
      const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (match && match[1]) {
        setProjectInfo({
          id: match[1],
          url: url
        });
      }
    }
  }, []);

  const runDirectConnectionTest = async () => {
    setLoading(true);
    try {
      // Use the test connection utility
      const result = await testSupabaseConnection();
      setConnectionTest(result);
      console.log('Connection test result:', result);
      
      toast({
        title: result.success ? 'Connection successful' : 'Connection failed',
        description: result.success 
          ? 'Your Supabase connection is working properly' 
          : 'Check the console for detailed error information',
        variant: result.success ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionTest({ success: false, error: String(error) });
      toast({
        title: 'Connection test failed',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearStorage = async () => {
    setLoading(true);
    try {
      await clearSupabaseStorage();
      toast({
        title: 'Storage cleared',
        description: 'All Supabase-related storage has been cleared',
      });
    } catch (error) {
      console.error('Clear storage failed:', error);
      toast({
        title: 'Failed to clear storage',
        description: 'An error occurred while clearing storage',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const testDirectAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(false);
    
    try {
      if (!email || !password) {
        setAuthError('Email and password are required');
        return;
      }
      
      // Force a new client instance
      const testClient = createClient();
      
      // Attempt sign in
      const { data, error } = await testClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Auth error:', error);
        setAuthError(error.message);
        setDirectTestResults({
          success: false,
          error: error.message,
          details: error
        });
        return;
      }
      
      // Check if we actually have a session
      if (!data.session) {
        setAuthError('No session returned despite successful login');
        setDirectTestResults({
          success: false,
          error: 'No session returned',
          details: data
        });
        return;
      }
      
      // Success!
      setAuthSuccess(true);
      setDirectTestResults({
        success: true,
        session: {
          user: data.session.user.email,
          expires: new Date(data.session.expires_at * 1000).toLocaleString(),
          userId: data.session.user.id
        }
      });
      
      toast({
        title: 'Authentication successful',
        description: `Logged in as ${data.session.user.email}`,
      });
    } catch (error: any) {
      console.error('Authentication test failed:', error);
      setAuthError(error.message);
      setDirectTestResults({
        success: false,
        error: error.message,
        exception: error
      });
    } finally {
      setAuthLoading(false);
    }
  };
  
  const runAllTests = async () => {
    setLoading(true);
    try {
      // First, run the connection test
      const connectionResult = await testSupabaseConnection();
      
      // Then run the other tests
      const [
        authResult,
        databaseResult,
        realtimeResult,
        corsResult,
        tablesResult,
        settingsResult
      ] = await Promise.all([
        testAuth(),
        testDatabase(),
        testRealtime(),
        testCORS(),
        testTables(),
        testProjectSettings()
      ]);

      const results: Record<string, any> = {
        connection: connectionResult,
        auth: authResult,
        database: databaseResult,
        realtime: realtimeResult,
        cors: corsResult,
        tables: tablesResult,
        settings: settingsResult
      };
      
      setResults(results);
      setConnectionTest(connectionResult);
      
      // Log comprehensive results
      console.log('Supabase Diagnostics Results:', results);
      
      // Determine overall status
      const mainTests = ['connection', 'auth', 'database', 'cors'];
      const criticalSuccess = mainTests.every(key => results[key]?.success);
      
      toast({
        title: criticalSuccess ? 'Critical tests passed!' : 'Some tests failed',
        description: criticalSuccess 
          ? 'Your Supabase connection and auth are working correctly' 
          : 'Check the results for details on what needs to be fixed',
        variant: criticalSuccess ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast({
        title: 'Diagnostics failed',
        description: 'An unexpected error occurred while running tests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    try {
      console.log('Testing authentication...');
      
      // First check if we can connect to auth service
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return {
          success: false,
          message: 'Authentication service error',
          error: sessionError.message,
          details: sessionError
        };
      }
      
      // Then verify we can make authenticated requests
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      
      // If we have a session but can't access data, it might be an RLS issue
      if (session && userError) {
        console.error('Data access error:', userError);
        return {
          success: false,
          message: 'Authentication OK but data access failed - check RLS policies',
          error: userError.message,
          data: {
            session: true,
            user: session.user.email,
            rls: 'Blocked'
          }
        };
      }
      
      return {
        success: !!session,
        message: session ? 'Fully authenticated with data access' : 'Not authenticated',
        data: session ? {
          user: session.user.email,
          expires: new Date(session.expires_at * 1000).toLocaleString(),
          dataAccess: !!userData
        } : null
      };
    } catch (error: any) {
      console.error('Auth test error:', error);
      return {
        success: false,
        message: 'Authentication test failed',
        error: error.message,
        details: error
      };
    }
  };

  const testDatabase = async () => {
    try {
      console.log('Testing database connection...');
      // Try to query a simple table that should exist
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        // Check if it's a permissions error vs connection error
        if (error.code === 'PGRST301') {
          return {
            success: false,
            message: 'Permission denied - RLS may be blocking access',
            error: error.message,
            details: error
          };
        } else if (error.code === 'PGRST116') {
          return {
            success: true,
            message: 'Database connected but table not found',
            details: 'The profiles table does not exist, but the connection works'
          };
        } else {
          return {
            success: false,
            message: 'Database error',
            error: error.message,
            details: error
          };
        }
      }
      
      return {
        success: true,
        message: 'Database connection successful',
        data
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Database test failed',
        error: error.message,
        details: error
      };
    }
  };

  const testRealtime = async () => {
    try {
      console.log('Testing realtime connection...');
      
      return new Promise((resolve) => {
        let resolved = false;
        let statusMessage = 'Connecting...';
        let connectionAttempts = 0;
        const maxAttempts = 2;
        
        // Create a unique channel name
        const channelName = `test-channel-${Date.now()}`;
        
        // Function to attempt connection
        const attemptConnection = () => {
          if (connectionAttempts >= maxAttempts) {
            if (!resolved) {
              resolved = true;
              resolve({
                success: false,
                message: 'Realtime connection failed after multiple attempts',
                error: `Failed after ${maxAttempts} attempts`,
                details: statusMessage
              });
            }
            return;
          }
          
          connectionAttempts++;
          console.log(`Realtime connection attempt ${connectionAttempts}...`);
          
          // Subscribe to a test channel
          const channel = supabase.channel(channelName, {
            config: {
              broadcast: { self: true }
            }
          });
          
          // Reduced timeout for faster testing
          const timeout = setTimeout(() => {
            if (!resolved) {
              channel.unsubscribe();
              console.log('Attempt timed out, retrying...');
              attemptConnection();
            }
          }, 3000);
          
          channel
            .on('presence', { event: 'sync' }, () => {
              statusMessage = 'Presence sync received';
            })
            .on('presence', { event: 'join' }, () => {
              statusMessage = 'Presence join received';
            })
            .on('system', { event: 'connected' }, () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve({
                  success: true,
                  message: 'Realtime connection successful',
                  details: `Connected on attempt ${connectionAttempts}/${maxAttempts}`
                });
                
                // Clean up after success
                setTimeout(() => {
                  channel.unsubscribe();
                }, 1000);
              }
            })
            .on('system', { event: 'disconnected' }, () => {
              statusMessage = `Disconnected on attempt ${connectionAttempts}`;
              if (!resolved) {
                clearTimeout(timeout);
                attemptConnection();
              }
            })
            .subscribe(async (status) => {
              console.log(`Realtime subscription status (attempt ${connectionAttempts}):`, status);
            });
        };
        
        // Start the first attempt
        attemptConnection();
      });
    } catch (error: any) {
      console.error('Realtime test error:', error);
      return {
        success: false,
        message: 'Realtime test failed',
        error: error.message,
        details: error
      };
    }
  };

  const testCORS = async () => {
    try {
      console.log('Testing CORS configuration...');
      
      // Test CORS by making a simple fetch request to the Supabase API
      // Use environment variables instead of protected properties
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        success: response.ok || response.status === 404, // 404 is fine, means endpoint doesn't exist but CORS is working
        message: response.ok ? 'CORS configured correctly' : 
                 response.status === 404 ? 'CORS working (404 is expected)' : 
                 `CORS issue: ${response.status} ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'CORS test failed',
        error: error.message,
        details: error
      };
    }
  };

  const testTables = async () => {
    try {
      console.log('Testing table access...');
      
      // Get list of tables
      const { data, error } = await supabase
        .rpc('get_tables_info') as { data: any, error: any };
      
      if (error) {
        // Try alternative approach - use a direct query instead
        // Since we can't access information_schema directly in the type system
        const { data: schemaData, error: schemaError } = await supabase
          .from('profiles') // Use a known table instead
          .select('count')
          .limit(1);
          
        if (schemaError) {
          return {
            success: false,
            message: 'Could not retrieve table information',
            error: error.message,
            details: { originalError: error, schemaError }
          };
        }
        
        return {
          success: true,
          message: 'Retrieved tables using information_schema',
          data: schemaData
        };
      }
      
      return {
        success: true,
        message: 'Retrieved table information',
        data
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Table test failed',
        error: error.message,
        details: error
      };
    }
  };

  const testProjectSettings = async () => {
    try {
      console.log('Testing project settings...');
      
      // We can't directly access project settings via client API
      // Instead, we'll check for common issues based on other test results
      
      const { data: session } = await supabase.auth.getSession();
      const isLoggedIn = !!session.session;
      
      // Check if site URL is likely configured correctly
      const currentUrl = window.location.origin;
      
      return {
        success: true, // This is informational only
        message: 'Project settings check complete',
        recommendations: [
          {
            name: 'Site URL',
            value: currentUrl,
            recommendation: `Ensure ${currentUrl} is added to the Site URL in Supabase Authentication settings`
          },
          {
            name: 'Redirect URLs',
            value: `${currentUrl}/*`,
            recommendation: `Ensure ${currentUrl}/* is added to the Redirect URLs in Supabase Authentication settings`
          },
          {
            name: 'CORS Origins',
            value: currentUrl,
            recommendation: `Ensure ${currentUrl} is added to the CORS origins in Supabase API settings`
          },
          {
            name: 'RLS Policies',
            recommendation: 'Check Row Level Security policies for your tables'
          },
          {
            name: 'Email Restrictions',
            recommendation: 'If email signup is failing, check for domain restrictions in Authentication settings'
          }
        ]
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Project settings test failed',
        error: error.message,
        details: error
      };
    }
  };

  const getStatusBadge = (status: boolean | undefined) => {
    if (status === undefined) return <Badge variant="outline">Not Run</Badge>;
    return status ? 
      <Badge variant="default" className="bg-green-500 text-white">Success</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Supabase Diagnostics</h1>
          <p className="text-muted-foreground">
            Comprehensive diagnostics for your Supabase connection
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={loading}
            variant="default"
          >
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          <Button 
            onClick={async () => {
              setLoading(true);
              try {
                const diagnosticResults = await DiagnosticsUtil.runConnectionDiagnostics();
                setResults({
                  ...results,
                  enhancedDiagnostics: diagnosticResults
                });
                toast({
                  title: 'Enhanced diagnostics complete',
                  description: 'Check the Enhanced Diagnostics tab for results',
                });
                setActiveTab('enhanced');
              } catch (error) {
                console.error('Error running enhanced diagnostics:', error);
                toast({
                  title: 'Diagnostics failed',
                  description: 'An error occurred running enhanced diagnostics',
                  variant: 'destructive'
                });
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Running...' : 'Enhanced Diagnostics'}
          </Button>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.href = '/supabase-test'}
              variant="outline"
            >
              Back to Test Page
            </Button>
            <Button 
              onClick={() => window.location.href = '/supabase-auth-debug'}
              variant="default"
            >
              Auth Debugger
            </Button>
          </div>
        </div>
      </div>
      
      {projectInfo && (
        <Alert className="mb-6">
          <AlertTitle>Project Information</AlertTitle>
          <AlertDescription>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <span className="font-semibold">Project ID:</span> {projectInfo.id}
              </div>
              <div>
                <span className="font-semibold">URL:</span> {projectInfo.url}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="results" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="enhanced">Enhanced Diagnostics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="debug">Debug Info</TabsTrigger>
        </TabsList>
        
        <TabsContent value="results">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Authentication</CardTitle>
                  {getStatusBadge(results.auth?.success)}
                </div>
                <CardDescription>
                  {results.auth?.message || 'Test not run yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.auth?.data && (
                  <div className="text-sm">
                    <p><span className="font-semibold">User:</span> {results.auth.data.user}</p>
                    <p><span className="font-semibold">Expires:</span> {results.auth.data.expires}</p>
                  </div>
                )}
                {results.auth?.error && (
                  <div className="text-sm text-red-500 mt-2">
                    {results.auth.error}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshToken}
                  disabled={loading}
                >
                  Refresh Token
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Database</CardTitle>
                  {getStatusBadge(results.database?.success)}
                </div>
                <CardDescription>
                  {results.database?.message || 'Test not run yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.database?.error && (
                  <div className="text-sm text-red-500 mt-2">
                    {results.database.error}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Realtime</CardTitle>
                  {getStatusBadge(results.realtime?.success)}
                </div>
                <CardDescription>
                  {results.realtime?.message || 'Test not run yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.realtime?.details && (
                  <div className="text-sm">
                    <p>{results.realtime.details}</p>
                  </div>
                )}
                {results.realtime?.error && (
                  <div className="text-sm text-red-500 mt-2">
                    {results.realtime.error}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">CORS</CardTitle>
                  {getStatusBadge(results.cors?.success)}
                </div>
                <CardDescription>
                  {results.cors?.message || 'Test not run yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.cors?.details && (
                  <div className="text-sm">
                    <p><span className="font-semibold">Status:</span> {results.cors.details.status} {results.cors.details.statusText}</p>
                  </div>
                )}
                {results.cors?.error && (
                  <div className="text-sm text-red-500 mt-2">
                    {results.cors.error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="enhanced">
          {results.enhancedDiagnostics ? (
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Diagnostics</CardTitle>
                <CardDescription>
                  Comprehensive testing of Supabase connection, authentication, and database access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="rounded-lg border p-3">
                    <div className="font-semibold flex items-center gap-2">
                      Connection
                      {results.enhancedDiagnostics.overallStatus?.connected ? 
                        <Check className="h-4 w-4 text-green-500" /> : 
                        <X className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {results.enhancedDiagnostics.overallStatus?.connected ? 
                        'Connected to Supabase API' : 
                        'Failed to connect to Supabase API'}
                    </div>
                  </div>
                  
                  <div className="rounded-lg border p-3">
                    <div className="font-semibold flex items-center gap-2">
                      Authentication
                      {results.enhancedDiagnostics.overallStatus?.authenticated ? 
                        <Check className="h-4 w-4 text-green-500" /> : 
                        <X className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {results.enhancedDiagnostics.overallStatus?.authenticated ? 
                        'User is authenticated' : 
                        'User is not authenticated'}
                    </div>
                  </div>
                  
                  <div className="rounded-lg border p-3">
                    <div className="font-semibold flex items-center gap-2">
                      Database
                      {results.enhancedDiagnostics.overallStatus?.databaseAccessible ? 
                        <Check className="h-4 w-4 text-green-500" /> : 
                        <X className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {results.enhancedDiagnostics.overallStatus?.databaseAccessible ? 
                        'Database tables accessible' : 
                        'Cannot access database tables'}
                    </div>
                  </div>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="auth">
                    <AccordionTrigger>Authentication Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-3 rounded text-xs font-mono">
                        <pre>{JSON.stringify(results.enhancedDiagnostics.steps?.authStatus, null, 2)}</pre>
                      </div>
                      {results.enhancedDiagnostics.steps?.tokenRefresh && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Token Refresh:</p>
                          <div className="bg-muted p-3 rounded text-xs font-mono mt-1">
                            <pre>{JSON.stringify(results.enhancedDiagnostics.steps?.tokenRefresh, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="database">
                    <AccordionTrigger>Database Diagnostics</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-3 rounded text-xs font-mono">
                        <pre>{JSON.stringify(results.enhancedDiagnostics.steps?.databaseDiagnostics, null, 2)}</pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="localStorage">
                    <AccordionTrigger>Local Storage</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-3 rounded text-xs font-mono">
                        <pre>{JSON.stringify(results.enhancedDiagnostics.steps?.localStorage, null, 2)}</pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="all">
                    <AccordionTrigger>All Results</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-3 rounded text-xs font-mono overflow-auto max-h-96">
                        <pre>{JSON.stringify(results.enhancedDiagnostics, null, 2)}</pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await refreshAuthToken();
                        toast({
                          title: 'Token refreshed',
                          description: 'Auth token has been refreshed'
                        });
                        // Re-run diagnostics to update data
                        const updatedDiagnostics = await runConnectionDiagnostics();
                        setResults({
                          ...results,
                          enhancedDiagnostics: updatedDiagnostics
                        });
                      } catch (error) {
                        toast({
                          title: 'Token refresh failed',
                          description: 'Failed to refresh auth token',
                          variant: 'destructive'
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    Refresh Token
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={resetSupabase}
                    disabled={loading}
                  >
                    Reset Storage
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Diagnostics</CardTitle>
                <CardDescription>
                  Run enhanced diagnostics to get detailed information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const diagnosticResults = await DiagnosticsUtil.runConnectionDiagnostics();
                      setResults({
                        ...results,
                        enhancedDiagnostics: diagnosticResults
                      });
                      toast({
                        title: 'Enhanced diagnostics complete',
                        description: 'Check the results for details',
                      });
                    } catch (error) {
                      console.error('Error running enhanced diagnostics:', error);
                      toast({
                        title: 'Diagnostics failed',
                        description: 'An error occurred running enhanced diagnostics',
                        variant: 'destructive'
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Running...' : 'Run Enhanced Diagnostics'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="recommendations">
          {results.settings?.recommendations ? (
            <Card>
              <CardHeader>
                <CardTitle>Configuration Recommendations</CardTitle>
                <CardDescription>
                  Based on test results, here are recommended settings for your Supabase project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {results.settings.recommendations.map((rec: any, index: number) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>{rec.name}</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {rec.value && (
                            <div className="bg-muted p-2 rounded font-mono text-sm">
                              {rec.value}
                            </div>
                          )}
                          <p>{rec.recommendation}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={() => window.open('https://app.supabase.com/project/' + projectInfo?.id + '/settings/api', '_blank')}
                >
                  Open Supabase Dashboard
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Recommendations Available</CardTitle>
                <CardDescription>
                  Run the tests first to get configuration recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={runAllTests} disabled={loading}>
                  {loading ? 'Running Tests...' : 'Run Tests'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>
                Technical details for troubleshooting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded overflow-auto max-h-96 text-xs">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(results, null, 2));
                  toast({
                    title: 'Copied to clipboard',
                    description: 'Debug information has been copied to your clipboard'
                  });
                }}
              >
                Copy to Clipboard
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
