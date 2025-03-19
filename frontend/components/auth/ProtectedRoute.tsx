
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

const ProtectedRoute = ({ children, requireVerified = true }: ProtectedRouteProps) => {
  const { isAuthenticated, isEmailVerified, isLoading } = useAuth();
  const location = useLocation();

  // Log auth state for debugging in development mode only
  if (import.meta.env.MODE === 'development') {
    console.log('Protected Route Auth State:', {
      isAuthenticated,
      isEmailVerified,
      isLoading,
      requireVerified,
      path: location.pathname
    });
  }

  if (isLoading) {
    // Return a loading spinner
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('Redirecting to login: Not authenticated');
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  // If authenticated but email not verified and verification is required
  if (isAuthenticated && !isEmailVerified && requireVerified) {
    console.log('Redirecting to verify: Email not verified');
    return <Navigate to="/auth/verify" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
