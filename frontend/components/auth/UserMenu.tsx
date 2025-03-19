
import { useState } from "react";
import { useAuth } from "@/context/auth";
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut } from "lucide-react";

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const toggleMenu = () => setIsOpen(!isOpen);
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  // Calculate initials if no avatar is available
  const getInitials = () => {
    if (!user?.full_name) return "U";
    
    const nameParts = user.full_name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (
      nameParts[0].charAt(0).toUpperCase() + 
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };
  
  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="flex items-center space-x-2 focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          {user?.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.full_name || "User"} 
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium">{getInitials()}</span>
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg border border-border z-50">
          <div className="py-2 px-3 border-b border-border">
            <p className="text-sm font-medium truncate">
              {user?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/profile");
              }}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-secondary/50 transition-colors"
            >
              <User size={16} className="mr-2" />
              <span>Profile</span>
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/settings");
              }}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-secondary/50 transition-colors"
            >
              <Settings size={16} className="mr-2" />
              <span>Settings</span>
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false);
                handleSignOut();
              }}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut size={16} className="mr-2" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default UserMenu;
