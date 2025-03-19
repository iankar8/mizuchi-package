
import { useState, useEffect } from "react";
import watchlistService from "@/services/watchlist";

export function useWatchlistCollaboratorsCount(watchlistId: string | null) {
  const [collaboratorsCount, setCollaboratorsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!watchlistId) {
        setCollaboratorsCount(0);
        return;
      }
      
      setIsLoading(true);
      try {
        const collaborators = await watchlistService.getWatchlistCollaborators(watchlistId);
        setCollaboratorsCount(collaborators.length);
      } catch (error) {
        console.error("Error fetching collaborators:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCollaborators();
  }, [watchlistId]);

  return {
    collaboratorsCount,
    isLoading
  };
}
