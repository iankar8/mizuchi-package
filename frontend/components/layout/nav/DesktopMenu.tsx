
import { Link } from "react-router-dom";
import { Home, List, BookOpen, BarChartHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

const DesktopMenu = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/watchlist", icon: List, label: "Watchlist" },
    { to: "/portfolio", icon: BookOpen, label: "Portfolio" },
    { to: "/market-movers", icon: BarChartHorizontal, label: "Market Movers" },
  ];

  return (
    <nav className="hidden md:flex items-center space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            isActive(item.to)
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          )}
        >
          <item.icon size={18} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default DesktopMenu;
