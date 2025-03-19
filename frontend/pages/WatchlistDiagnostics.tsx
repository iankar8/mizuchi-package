import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { diagnoseWatchlistTables } from '@/services/watchlist/watchlistQueries';
import watchlistService from '@/services/watchlist/watchlistService';
import { Watchlist, WatchlistItem } from '@/types/supabase';

export default function WatchlistDiagnostics() {
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    user?: any;
    error?: string;
  } | null>(null);
  const [tableStatus, setTableStatus] = useState<{
    authenticated?: boolean;
    watchlistsTable?: boolean;
    watchlistsError?: any;
    watchlist_itemsTable?: boolean;
    watchlist_itemsError?: any;
    watchlist_collaboratorsTable?: boolean;
    error?: string;
  } | null>(null);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    console.log('[WatchlistDiagnostics] Component mounted, starting checks');
    checkAuth();
    // Run checks sequentially to avoid overwhelming Supabase
    setTimeout(() => checkTables(), 500);
    setTimeout(() => fetchWatchlists(), 1000);
  }, []);

  // Load watchlist items when a watchlist is selected
  useEffect(() => {
    if (selectedWatchlist) {
      fetchWatchlistItems(selectedWatchlist);
    }
  }, [selectedWatchlist]);

  const checkAuth = async () => {
    console.log('[WatchlistDiagnostics] Checking authentication status...');
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('[WatchlistDiagnostics] Auth check result:', { data, error });
      setAuthStatus({
        authenticated: !!data.session,
        user: data.session?.user,
        error: error?.message
      });
    } catch (err: any) {
      console.error('[WatchlistDiagnostics] Auth check exception:', err);
      setAuthStatus({
        authenticated: false,
        error: err.message
      });
    }
  };

  const checkTables = async () => {
    console.log('[WatchlistDiagnostics] Checking table status...');
    try {
      const status = await diagnoseWatchlistTables();
      console.log('[WatchlistDiagnostics] Table check result:', status);
      setTableStatus(status);
    } catch (err: any) {
      console.error('[WatchlistDiagnostics] Table check exception:', err);
      setTableStatus({
        error: err.message
      });
    }
  };

  const fetchWatchlists = async () => {
    console.log('[WatchlistDiagnostics] Fetching watchlists...');
    setLoading(true);
    setError(null);
    try {
      // Try both the safe and regular methods
      console.log('[WatchlistDiagnostics] Calling getUserWatchlists()...');
      const safeWatchlists = await watchlistService.getUserWatchlists();
      console.log('[WatchlistDiagnostics] getUserWatchlists completed');
      
      console.log('[WatchlistDiagnostics] Calling getRawWatchlists()...');
      const rawWatchlists = await watchlistService.getRawWatchlists();
      console.log('[WatchlistDiagnostics] getRawWatchlists completed');
      
      setWatchlists(safeWatchlists);
      
      console.log('[WatchlistDiagnostics] Safe watchlists:', safeWatchlists);
      console.log('[WatchlistDiagnostics] Raw watchlists:', rawWatchlists);
    } catch (err: any) {
      setError(err.message);
      console.error('[WatchlistDiagnostics] Error fetching watchlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlistItems = async (watchlistId: string) => {
    setLoadingItems(true);
    try {
      const { watchlist, items } = await watchlistService.getWatchlistWithItems(watchlistId);
      console.log('[WatchlistDiagnostics] Watchlist details:', watchlist);
      console.log('[WatchlistDiagnostics] Watchlist items:', items);
      setWatchlistItems(items);
    } catch (err: any) {
      console.error('[WatchlistDiagnostics] Error fetching watchlist items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const testRLS = async () => {
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .limit(1);
      
      console.log('[WatchlistDiagnostics] RLS test result:', { data, error });
      
      alert(error 
        ? `RLS Test Failed: ${error.message}` 
        : `RLS Test Success: Found ${data?.length || 0} watchlists`);
    } catch (err: any) {
      alert(`RLS Test Exception: ${err.message}`);
    }
  };

  const createTestWatchlist = async () => {
    try {
      setCreateError(null);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setCreateError('Please sign in first');
        return;
      }
      
      const name = `Test Watchlist ${new Date().toLocaleTimeString()}`;
      const result = await watchlistService.createWatchlist({
        name,
        description: 'Created for diagnostic testing',
        is_shared: true
      });
      
      // Success - refresh the watchlist
      fetchWatchlists();
      alert(`Test watchlist created: ${name}`);
    } catch (err: any) {
      console.error('[WatchlistDiagnostics] Create test watchlist error:', err);
      setCreateError(err.message);
      alert(`Create test watchlist error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Watchlist Diagnostics</h1>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <h2>Authentication Status</h2>
          <div style={{ 
            padding: '15px', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            backgroundColor: authStatus?.authenticated ? '#e6f7e6' : '#ffe6e6' 
          }}>
            {authStatus ? (
              <div>
                <div>
                  <strong>Authenticated:</strong> {authStatus.authenticated ? 'Yes ✓' : 'No ✗'}
                </div>
                {authStatus.authenticated && (
                  <>
                    <div><strong>User ID:</strong> {authStatus.user.id}</div>
                    <div><strong>Email:</strong> {authStatus.user.email}</div>
                  </>
                )}
                {authStatus.error && (
                  <div style={{ color: 'red' }}><strong>Error:</strong> {authStatus.error}</div>
                )}
              </div>
            ) : (
              <p>Checking authentication status...</p>
            )}
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <h2>Database Status</h2>
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
            {tableStatus ? (
              <div>
                <div>
                  <strong>Authenticated:</strong> {tableStatus.authenticated ? 'Yes ✓' : 'No ✗'}
                </div>
                <div>
                  <strong>Watchlists Table:</strong> {tableStatus.watchlistsTable ? 'Accessible ✓' : 'Not accessible ✗'}
                  {tableStatus.watchlistsError && (
                    <div style={{ color: 'red', fontSize: '0.9em' }}>
                      Error: {tableStatus.watchlistsError.message || tableStatus.watchlistsError}
                    </div>
                  )}
                </div>
                <div>
                  <strong>Items Table:</strong> {tableStatus.watchlist_itemsTable ? 'Accessible ✓' : 'Not accessible ✗'}
                  {tableStatus.watchlist_itemsError && (
                    <div style={{ color: 'red', fontSize: '0.9em' }}>
                      Error: {tableStatus.watchlist_itemsError.message || tableStatus.watchlist_itemsError}
                    </div>
                  )}
                </div>
                <div>
                  <strong>Collaborators Table:</strong> {tableStatus.watchlist_collaboratorsTable ? 'Accessible ✓' : 'Not accessible ✗'}
                </div>
                {tableStatus.error && (
                  <div style={{ color: 'red' }}><strong>Error:</strong> {tableStatus.error}</div>
                )}
              </div>
            ) : (
              <p>Checking table status...</p>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Watchlists</h2>
        <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchWatchlists} 
            disabled={loading}
            style={{ padding: '8px 12px' }}
          >
            {loading ? 'Loading...' : 'Refresh Watchlists'}
          </button>
          <button 
            onClick={testRLS} 
            style={{ padding: '8px 12px' }}
          >
            Test RLS Policies
          </button>
          <button 
            onClick={createTestWatchlist} 
            style={{ padding: '8px 12px' }}
          >
            Create Test Watchlist
          </button>
        </div>
        
        {error && (
          <div style={{ color: 'red', marginBottom: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>
            Error: {error}
          </div>
        )}
        
        <div style={{ 
          padding: '15px', 
          border: '1px solid #ccc', 
          borderRadius: '4px', 
          maxHeight: '300px', 
          overflowY: 'auto' 
        }}>
          {loading ? (
            <p>Loading watchlists...</p>
          ) : watchlists.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Owner</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlists.map(watchlist => (
                  <tr key={watchlist.id} style={{ cursor: 'pointer' }}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{watchlist.name}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                      {new Date(watchlist.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{watchlist.owner_id}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                      <button 
                        onClick={() => setSelectedWatchlist(watchlist.id)}
                        style={{ padding: '4px 8px' }}
                      >
                        View Items
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No watchlists found.</p>
          )}
        </div>
      </div>
      
      {selectedWatchlist && (
        <div>
          <h2>Watchlist Items</h2>
          <div style={{ 
            padding: '15px', 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            maxHeight: '300px', 
            overflowY: 'auto' 
          }}>
            {loadingItems ? (
              <p>Loading items...</p>
            ) : watchlistItems.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Symbol</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlistItems.map(item => (
                    <tr key={item.id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{item.symbol || 'Unnamed'}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{item.symbol}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No items found in this watchlist.</p>
            )}
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <h2>Troubleshooting Tips</h2>
        <ul style={{ lineHeight: '1.5' }}>
          <li><strong>RLS Policies:</strong> Ensure your Row Level Security policies for watchlists tables allow the current user to access their watchlists.</li>
          <li><strong>Table Schema:</strong> Verify that the watchlists, watchlist_items, and watchlist_collaborators tables exist with the correct structure.</li>
          <li><strong>Authentication:</strong> Make sure your user is authenticated before attempting to access watchlists.</li>
          <li><strong>Permissions:</strong> Check if the authenticated user has the correct permissions in the database.</li>
        </ul>
      </div>
    </div>
  );
}
