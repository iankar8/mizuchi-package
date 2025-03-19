import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, TrendingUp, RefreshCw, PenLine, UserPlus, Trash2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import researchSynthesisService from '@/services/ai/researchSynthesisService';
import { supabase } from '@/utils/supabase/client';

type ActivityType = 
  | 'add_stock' 
  | 'remove_stock' 
  | 'add_note' 
  | 'add_collaborator' 
  | 'research_update'
  | 'price_alert';

interface WatchlistActivity {
  id: string;
  watchlist_id: string;
  user_id: string;
  activity_type: ActivityType;
  activity_data: any;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface WatchlistActivityFeedProps {
  watchlistId: string;
}

export function WatchlistActivityFeed({ watchlistId }: WatchlistActivityFeedProps) {
  const [activities, setActivities] = useState<WatchlistActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchActivities = async () => {
      if (!watchlistId) return;
      
      setLoading(true);
      
      try {
        // For development mode, use mock data instead of real API calls
        // In production, the following code would be used:
        // const { data, error } = await supabase
        //   .from('watchlist_activity')
        //   .select('*, profiles:user_id(email, name)')
        //   .eq('watchlist_id', watchlistId)
        //   .order('created_at', { ascending: false })
        //   .limit(10);
        //   
        // if (error) throw error;
        // 
        // const processedActivities = data.map(activity => ({
        //   ...activity,
        //   user_email: activity.profiles?.email,
        //   user_name: activity.profiles?.name,
        // }));
        
        // Mock data for development
        const mockActivities: WatchlistActivity[] = [
          {
            id: "act-1",
            watchlist_id: watchlistId,
            user_id: "user1",
            activity_type: "add_stock",
            activity_data: { symbol: "AAPL", price: 189.98 },
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            user_email: "user@example.com",
            user_name: "John Doe"
          },
          {
            id: "act-2",
            watchlist_id: watchlistId,
            user_id: "user1",
            activity_type: "research_update",
            activity_data: { symbol: "MSFT", research: "New cloud strategy announced" },
            created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
            user_email: "user@example.com",
            user_name: "John Doe"
          },
          {
            id: "act-3",
            watchlist_id: watchlistId,
            user_id: "user2",
            activity_type: "add_collaborator",
            activity_data: { email: "collaborator@example.com" },
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
            user_email: "admin@example.com",
            user_name: "Admin User"
          }
        ];
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const processedActivities = mockActivities;
        
        setActivities(processedActivities);
        
        // Generate AI insights for relevant activities
        const stockSymbols = processedActivities
          .filter(a => a.activity_type === 'add_stock' || a.activity_type === 'research_update')
          .map(a => a.activity_data?.symbol)
          .filter(Boolean);
          
        const uniqueSymbols = [...new Set(stockSymbols)];
        
        // Get AI insights for these symbols
        for (const symbol of uniqueSymbols) {
          try {
            const research = await researchSynthesisService.getSymbolResearch({
              symbol,
              includeFinancials: false,
              includeNews: true,
              includeSentiment: true
            });
            
            if (research) {
              setAiInsights(prev => ({
                ...prev,
                [symbol]: research.summary
              }));
            }
          } catch (err) {
            console.error(`Error getting insights for ${symbol}:`, err);
          }
        }
      } catch (err) {
        console.error("Error fetching watchlist activities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
    
    // Set up a real-time subscription for new activities
    const subscription = supabase
      .channel(`watchlist_activity:${watchlistId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'watchlist_activity',
        filter: `watchlist_id=eq.${watchlistId}`
      }, (payload) => {
        const newActivity = payload.new as WatchlistActivity;
        setActivities(prev => [newActivity, ...prev].slice(0, 10));
        
        // Generate insights for new stock additions
        if (
          (newActivity.activity_type === 'add_stock' || newActivity.activity_type === 'research_update') && 
          newActivity.activity_data?.symbol
        ) {
          const symbol = newActivity.activity_data.symbol;
          researchSynthesisService.getSymbolResearch({
            symbol,
            includeFinancials: false,
            includeNews: true,
            includeSentiment: true
          })
            .then(research => {
              if (research) {
                setAiInsights(prev => ({
                  ...prev,
                  [symbol]: research.summary
                }));
              }
            })
            .catch(err => {
              console.error(`Error getting insights for ${symbol}:`, err);
            });
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [watchlistId]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'add_stock':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'remove_stock':
        return <Trash2 className="h-5 w-5 text-red-500" />;
      case 'add_note':
        return <PenLine className="h-5 w-5 text-blue-500" />;
      case 'add_collaborator':
        return <UserPlus className="h-5 w-5 text-purple-500" />;
      case 'research_update':
        return <RefreshCw className="h-5 w-5 text-amber-500" />;
      case 'price_alert':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <ChevronRight className="h-5 w-5" />;
    }
  };

  const getActivityTitle = (activity: WatchlistActivity) => {
    const userName = activity.user_name || activity.user_email?.split('@')[0] || 'A user';
    
    switch (activity.activity_type) {
      case 'add_stock':
        return `${userName} added ${activity.activity_data?.symbol || 'a stock'}`;
      case 'remove_stock':
        return `${userName} removed ${activity.activity_data?.symbol || 'a stock'}`;
      case 'add_note':
        return `${userName} added a note to ${activity.activity_data?.symbol || 'a stock'}`;
      case 'add_collaborator':
        return `${userName} added ${activity.activity_data?.collaborator_email || 'a collaborator'}`;
      case 'research_update':
        return `Research update for ${activity.activity_data?.symbol || 'a stock'}`;
      case 'price_alert':
        return `Price alert for ${activity.activity_data?.symbol || 'a stock'}`;
      default:
        return 'Activity occurred';
    }
  };

  const getActivityDescription = (activity: WatchlistActivity) => {
    switch (activity.activity_type) {
      case 'add_stock':
        return activity.activity_data?.companyName || '';
      case 'remove_stock':
        return `Removed from watchlist`;
      case 'add_note':
        return activity.activity_data?.note?.substring(0, 80) + (activity.activity_data?.note?.length > 80 ? '...' : '');
      case 'add_collaborator':
        return `Permission level: ${activity.activity_data?.permission_level || 'viewer'}`;
      case 'research_update':
        return activity.activity_data?.update_type || 'New research available';
      case 'price_alert':
        return `${activity.activity_data?.alert_type}: $${activity.activity_data?.price}`;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>Recent activity in this watchlist</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
        <CardDescription>Recent activity in this watchlist</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          activities.map(activity => (
            <div 
              key={activity.id} 
              className="flex items-start space-x-4 pb-4 border-b last:border-0 last:pb-0"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={`https://avatar.vercel.sh/${activity.user_id}?size=40`} 
                  alt={activity.user_name || 'User'} 
                />
                <AvatarFallback>
                  {activity.user_name?.charAt(0) || activity.user_email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center">
                    {getActivityIcon(activity.activity_type)}
                    <span className="ml-2">{getActivityTitle(activity)}</span>
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {getActivityDescription(activity)}
                </p>
                
                {/* AI Insights for stock additions */}
                {(activity.activity_type === 'add_stock' || activity.activity_type === 'research_update') && 
                  activity.activity_data?.symbol && aiInsights[activity.activity_data.symbol] && (
                  <div className="mt-2 rounded-md bg-muted p-3">
                    <div className="flex items-center mb-1">
                      <Badge variant="outline" className="mr-2">AI Insight</Badge>
                      <span className="text-xs font-medium">{activity.activity_data.symbol}</span>
                    </div>
                    <p className="text-xs">{aiInsights[activity.activity_data.symbol]}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
