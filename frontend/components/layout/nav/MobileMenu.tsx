
import { cn } from "@/lib/utils";
import NavItem from "./NavItem";
import { Home, List, Wallet, BarChartHorizontal } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  toggleMenu: () => void;
}

const MobileMenu = ({ isOpen, toggleMenu }: MobileMenuProps) => {
  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/watchlist", icon: List, label: "Watchlist" },
    { to: "/portfolio", icon: Wallet, label: "Portfolio" },
    { to: "/market-movers", icon: BarChartHorizontal, label: "Market Movers" },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-x-0 bg-background border-t border-border transform transition-transform duration-300 ease-in-out translate-y-16"
      aria-hidden={!isOpen}
    >
      <nav className="flex flex-col p-4 space-y-2">
        {navItems.map((item) => (
          <NavItem 
            key={item.to} 
            to={item.to} 
            icon={item.icon} 
            label={item.label}
            onClick={toggleMenu}
          />
        ))}
      </nav>
    </div>
  );
};

export default MobileMenu;
