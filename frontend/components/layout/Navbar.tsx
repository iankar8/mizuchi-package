
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import Logo from "./nav/Logo";
import MobileMenu from "./nav/MobileMenu";
import SharedNavItems from "./nav/SharedNavItems";

const Navbar = () => {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Close mobile menu when screen size changes
    if (!isMobile && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isMobile, isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  return (
    <header className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b",
      scrolled 
        ? "bg-background/95 backdrop-blur-md shadow-sm" 
        : "bg-background border-border"
    )}>
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <SharedNavItems isMobile={isMobile} includeNavLinks={true}>
            <Logo />
          </SharedNavItems>
          
          {isMobile && (
            <button 
              onClick={toggleMenu}
              className="p-2 rounded-md hover:bg-secondary/50 transition-colors"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X size={20} className="text-foreground" />
              ) : (
                <Menu size={20} className="text-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobile && <MobileMenu isOpen={isMenuOpen} toggleMenu={toggleMenu} />}
    </header>
  );
};

export default Navbar;
