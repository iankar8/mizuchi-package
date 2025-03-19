import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { WatchlistService, Watchlist } from "@/services/watchlist.service";
import { getMockWatchlists, WatchlistWithItems } from "@/mocks/watchlist-data";
import watchlistService from "@/services/watchlist";

// Define type for watchlists with user roles
type WatchlistWithRole = WatchlistWithItems;

export function useWatchlists() {
  const [watchlists, setWatchlists] = useState<WatchlistWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only attempt to fetch if user is authenticated
    // Check for both null and undefined to handle loading state
    if (user === null || user === undefined) {
      navigate("/auth/signin");
      return;
    }
    
    console.log('User authenticated, fetching watchlists for:', user.id);
    fetchWatchlists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Subscribe to real-time changes for all watchlists
  useEffect(() => {
    if (!user) return;
    
    console.log('Setting up real-time watchlist subscription');
    const unsubscribe = watchlistService.subscribeToAllWatchlists(async (payload) => {
      console.log('Watchlist real-time update:', payload);
      // Refresh the watchlists when changes occur
      await fetchWatchlists();
    });
    
    return () => {
      console.log('Cleaning up real-time watchlist subscription');
      unsubscribe();
    };
  }, [user]);

  const fetchWatchlists = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching watchlists for userId:', user?.id);
      
      // Ensure we have a valid authenticated user
      if (!user || !user.id) {
        console.error('Cannot fetch watchlists: No authenticated user ID');
        toast({
          title: "Authentication Error",
          description: "Please sign in again to view your watchlists.",
          variant: "destructive",
        });
        setWatchlists([]);
        setIsLoading(false);
        return;
      }
      
      // Create a flag to track if we're using mock data
      let useMockData = false;
      let supabaseData = [];
      
      try {
        console.log('Verifying session before watchlist fetch...');
        // Verify session is valid before attempting to fetch
        const { supabase } = await import('@/utils/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        
        // Always try to refresh the session first to avoid permission issues
        try {
          const { data: refreshResult, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.warn('Failed to refresh session:', refreshError);
          } else {
            console.log('Session refreshed successfully');
          }
        } catch (refreshError) {
          console.warn('Error during session refresh:', refreshError);
        }
        
        if (!session) {
          console.error('Session not found before watchlist fetch');
          throw new Error('No active session');
        }
        
        console.log('Session verified, fetching watchlists...');
        
        // Try to use real data from Supabase using the new service
        let watchlistsData;
        
        // First try with proper error handling
        try {
          watchlistsData = await watchlistService.getUserWatchlists();
          console.log('Initial watchlist fetch result:', watchlistsData);
        } catch (fetchError) {
          console.warn('First watchlist fetch attempt failed:', fetchError);
          
          // Try again with direct query as fallback
          try {
            const { data: directData, error: directError } = await supabase
              .from('watchlists')
              .select('*')
              .eq('owner_id', user.id);
              
            if (directError) {
              throw directError;
            }
            
            if (directData && directData.length > 0) {
              console.log('Direct query succeeded, found watchlists:', directData.length);
              watchlistsData = directData.map(w => ({
                ...w,
                userRole: 'owner', // Assume ownership for direct queries
                is_shared: w.is_public || false
              }));
            }
          } catch (directError) {
            console.error('Direct watchlist query failed:', directError);
          }
        }
        
        if (!watchlistsData || watchlistsData.length === 0) {
          console.log('No watchlists found in Supabase');
          useMockData = true;
        } else {
          console.log('Watchlist data from Supabase:', watchlistsData);
          supabaseData = watchlistsData;
        }
      } catch (supabaseError) {
        console.error('Supabase error, falling back to mock data:', supabaseError);
        toast({
          title: "Data Fetch Error",
          description: "Using demo data due to connection issues.",
          variant: "warning",
        });
        useMockData = true;
      }
      
      if (useMockData) {
        // Use mock data when Supabase fails or returns no data
        console.log('Using mock watchlist data');
        const mockData = getMockWatchlists(user?.id);
        console.log('Mock watchlist data:', mockData);
        setWatchlists(mockData);
      } else {
        // Process real data from Supabase
        try {
          // Fetch items for each watchlist and construct the complete watchlist objects
          const watchlistsWithItemsAndRoles = await Promise.all(
            supabaseData.map(async (watchlist) => {
              // Set default role as owner to bypass potential errors
              let role: "viewer" | "editor" | "admin" | "owner" = watchlist.userRole || "owner";
              
              let items = [];
              try {
                // Try to fetch items for this watchlist
                const { items: itemsData } = await watchlistService.getWatchlistWithItems(watchlist.id);
                items = itemsData || [];
              } catch (itemsError) {
                console.warn(`Exception fetching items for watchlist ${watchlist.id}:`, itemsError);
              }
              
              return { 
                ...watchlist, 
                userRole: role, 
                items: items 
              };
            })
          );
          
          console.log('Complete watchlists with items and roles:', watchlistsWithItemsAndRoles);
          
          if (watchlistsWithItemsAndRoles.length > 0) {
            setWatchlists(watchlistsWithItemsAndRoles);
          } else {
            // Fallback to mock data if something went wrong
            console.log('No complete watchlists found, using mock data as fallback');
            const mockData = getMockWatchlists(user?.id);
            console.log('Fallback mock data:', mockData);
            setWatchlists(mockData);
          }
        } catch (processingError) {
          console.error('Error processing watchlists, using mock data:', processingError);
          const mockData = getMockWatchlists(user?.id);
          setWatchlists(mockData);
        }
      }
    } catch (error) {
      console.error("Error fetching watchlists:", error);
      
      // Use more detailed error messages
      let errorMessage = "Failed to load watchlists. Please try again.";
      
      if (error instanceof Error) {
        // Extract more specific error information if available
        if (error.message.includes('PGRST301')) {
          errorMessage = "Permission denied. Please sign out and sign in again.";
        } else if (error.message.includes('timed out')) {
          errorMessage = "Connection timed out. Please check your network.";
        } else if (error.message.includes('session')) {
          errorMessage = "Session expired. Please sign in again.";
        } else if (error.message) {
          // Include specific error message but keep it concise
          errorMessage = `Error: ${error.message.substring(0, 100)}`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Try to load mock data as a fallback
      try {
        const mockData = getMockWatchlists(user?.id);
        console.log('Using mock data as error fallback');
        setWatchlists(mockData);
      } catch (mockError) {
        // Ensure watchlists is always an array even on error
        console.error("Error setting mock data:", mockError);
        setWatchlists([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createWatchlist = async (name: string, description: string, isShared: boolean = false) => {
    if (!name) {
      toast({
        title: "Error",
        description: "Please enter a name for the watchlist.",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      console.log(`Creating watchlist: ${name}, description: ${description}, isShared: ${isShared}`);
      
      // Try to use the new service, but fall back to mock data if it fails
      let newWatchlist: WatchlistWithRole;
      
      try {
        // Attempt to create watchlist with the new service
        const watchlist = await watchlistService.createWatchlist({
          name,
          description,
          is_shared: isShared
        });
        
        // Use the real watchlist returned
        newWatchlist = {
          ...watchlist,
          userRole: 'owner' as const,
          items: []
        };
        
        console.log('Successfully created watchlist:', newWatchlist);
      } catch (supabaseError) {
        console.error('Failed to create watchlist, creating mock watchlist instead:', supabaseError);
        
        // Create a mock watchlist with a unique ID
        newWatchlist = {
          id: `mock-${Date.now()}`,
          name,
          description: description || "",
          owner_id: user?.id || 'demo-user',
          is_shared: isShared,
          member_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          items: [],
          userRole: 'owner' as const
        };
      }
      
      // Add to existing watchlists
      setWatchlists(prev => [newWatchlist, ...prev]);
      
      toast({
        title: "Success",
        description: `${isShared ? 'Shared' : 'Personal'} watchlist created successfully.`,
      });
      
      return newWatchlist;
    } catch (error) {
      console.error("Error creating watchlist:", error);
      toast({
        title: "Error",
        description: "Failed to create watchlist. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteWatchlist = async (watchlistId: string) => {
    try {
      console.log(`Deleting watchlist with ID: ${watchlistId}`);
      
      // Check if it's a mock watchlist (ID starts with 'mock-')
      const isMockWatchlist = watchlistId.startsWith('mock-');
      
      if (!isMockWatchlist) {
        // Only try Supabase deletion for real watchlists
        try {
          // Attempt to delete with the new service
          const success = await watchlistService.deleteWatchlist(watchlistId);
          if (!success) {
            console.warn('Error deleting watchlist');
            throw new Error('Failed to delete watchlist');
          }
          console.log('Successfully deleted watchlist');
        } catch (supabaseError) {
          console.error('Failed to delete watchlist:', supabaseError);
          // Continue with UI update even if Supabase fails
        }
      } else {
        console.log('Deleting mock watchlist, skipping database call');
      }
      
      // Always update the UI by removing from local state
      setWatchlists(prev => prev.filter(watchlist => watchlist.id !== watchlistId));
      
      toast({
        title: "Success",
        description: "Watchlist deleted successfully.",
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting watchlist:", error);
      toast({
        title: "Error",
        description: "Failed to delete watchlist. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    watchlists,
    isLoading,
    fetchWatchlists,
    createWatchlist,
    deleteWatchlist
  };
}