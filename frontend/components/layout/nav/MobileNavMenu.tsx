
import { Link } from "react-router-dom";
import { Home, BookOpen, PieChart, BarChartHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/notifications/NotificationCenter";

interface MobileNavMenuProps {
  isOpen: boolean;
  isActive: (path: string) => boolean;
  onLinkClick: () => void;
  isAuthenticated: boolean;
}

const MobileNavMenu = ({ 
  isOpen, 
  isActive, 
  onLinkClick, 
  isAuthenticated 
}: MobileNavMenuProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="md:hidden bg-white dark:bg-gray-900 border-t border-border">
      <div className="px-2 pt-2 pb-3 space-y-1">
        <Link 
          to="/"
          className={cn(
            "block px-3 py-2 rounded-md text-base font-medium flex items-center",
            isActive("/") 
              ? "bg-primary/10 text-primary" 
              : "text-foreground hover:bg-secondary/50"
          )}
          onClick={onLinkClick}
        >
          <Home size={16} className="mr-1.5" />
          Dashboard
        </Link>
        
        <Link 
          to="/watchlist"
          className={cn(
            "block px-3 py-2 rounded-md text-base font-medium flex items-center",
            isActive("/watchlist") 
              ? "bg-primary/10 text-primary" 
              : "text-foreground hover:bg-secondary/50"
          )}
          onClick={onLinkClick}
        >
          <PieChart size={16} className="mr-1.5" />
          Watchlists
        </Link>
        
        {/* Research page removed from MVP
        <Link 
          to="/research"
          className={cn(
            "block px-3 py-2 rounded-md text-base font-medium flex items-center",
            isActive("/research") 
              ? "bg-primary/10 text-primary" 
              : "text-foreground hover:bg-secondary/50"
          )}
          onClick={onLinkClick}
        >
          <BookOpen size={16} className="mr-1.5" />
          Research
        </Link>
        */}
        
        <Link 
          to="/market-movers"
          className={cn(
            "block px-3 py-2 rounded-md text-base font-medium flex items-center",
            isActive("/market-movers") 
              ? "bg-primary/10 text-primary" 
              : "text-foreground hover:bg-secondary/50"
          )}
          onClick={onLinkClick}
        >
          <BarChartHorizontal size={16} className="mr-1.5" />
          Market Movers
        </Link>
        
        {isAuthenticated && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="px-3 py-2">
              <NotificationCenter />
            </div>
          </div>
        )}
        
        {!isAuthenticated && (
          <div className="pt-4 pb-3 border-t border-border">
            <div className="flex items-center justify-between px-3">
              <Link
                to="/auth/signin"
                className="block w-full px-3 py-2 text-center text-sm font-medium rounded-md border border-border hover:bg-secondary/50"
                onClick={onLinkClick}
              >
                Sign in
              </Link>
              
              <div className="w-2"></div>
              
              <Link
                to="/auth/signup"
                className="block w-full px-3 py-2 text-center text-sm font-medium rounded-md bg-primary text-white hover:bg-primary/90"
                onClick={onLinkClick}
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNavMenu;
