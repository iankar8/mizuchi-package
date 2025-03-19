import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';

interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  ticker?: string;
  company_name?: string;
  notes?: string;
  created_at: string;
  added_by: string;
}

interface WatchlistItemsRealtimeProps {
  watchlistId: string;
}

const WatchlistItemsRealtime: React.FC<WatchlistItemsRealtimeProps> = ({ watchlistId }) => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch watchlist items
  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('watchlist_items')
          .select('*')
          .eq('watchlist_id', watchlistId)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setItems(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchItems();
  }, [watchlistId]);
  
  // Set up real-time subscription for watchlist items
  useEffect(() => {
    if (!watchlistId) return;
    
    const channel = supabase
      .channel(`watchlist-items-${watchlistId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'watchlist_items',
          filter: `watchlist_id=eq.${watchlistId}`
        }, 
        (payload) => {
          console.log('Received watchlist item update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            // Add the new item to the list
            setItems(current => [payload.new as WatchlistItem, ...current]);
          } 
          else if (payload.eventType === 'UPDATE' && payload.new) {
            // Update the existing item
            setItems(current => 
              current.map(item => 
                item.id === payload.new.id ? (payload.new as WatchlistItem) : item
              )
            );
          } 
          else if (payload.eventType === 'DELETE' && payload.old) {
            // Remove the deleted item
            setItems(current => 
              current.filter(item => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();
    
    // Clean up the subscription when the component unmounts
    return () => {
      channel.unsubscribe();
    };
  }, [watchlistId]);
  
  if (loading) {
    return <div>Loading watchlist items...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  if (items.length === 0) {
    return <div>No items in this watchlist</div>;
  }
  
  return (
    <div className="watchlist-items">
      <h2>Watchlist Items</h2>
      <ul className="items-list">
        {items.map(item => (
          <li key={item.id} className="watchlist-item">
            <div className="item-symbol">{item.ticker || item.symbol}</div>
            {item.company_name && <div className="item-company">{item.company_name}</div>}
            {item.notes && <div className="item-notes">{item.notes}</div>}
            <div className="item-meta">
              Added: {new Date(item.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WatchlistItemsRealtime;
