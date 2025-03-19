
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { isQaTestingEnabled, loginWithTestAccount } from "@/utils/qaTestingAccount";
import { getCSRFToken } from "@/lib/utils";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const { signUp, signIn, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Generate and set CSRF token on component mount
  useEffect(() => {
    setCsrfToken(getCSRFToken());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
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
    
    try {
      // Pass CSRF token to the signUp function
      await signUp(email, password, fullName, csrfToken);
    } catch (error) {
      // Error is handled in the signUp function
    }
  };

  const handleTestAccountLogin = async () => {
    const success = await loginWithTestAccount(signIn);
    if (success) {
      toast({
        title: "Test Account Login",
        description: "Logged in with test account successfully",
      });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign up to start using Mizuchi
          </p>
        </div>

        <div className="mt-8 bg-card shadow-sm rounded-lg p-6 border border-border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

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
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>
            
            {/* Hidden CSRF token */}
            <input type="hidden" name="csrf_token" value={csrfToken} />

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating account..." : "Sign up"}
              </button>
            </div>
          </form>

          {isQaTestingEnabled() && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={handleTestAccountLogin}
                className="w-full"
                disabled={isLoading}
              >
                Skip Registration (Use Test Account)
              </Button>
            </div>
          )}

          <div className="mt-6">
            <div className="text-sm text-center">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/auth/signin"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
