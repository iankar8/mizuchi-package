import { useState, useEffect, useRef } from 'react';
import { WatchlistService } from '@/services/watchlist.service';
import { supabase } from '@/utils/supabase/client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoCircledIcon, CheckCircledIcon, CrossCircledIcon, ReloadIcon } from '@radix-ui/react-icons';

const RealtimeTestPage = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'testing' | 'completed' | 'error'>('idle');
  const [testResults, setTestResults] = useState<{
    watchlistEvents: number;
    itemEvents: number;
    success: boolean;
  }>({
    watchlistEvents: 0,
    itemEvents: 0,
    success: false
  });
  
  const watchlistUnsubscribe = useRef<(() => void) | null>(null);
  const itemsUnsubscribe = useRef<(() => void) | null>(null);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  const runTest = async () => {
    try {
      clearLogs();
      setStatus('testing');
      setTestResults({
        watchlistEvents: 0,
        itemEvents: 0,
        success: false
      });
      
      // Cleanup any existing subscriptions
      if (watchlistUnsubscribe.current) {
        watchlistUnsubscribe.current();
        watchlistUnsubscribe.current = null;
      }
      if (itemsUnsubscribe.current) {
        itemsUnsubscribe.current();
        itemsUnsubscribe.current = null;
      }
      
      // Step 1: Create a test watchlist
      addLog('Creating test watchlist...');
      const watchlistName = `Test Watchlist ${new Date().toISOString()}`;
      const { watchlist, error } = await WatchlistService.createWatchlist(watchlistName, true, []);
      
      if (error || !watchlist) {
        throw new Error(`Failed to create watchlist: ${error?.message || 'Unknown error'}`);
      }
      
      const newWatchlistId = watchlist.id;
      setWatchlistId(newWatchlistId);
      addLog(`Created watchlist with ID: ${newWatchlistId}`);
      
      // Step 2: Set up real-time subscriptions
      addLog('Setting up real-time subscriptions...');
      
      // Track events received
      let watchlistEventCount = 0;
      let itemEventCount = 0;
      
      // Subscribe to watchlist changes
      watchlistUnsubscribe.current = WatchlistService.subscribeToWatchlist(newWatchlistId, (payload) => {
        watchlistEventCount++;
        setTestResults(prev => ({...prev, watchlistEvents: watchlistEventCount}));
        addLog(`Received watchlist event: ${payload.eventType} [${watchlistEventCount}]`);
        console.log('Watchlist event payload:', payload);
      });
      
      // Subscribe to watchlist item changes
      itemsUnsubscribe.current = WatchlistService.subscribeToWatchlistItems(newWatchlistId, (payload) => {
        itemEventCount++;
        setTestResults(prev => ({...prev, itemEvents: itemEventCount}));
        addLog(`Received watchlist item event: ${payload.eventType} [${itemEventCount}]`);
        console.log('Watchlist item event payload:', payload);
      });
      
      addLog('Subscriptions set up. Starting test sequence...');
      
      // Step 3: Make changes to trigger events
      // Wait a moment for subscriptions to be established
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add an item to the watchlist
      addLog('Adding item (AAPL) to watchlist...');
      const { data: items, error: itemError } = await WatchlistService.addItems(newWatchlistId, ['AAPL'], 'Test notes');
      
      if (itemError || !items || !items.length) {
        throw new Error(`Failed to add item: ${itemError?.message || 'Unknown error'}`);
      }
      
      addLog('Added AAPL to watchlist');
      
      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the watchlist
      addLog('Updating watchlist name...');
      const { data: updateResult, error: updateError } = await WatchlistService.updateWatchlist(
        newWatchlistId,
        { name: `${watchlistName} (Updated)` }
      );
      
      if (updateError || updateResult === false) {
        throw new Error(`Failed to update watchlist: ${updateError?.message || 'Unknown error'}`);
      }
      
      addLog('Updated watchlist name');
      
      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add a second item
      addLog('Adding second item (MSFT) to watchlist...');
      const { data: items2, error: item2Error } = await WatchlistService.addItems(newWatchlistId, ['MSFT'], 'Test notes 2');
      
      if (item2Error || !items2 || !items2.length) {
        throw new Error(`Failed to add second item: ${item2Error?.message || 'Unknown error'}`);
      }
      
      addLog('Added MSFT to watchlist');
      
      // Final wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check results
      const success = watchlistEventCount > 0 && itemEventCount > 0;
      
      setTestResults({
        watchlistEvents: watchlistEventCount,
        itemEvents: itemEventCount,
        success
      });
      
      if (success) {
        addLog('Test completed successfully! ✅');
        setStatus('completed');
      } else {
        addLog(`Test completed with issues: watchlist events=${watchlistEventCount}, item events=${itemEventCount}`);
        setStatus('error');
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      setStatus('error');
    }
  };
  
  const cleanup = async () => {
    try {
      // Cleanup subscriptions
      if (watchlistUnsubscribe.current) {
        watchlistUnsubscribe.current();
        watchlistUnsubscribe.current = null;
        addLog('Watchlist subscription cleaned up');
      }
      
      if (itemsUnsubscribe.current) {
        itemsUnsubscribe.current();
        itemsUnsubscribe.current = null;
        addLog('Watchlist items subscription cleaned up');
      }
      
      // Delete the test watchlist if it exists
      if (watchlistId) {
        addLog(`Deleting test watchlist ${watchlistId}...`);
        await WatchlistService.deleteWatchlist(watchlistId);
        addLog('Deleted test watchlist');
        setWatchlistId(null);
      }
      
      setStatus('idle');
    } catch (error) {
      console.error('Cleanup failed:', error);
      addLog(`Cleanup ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup subscriptions when component unmounts
      if (watchlistUnsubscribe.current) watchlistUnsubscribe.current();
      if (itemsUnsubscribe.current) itemsUnsubscribe.current();
    };
  }, []);

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Real-time Watchlist Test</CardTitle>
          <CardDescription>
            Test the Supabase real-time functionality for watchlists and watchlist items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={runTest} 
                disabled={status === 'testing'}
                className="w-32"
              >
                {status === 'testing' ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : 'Run Test'}
              </Button>
              
              <Button 
                onClick={cleanup} 
                variant="outline" 
                className="w-32"
              >
                Cleanup
              </Button>
              
              <div className="ml-6 flex items-center">
                <span className="text-sm font-medium mr-2">Status:</span>
                {status === 'idle' && (
                  <span className="text-sm text-muted-foreground">Ready</span>
                )}
                {status === 'testing' && (
                  <span className="text-sm text-blue-500 flex items-center">
                    <ReloadIcon className="mr-1 h-4 w-4 animate-spin" />
                    Testing...
                  </span>
                )}
                {status === 'completed' && (
                  <span className="text-sm text-green-500 flex items-center">
                    <CheckCircledIcon className="mr-1 h-4 w-4" />
                    Completed
                  </span>
                )}
                {status === 'error' && (
                  <span className="text-sm text-red-500 flex items-center">
                    <CrossCircledIcon className="mr-1 h-4 w-4" />
                    Error
                  </span>
                )}
              </div>
            </div>
            
            {(status === 'completed' || status === 'error') && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Watchlist Events:</span>
                    <span className={`text-sm ${testResults.watchlistEvents > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {testResults.watchlistEvents}
                    </span>
                  </div>
                </Card>
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item Events:</span>
                    <span className={`text-sm ${testResults.itemEvents > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {testResults.itemEvents}
                    </span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
        {watchlistId && (
          <CardFooter className="text-sm text-muted-foreground">
            <div className="flex items-center">
              <InfoCircledIcon className="h-4 w-4 mr-2" />
              <span>Test Watchlist ID: {watchlistId}</span>
            </div>
          </CardFooter>
        )}
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Logs</CardTitle>
          <CardDescription>
            Real-time events and test execution logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="p-4">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No logs yet. Run the test to see logs.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-sm mb-1 font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Clear Logs
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RealtimeTestPage;
