
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import UserMenu from "@/components/auth/UserMenu";
import NotificationCenter from "@/components/notifications/NotificationCenter";

const AuthActions = () => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return (
      <div className="flex items-center space-x-2">
        <div className="hidden sm:block">
          <NotificationCenter />
        </div>
        <UserMenu />
      </div>
    );
  }
  
  return (
    <div className="hidden md:flex items-center space-x-2">
      <Link
        to="/auth/signin"
        className="px-3 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-secondary/50"
      >
        Sign in
      </Link>
      <Link
        to="/auth/signup"
        className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-white hover:bg-primary/90"
      >
        Sign up
      </Link>
    </div>
  );
};

export default AuthActions;
