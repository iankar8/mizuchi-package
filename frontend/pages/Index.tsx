
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import PageLayout from "@/components/layout/PageLayout";
import MarketIndices from "@/components/dashboard/MarketIndices";
import NewsCard from "@/components/dashboard/NewsCard";
import { useWatchlists } from "@/hooks/use-watchlists";

// Watchlist-focused components
import WatchlistPerformanceChart from "@/components/dashboard/WatchlistPerformanceChart";
import WatchlistMovers from "@/components/dashboard/WatchlistMovers";
import WatchlistAISnapshot from "@/components/dashboard/WatchlistAISnapshot";
import RecentSearches from "@/components/dashboard/RecentSearches";
import WatchlistCard from "@/components/dashboard/WatchlistCard";

export default function Index() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { watchlists, isLoading: isLoadingWatchlists } = useWatchlists();
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  
  // Set the first watchlist as selected once data is loaded
  useEffect(() => {
    if (watchlists?.length > 0 && !selectedWatchlist) {
      setSelectedWatchlist(watchlists[0].id);
    }
  }, [watchlists, selectedWatchlist]);
  
  useEffect(() => {
    // Add debug logging to check authentication status
    console.log("Auth state:", { isAuthenticated });
    
    if (isAuthenticated === false) {
      // If user is explicitly not authenticated, redirect to sign in
      navigate("/auth/signin");
    }
    // Don't redirect if isAuthenticated is undefined (still loading)
  }, [isAuthenticated, navigate]);

  // Add guard to ensure we're authenticated before rendering dashboard content
  if (isAuthenticated === false) {
    return null; // Don't render anything if we're redirecting
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 pt-20 pb-10">
        <div className="grid gap-6">
          {/* First Row - Watchlist Performance Chart (main focus) */}
          <WatchlistPerformanceChart />
          
          {/* Second Row - Real Watchlists */}
          <WatchlistCard 
            watchlists={Array.isArray(watchlists) ? watchlists : []}
            isLoading={isLoadingWatchlists}
          />
          
          {/* Third Row - Watchlist Movers and AI Snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WatchlistMovers 
              selectedWatchlist={selectedWatchlist}
              watchlists={Array.isArray(watchlists) ? watchlists : []}
              isLoading={isLoadingWatchlists}
            />
            <WatchlistAISnapshot 
              selectedWatchlist={selectedWatchlist}
              watchlists={Array.isArray(watchlists) ? watchlists : []}
            />
          </div>
          
          {/* Fourth Row - Recent Searches and News */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentSearches />
            <NewsCard />
          </div>
          
          {/* Fifth Row - Market Indices */}
          <MarketIndices />
        </div>
      </div>
    </PageLayout>
  );
}
