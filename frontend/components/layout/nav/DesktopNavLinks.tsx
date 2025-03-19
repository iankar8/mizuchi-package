
import { Link } from "react-router-dom";
import { Home, BookOpen, PieChart, BarChartHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface DesktopNavLinksProps {
  isActive: (path: string) => boolean;
}

const DesktopNavLinks = ({ isActive }: DesktopNavLinksProps) => {
  return (
    <div className="hidden md:flex items-center space-x-1">
      <Link 
        to="/"
        className={cn(
          "px-3 py-2 rounded-md text-sm font-medium flex items-center",
          isActive("/") 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <Home size={16} className="mr-1.5" />
        Dashboard
      </Link>
      
      <Link 
        to="/watchlist"
        className={cn(
          "px-3 py-2 rounded-md text-sm font-medium flex items-center",
          isActive("/watchlist") 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <PieChart size={16} className="mr-1.5" />
        Watchlists
      </Link>
      
      {/* Research page removed from MVP
      <Link 
        to="/research"
        className={cn(
          "px-3 py-2 rounded-md text-sm font-medium flex items-center",
          isActive("/research") 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <BookOpen size={16} className="mr-1.5" />
        Research
      </Link>
      */}
      
      <Link 
        to="/market-movers"
        className={cn(
          "px-3 py-2 rounded-md text-sm font-medium flex items-center",
          isActive("/market-movers") 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <BarChartHorizontal size={16} className="mr-1.5" />
        Market Movers
      </Link>
    </div>
  );
};

export default DesktopNavLinks;
