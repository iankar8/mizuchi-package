import React, { useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function SupabaseLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        console.error("Login error:", error);
      } else {
        toast({
          title: "Login successful",
          description: "You have been logged in successfully.",
        });
        console.log("Login successful:", data);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSignUp = async () => {
    setLoading(true);
    try {
      // Use a more realistic email format that's more likely to pass validation
      const randomString = Math.random().toString(36).substring(2, 8);
      const testEmail = `user.${randomString}@gmail.com`;
      const testPassword = "Test123456!";
      
      console.log(`Attempting to sign up with email: ${testEmail}`);
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          emailRedirectTo: window.location.origin + '/supabase-test'
        }
      });

      if (error) {
        toast({
          title: "Test signup failed",
          description: error.message,
          variant: "destructive",
        });
        console.error("Test signup error:", error);
      } else {
        toast({
          title: "Test signup successful",
          description: `Created test account: ${testEmail}`,
        });
        console.log("Test signup successful:", data);
        
        // Auto-fill the form with test credentials
        setEmail(testEmail);
        setPassword(testPassword);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Test signup failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Supabase Test Login</CardTitle>
          <CardDescription>
            Sign in to test Supabase connectivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium mb-2">Quick Test Options</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => {
                  setEmail("test@example.com");
                  setPassword("password123");
                }}
              >
                Demo Account
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={handleTestSignUp}
                disabled={loading}
              >
                Create Test Account
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="secondary" 
            onClick={() => window.location.href = '/supabase-test'}
          >
            Back to Test
          </Button>
          <Button 
            variant="destructive" 
            onClick={async () => {
              await supabase.auth.signOut();
              toast({
                title: "Signed out",
                description: "You have been signed out successfully."
              });
            }}
          >
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
