import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/utils/supabase/client';
import { ReloadIcon, CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { WatchlistService } from '@/services/watchlist.service';

export default function WatchlistRealtimeTest() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [testWatchlistId, setTestWatchlistId] = useState<string | null>(null);
  const [testItemId, setTestItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [eventCounts, setEventCounts] = useState({
    watchlist: 0,
    items: 0
  });
  
  const watchlistUnsubRef = useRef<(() => void) | null>(null);
  const itemsUnsubRef = useRef<(() => void) | null>(null);
  
  // Check login status on mount
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      if (user) {
        setUserId(user.id);
        addLog(`Authenticated as user ID: ${user.id}`);
      }
    }
    
    checkAuth();
  }, []);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  const runTest = async () => {
    try {
      if (!isLoggedIn) {
        addLog('ERROR: You must be logged in to run the test');
        return;
      }
      
      clearLogs();
      setStatus('testing');
      setEventCounts({ watchlist: 0, items: 0 });
      
      // Clean up any existing subscriptions
      cleanup();
      
      // Step 1: Create a test watchlist
      addLog('Creating test watchlist...');
      const watchlistName = `Test Watchlist ${new Date().toISOString()}`;
      const { watchlist, error } = await WatchlistService.createWatchlist(
        watchlistName,
        true, // is_shared
        []    // no initial symbols
      );
      
      if (error || !watchlist) {
        throw new Error(`Failed to create watchlist: ${error?.message || 'Unknown error'}`);
      }
      
      const newWatchlistId = watchlist.id;
      setTestWatchlistId(newWatchlistId);
      addLog(`Created watchlist with ID: ${newWatchlistId}`);
      
      // Step 2: Set up real-time subscriptions
      addLog('Setting up real-time subscriptions...');
      
      // Subscribe to watchlist changes
      watchlistUnsubRef.current = WatchlistService.subscribeToWatchlist(newWatchlistId, (payload) => {
        addLog(`Received watchlist event: ${payload.eventType}`);
        console.log('Watchlist event:', payload);
        setEventCounts(prev => ({ ...prev, watchlist: prev.watchlist + 1 }));
      });
      
      // Subscribe to watchlist items changes
      itemsUnsubRef.current = WatchlistService.subscribeToWatchlistItems(newWatchlistId, (payload) => {
        addLog(`Received watchlist item event: ${payload.eventType}`);
        console.log('Watchlist item event:', payload);
        setEventCounts(prev => ({ ...prev, items: prev.items + 1 }));
      });
      
      addLog('Subscriptions set up successfully');
      
      // Wait for subscriptions to be established
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Add an item to the watchlist
      addLog('Adding item to watchlist...');
      const { data: items, error: addError } = await WatchlistService.addItems(
        newWatchlistId,
        ['AAPL'],
        'Test notes'
      );
      
      if (addError || !items || items.length === 0) {
        throw new Error(`Failed to add item: ${addError?.message || 'Unknown error'}`);
      }
      
      setTestItemId(items[0].id);
      addLog(`Added item with ID: ${items[0].id}`);
      
      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 4: Update the watchlist
      addLog('Updating watchlist name...');
      const { data: updateResult, error: updateError } = await WatchlistService.updateWatchlist(
        newWatchlistId,
        { name: `${watchlistName} (Updated)` }
      );
      
      if (updateError || updateResult === false) {
        throw new Error(`Failed to update watchlist: ${updateError?.message || 'Unknown error'}`);
      }
      
      addLog('Updated watchlist name successfully');
      
      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check results
      if (eventCounts.watchlist > 0 || eventCounts.items > 0) {
        addLog('Test completed successfully! Real-time events were received.');
        setStatus('success');
      } else {
        addLog('WARNING: No real-time events were received. The subscriptions may not be working correctly.');
        setStatus('error');
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      setStatus('error');
    }
  };
  
  const cleanup = () => {
    // Clean up subscriptions
    if (watchlistUnsubRef.current) {
      watchlistUnsubRef.current();
      watchlistUnsubRef.current = null;
      addLog('Watchlist subscription cleaned up');
    }
    
    if (itemsUnsubRef.current) {
      itemsUnsubRef.current();
      itemsUnsubRef.current = null;
      addLog('Watchlist items subscription cleaned up');
    }
  };
  
  const deleteTestWatchlist = async () => {
    if (!testWatchlistId) {
      addLog('No test watchlist to delete');
      return;
    }
    
    try {
      addLog(`Deleting test watchlist ${testWatchlistId}...`);
      await WatchlistService.deleteWatchlist(testWatchlistId);
      addLog('Deleted test watchlist successfully');
      setTestWatchlistId(null);
      setTestItemId(null);
    } catch (error) {
      console.error('Failed to delete watchlist:', error);
      addLog(`ERROR deleting watchlist: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);
  
  return (
    <div className="container py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Watchlist Real-time Test</CardTitle>
          <CardDescription>
            Test the real-time functionality of watchlist subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isLoggedIn ? (
              <div className="p-4 bg-yellow-100 text-yellow-800 rounded-md">
                You must be logged in to run the test. Please sign in first.
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-4">
                  <Button 
                    onClick={runTest} 
                    disabled={status === 'testing'}
                  >
                    {status === 'testing' ? (
                      <>
                        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        Running Test...
                      </>
                    ) : 'Run Test'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={cleanup}
                  >
                    Cleanup Subscriptions
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    onClick={deleteTestWatchlist}
                    disabled={!testWatchlistId}
                  >
                    Delete Test Watchlist
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Status:</span>
                  {status === 'idle' && <span className="text-gray-500">Ready</span>}
                  {status === 'testing' && (
                    <span className="text-blue-500 flex items-center">
                      <ReloadIcon className="mr-1 h-4 w-4 animate-spin" />
                      Testing...
                    </span>
                  )}
                  {status === 'success' && (
                    <span className="text-green-500 flex items-center">
                      <CheckCircledIcon className="mr-1 h-4 w-4" />
                      Success
                    </span>
                  )}
                  {status === 'error' && (
                    <span className="text-red-500 flex items-center">
                      <CrossCircledIcon className="mr-1 h-4 w-4" />
                      Error
                    </span>
                  )}
                </div>
                
                {testWatchlistId && (
                  <div className="text-sm">
                    <p>Test Watchlist ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{testWatchlistId}</code></p>
                    {testItemId && (
                      <p>Test Item ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{testItemId}</code></p>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Watchlist Events:</span>
                      <span className={`text-sm font-mono ${eventCounts.watchlist > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                        {eventCounts.watchlist}
                      </span>
                    </div>
                  </Card>
                  <Card className="p-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Item Events:</span>
                      <span className={`text-sm font-mono ${eventCounts.items > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                        {eventCounts.items}
                      </span>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Test Logs</CardTitle>
            <CardDescription>Real-time events and test execution logs</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Clear Logs
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="p-4 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No logs yet. Run the test to see logs.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
