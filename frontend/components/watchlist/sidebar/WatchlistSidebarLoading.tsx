
import { Loader2 } from "lucide-react";

const WatchlistSidebarLoading = () => {
  return (
    <div className="flex flex-col space-y-3 py-6">
      {/* Simulate loading items with skeleton UI */}
      {Array(4).fill(0).map((_, index) => (
        <div key={index} className="flex items-center gap-2 animate-pulse">
          <div className="h-5 w-full bg-gray-100 rounded"></div>
        </div>
      ))}
    </div>
  );
};

export default WatchlistSidebarLoading;
