
import { useState } from "react";

export function useWatchlistForm(initialName = "", initialDesc = "") {
  const [watchlistName, setWatchlistName] = useState(initialName);
  const [watchlistDesc, setWatchlistDesc] = useState(initialDesc);

  const resetForm = () => {
    setWatchlistName("");
    setWatchlistDesc("");
  };

  const isValid = () => {
    return watchlistName.trim().length > 0;
  };

  return {
    watchlistName,
    setWatchlistName,
    watchlistDesc,
    setWatchlistDesc,
    resetForm,
    isValid
  };
}
