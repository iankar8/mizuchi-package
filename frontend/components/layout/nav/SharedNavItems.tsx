
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import DesktopMenu from "./DesktopMenu";
import UserActions from "./UserActions";
import AuthActions from "./AuthActions";

interface SharedNavItemsProps {
  isMobile: boolean;
  children?: ReactNode;
  includeNavLinks?: boolean;
}

const SharedNavItems = ({ isMobile, children, includeNavLinks = true }: SharedNavItemsProps) => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* Left side: Logo and navigation links */}
      <div className="flex items-center gap-8">
        {children}
        {!isMobile && isAuthenticated && includeNavLinks && <DesktopMenu />}
      </div>
      
      {/* Right side: User actions or auth actions */}
      <div className="flex items-center gap-4">
        {isAuthenticated ? <UserActions /> : <AuthActions />}
      </div>
    </>
  );
};

export default SharedNavItems;
