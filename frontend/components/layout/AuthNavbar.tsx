
import { useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import Logo from "./nav/Logo";
import DesktopNavLinks from "./nav/DesktopNavLinks";
import MobileNavMenu from "./nav/MobileNavMenu";
import SharedNavItems from "./nav/SharedNavItems";

const AuthNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    // Close mobile menu when screen size changes
    if (!isMobile && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile, isMobileMenuOpen]);
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <SharedNavItems isMobile={isMobile} includeNavLinks={false}>
            <Logo />
            {!isMobile && <DesktopNavLinks isActive={isActive} />}
          </SharedNavItems>
          
          {isMobile && (
            <button
              className="p-2 rounded-md hover:bg-secondary/50 transition-colors"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X size={20} className="text-foreground" />
              ) : (
                <Menu size={20} className="text-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <MobileNavMenu 
        isOpen={isMobileMenuOpen}
        isActive={isActive}
        onLinkClick={closeMobileMenu}
        isAuthenticated={isAuthenticated}
      />
    </nav>
  );
};

export default AuthNavbar;
