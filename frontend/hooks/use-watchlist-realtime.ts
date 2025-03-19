import { useEffect } from 'react';
import { WatchlistService } from '@/services/watchlist.service';
import { useToast } from '@/hooks/use-toast';

type RealtimeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  new?: any;
  old?: any;
};

export function useWatchlistRealtime(watchlistId: string | null, onUpdate: () => void) {
  const { toast } = useToast();

  useEffect(() => {
    if (!watchlistId) return;

    const unsubscribe = WatchlistService.subscribeToWatchlist(watchlistId, (payload: RealtimeEvent) => {
      // Show visual feedback based on the change type
      const messages = {
        watchlists: {
          UPDATE: 'Watchlist details updated',
          DELETE: 'Watchlist deleted'
        },
        watchlist_items: {
          INSERT: 'New stock added',
          DELETE: 'Stock removed'
        },
        watchlist_members: {
          INSERT: 'New member joined',
          DELETE: 'Member left',
          UPDATE: 'Member role updated'
        }
      };

      const table = payload.table as keyof typeof messages;
      const event = payload.eventType as keyof typeof messages[typeof table];
      const message = messages[table]?.[event];

      if (message) {
        toast({
          title: 'Watchlist Update',
          description: message,
          duration: 3000
        });
      }

      // Refresh data
      onUpdate();
    });

    return () => {
      unsubscribe();
    };
  }, [watchlistId, onUpdate, toast]);
}
