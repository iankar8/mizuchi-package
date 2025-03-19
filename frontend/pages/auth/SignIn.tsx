
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth";


const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signIn, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    try {
      console.log("Submitting sign in with:", { email });
      await signIn(email, password);
    } catch (err: any) {
      console.error("Sign in error in component:", err);
      setError(err.message || "Failed to sign in");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <div className="mt-8 bg-card shadow-sm rounded-lg p-6 border border-border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-md text-destructive text-sm">
                {error}
              </div>
            )}
            
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/auth/signup"
                className="w-full flex justify-center py-2 px-4 border border-border rounded-md shadow-sm text-sm font-medium bg-background hover:bg-accent transition-colors duration-200"
              >
                Sign up
              </Link>
              
              <div className="mt-4 text-center">
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-primary hover:text-primary/80"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>
          

        </div>
      </div>
    </div>
  );
};

export default SignIn;
