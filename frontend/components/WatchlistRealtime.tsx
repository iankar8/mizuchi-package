import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';

interface Watchlist {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
  owner_id: string;
}

interface WatchlistRealtimeProps {
  watchlistId: string;
}

const WatchlistRealtime: React.FC<WatchlistRealtimeProps> = ({ watchlistId }) => {
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('Not connected');

  // Fetch watchlist data
  useEffect(() => {
    async function fetchWatchlist() {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('watchlists')
          .select('*')
          .eq('id', watchlistId)
          .single();
        
        if (error) {
          throw error;
        }
        
        setWatchlist(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchWatchlist();
  }, [watchlistId]);
  
  // Set up real-time subscription
  useEffect(() => {
    if (!watchlistId) return;
    
    // Create a channel for this specific watchlist
    const channel = supabase
      .channel(`watchlist-${watchlistId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'watchlists',
          filter: `id=eq.${watchlistId}`
        }, 
        (payload) => {
          console.log('Received watchlist update:', payload);
          
          // Update the watchlist data with the new values
          if (payload.eventType === 'UPDATE' && payload.new) {
            setWatchlist(payload.new as Watchlist);
          } else if (payload.eventType === 'DELETE') {
            setWatchlist(null);
            setError('This watchlist has been deleted');
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setRealtimeStatus(status);
      });
    
    // Clean up the subscription when the component unmounts
    return () => {
      channel.unsubscribe();
    };
  }, [watchlistId]);
  
  if (loading) {
    return <div>Loading watchlist...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  if (!watchlist) {
    return <div>Watchlist not found</div>;
  }
  
  return (
    <div className="watchlist-container">
      <div className="realtime-status">
        Realtime Status: {realtimeStatus}
      </div>
      
      <h1>{watchlist.name}</h1>
      {watchlist.description && <p>{watchlist.description}</p>}
      
      <div className="watchlist-meta">
        <p>Created: {new Date(watchlist.created_at).toLocaleString()}</p>
        {watchlist.updated_at && (
          <p>Last Updated: {new Date(watchlist.updated_at).toLocaleString()}</p>
        )}
        <p>Visibility: {watchlist.is_public ? 'Public' : 'Private'}</p>
      </div>
      
      {/* Add your watchlist items component here */}
    </div>
  );
};

export default WatchlistRealtime;
