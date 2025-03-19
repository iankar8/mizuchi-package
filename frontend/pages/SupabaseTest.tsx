import { useState, useEffect } from 'react';
import { supabase, testSupabaseConnection } from '@/utils/supabase/client';
import { WatchlistService } from '@/services/watchlist.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function SupabaseTest() {
  const [basicTestResult, setBasicTestResult] = useState<any>(null);
  const [watchlistTestResult, setWatchlistTestResult] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get session info on load
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionInfo(data);
    };
    
    getSession();
  }, []);

  const runBasicTest = async () => {
    setIsLoading(true);
    try {
      const result = await testSupabaseConnection();
      setBasicTestResult(result);
      console.log('Basic test result:', result);
    } catch (error) {
      console.error('Error running basic test:', error);
      setBasicTestResult({ success: false, error });
    } finally {
      setIsLoading(false);
    }
  };

  const runWatchlistTest = async () => {
    setIsLoading(true);
    try {
      const result = await WatchlistService.testConnection();
      setWatchlistTestResult(result);
      console.log('Watchlist test result:', result);
    } catch (error) {
      console.error('Error running watchlist test:', error);
      setWatchlistTestResult({ success: false, error });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Supabase Connection Test</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/supabase-login'} variant="outline">Test Login</Button>
          <Button onClick={() => window.location.href = '/supabase-diagnostics'} variant="default">Advanced Diagnostics</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current session information</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionInfo ? (
              <div>
                <p>Session exists: {sessionInfo.session ? 'Yes' : 'No'}</p>
                {sessionInfo.session && (
                  <>
                    <p>User ID: {sessionInfo.session.user.id}</p>
                    <p>Email: {sessionInfo.session.user.email}</p>
                    <p>Expires at: {new Date(sessionInfo.session.expires_at * 1000).toLocaleString()}</p>
                  </>
                )}
              </div>
            ) : (
              <p>Loading session info...</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={clearAuth} variant="outline">Sign Out</Button>
            <Button onClick={() => window.location.href = '/supabase-login'} variant="default">Test Login</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Basic Connection Test</CardTitle>
            <CardDescription>Tests basic Supabase connectivity</CardDescription>
          </CardHeader>
          <CardContent>
            {basicTestResult ? (
              <div>
                <p>Success: {basicTestResult.success ? 'Yes' : 'No'}</p>
                {basicTestResult.message && <p>Message: {basicTestResult.message}</p>}
                {basicTestResult.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                    <p>Error code: {basicTestResult.error.code}</p>
                    <p>Error message: {basicTestResult.error.message}</p>
                    <p>Error details: {JSON.stringify(basicTestResult.error.details || {})}</p>
                  </div>
                )}
              </div>
            ) : (
              <p>Run the test to see results</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={runBasicTest} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Run Basic Test'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Watchlist Connection Test</CardTitle>
            <CardDescription>Tests comprehensive Supabase connectivity for watchlists</CardDescription>
          </CardHeader>
          <CardContent>
            {watchlistTestResult ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 rounded bg-gray-100">
                    <p className="font-semibold">Auth</p>
                    <p className={watchlistTestResult.auth ? 'text-green-600' : 'text-red-600'}>
                      {watchlistTestResult.auth ? 'Success' : 'Failed'}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-gray-100">
                    <p className="font-semibold">Database</p>
                    <p className={watchlistTestResult.database ? 'text-green-600' : 'text-red-600'}>
                      {watchlistTestResult.database ? 'Success' : 'Failed'}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-gray-100">
                    <p className="font-semibold">Realtime</p>
                    <p className={watchlistTestResult.realtime ? 'text-green-600' : 'text-red-600'}>
                      {watchlistTestResult.realtime ? 'Success' : 'Failed'}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-gray-100">
                    <p className="font-semibold">CORS</p>
                    <p className={watchlistTestResult.cors ? 'text-green-600' : 'text-red-600'}>
                      {watchlistTestResult.cors ? 'Success' : 'Failed'}
                    </p>
                  </div>
                </div>
                
                {watchlistTestResult.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                    <p>Error: {JSON.stringify(watchlistTestResult.error)}</p>
                  </div>
                )}
              </div>
            ) : (
              <p>Run the test to see results</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={runWatchlistTest} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Run Watchlist Test'}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h2 className="text-lg font-semibold mb-2">Environment Info</h2>
        <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL.substring(0, 20)}...` : 'Not set'}</p>
        <p>Anon Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not set'}</p>
        <p>Environment: {import.meta.env.MODE}</p>
      </div>
    </div>
  );
}
