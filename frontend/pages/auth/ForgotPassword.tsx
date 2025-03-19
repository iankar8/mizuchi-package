
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { getCSRFToken } from "@/lib/utils";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const { resetPassword, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Generate and set CSRF token on component mount
  useEffect(() => {
    setCsrfToken(getCSRFToken());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Pass CSRF token to resetPassword function
      await resetPassword(email, csrfToken);
      setIsSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "Check your email for a password reset link",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSubmitted 
              ? "We've sent you a reset link. Please check your email."
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        <div className="mt-8 bg-card shadow-sm rounded-lg p-6 border border-border">
          {!isSubmitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                {/* Hidden CSRF token */}
                <input type="hidden" name="csrf_token" value={csrfToken} />
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="mb-4">Check your inbox for the reset link.</p>
              <Link
                to="/auth/signin"
                className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80"
              >
                <ArrowLeft size={16} className="mr-1" />
                Back to sign in
              </Link>
            </div>
          )}

          <div className="mt-6">
            <div className="text-sm text-center">
              <Link
                to="/auth/signin"
                className="font-medium text-primary hover:text-primary/80"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
