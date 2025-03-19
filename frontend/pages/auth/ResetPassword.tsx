
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getCSRFToken, validateCSRFToken } from "@/lib/utils";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { updatePassword, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from URL
  const [token, setToken] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>("");
  
  useEffect(() => {
    // Generate/get CSRF token for form protection
    setCsrfToken(getCSRFToken());
    
    // Extract hash fragment from URL (e.g., #access_token=xxx)
    const hash = location.hash;
    if (hash && hash.includes('type=recovery')) {
      const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
      // Verify state parameter if present (for CSRF protection)
      const state = new URLSearchParams(hash.substring(1)).get('state');
      
      if (accessToken) {
        // If state parameter exists, validate it against stored CSRF token
        if (state && !validateCSRFToken(state)) {
          toast({
            title: "Security Error",
            description: "Invalid security token. Please request a new password reset.",
            variant: "destructive",
          });
          return;
        }
        setToken(accessToken);
      } else {
        toast({
          title: "Error",
          description: "Invalid or missing reset token",
          variant: "destructive",
        });
      }
    }
  }, [location, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    
    if (!token) {
      toast({
        title: "Error",
        description: "Invalid or missing reset token",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await updatePassword(token, password);
      toast({
        title: "Success",
        description: "Your password has been updated. Please sign in.",
      });
      navigate('/auth/signin');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4">
        <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-sm border border-border">
          <h1 className="text-2xl font-bold mb-4">Invalid Reset Link</h1>
          <p className="mb-4">
            The password reset link is invalid or has expired. Please request a new password reset link.
          </p>
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Set new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a strong password for your account
          </p>
        </div>

        <div className="mt-8 bg-card shadow-sm rounded-lg p-6 border border-border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Updating..." : "Reset Password"}
              </button>
            </div>
            <input type="hidden" name="csrf_token" value={csrfToken} />
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
