
import React, { createContext, useState, useEffect, useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import { UserProfile, Session } from "@/types/auth";
import { useNavigate } from "react-router-dom";
import { 
  AuthContextType,
} from "./types";
import {
  fetchUserProfile,
  createUserProfile
} from "./authUtils";
import { supabase } from "@/utils/supabase/client";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();



  // Add debug logging for auth state changes
  useEffect(() => {
    console.log("Auth state changed:", { 
      session: !!session, 
      user: !!user, 
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userProfile: user ? { 
        id: user.id, 
        email: user.email,
        verified: user.email_verified,
        role: user.role 
      } : null
    });
  }, [session, user]);

  useEffect(() => {
    const setupAuth = async () => {
      console.log("Starting auth setup...");

      // Normal auth flow
      try {
        console.log("Fetching session from Supabase...");
        const { data: currentSession, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setIsLoading(false);
          return;
        }
        
        console.log("Session data:", currentSession);
        
        // Check if session exists but is expiring soon (within 15 minutes)
        if (currentSession?.session) {
          const expiresAt = currentSession.session.expires_at;
          const expiresInSeconds = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : 0;
          
          console.log(`Session expires in ${expiresInSeconds} seconds`);
          
          // If token will expire soon, refresh it proactively
          if (expiresInSeconds < 900) { // 15 minutes in seconds
            console.log("Session expiring soon, refreshing token...");
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError) {
                console.error("Failed to refresh session:", refreshError);
              } else if (refreshData.session) {
                console.log("Session refreshed successfully");
                // Use the refreshed session
                currentSession.session = refreshData.session;
              }
            } catch (refreshError) {
              console.error("Error refreshing session:", refreshError);
            }
          }
          
          console.log("Valid session found, setting session state...");
          setSession({
            user: {
              id: currentSession.session.user.id,
              email: currentSession.session.user.email || '',
            }
          });
          
          // Fetch user profile with fallback creation
          console.log("Fetching user profile...");
          try {
            let profile = await fetchUserProfile(currentSession.session.user.id);
            console.log("Profile data:", profile);
            
            // If no profile found and we have user data, try to create one
            if (!profile && currentSession.session.user.email) {
              console.log("No profile found during setup, attempting to create one");
              try {
                // Extract name from metadata or email
                const fullName = currentSession.session.user.user_metadata?.full_name || 
                                 currentSession.session.user.email.split('@')[0] || 
                                 'New User';
                                 
                await createUserProfile(
                  currentSession.session.user.id,
                  currentSession.session.user.email,
                  fullName
                );
                
                // Fetch the profile again after creation
                profile = await fetchUserProfile(currentSession.session.user.id);
              } catch (profileCreateError) {
                console.error("Failed to create missing profile during setup:", profileCreateError);
              }
            }
            
            if (profile) {
              setUser(profile);
            } else {
              console.warn("Failed to get or create user profile during setup");
            }
          } catch (profileError) {
            console.error("Error handling profile during setup:", profileError);
          }
        } else {
          console.log("No valid session found");
        }
      } catch (error) {
        console.error("Error in setupAuth:", error);
      } finally {
        setIsLoading(false);
      }
      
      // Set up a token refresh using the centralized token manager
      try {
        const { tokenManager } = await import('@/utils/supabase/tokenManager');
        
        // Subscribe to token refresh events
        const unsubscribeTokenRefresh = tokenManager.onRefresh((success) => {
          if (success) {
            console.log("Token refreshed by token manager");
            // Update session after token refresh
            supabase.auth.getSession().then(({ data }) => {
              if (data?.session) {
                setSession({
                  user: {
                    id: data.session.user.id,
                    email: data.session.user.email || '',
                  }
                });
              }
            });
          } else {
            console.error("Token refresh failed in token manager");
          }
        });
        
        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log('Auth state changed:', event);
          
          if (newSession) {
            setSession({
              user: {
                id: newSession.user.id,
                email: newSession.user.email || '',
              }
            });
            
            // Fetch user profile on auth change with profile creation fallback
            try {
              let profile = await fetchUserProfile(newSession.user.id);
              
              // If no profile found, try to create one
              if (!profile && newSession.user.email) {
                console.log("No profile found on auth change, attempting to create one");
                try {
                  // Extract display name from email or use default
                  const fullName = newSession.user.user_metadata?.full_name || 
                                   newSession.user.email.split('@')[0] || 
                                   'New User';
                                   
                  await createUserProfile(
                    newSession.user.id,
                    newSession.user.email,
                    fullName
                  );
                  
                  // Fetch the profile again after creation
                  profile = await fetchUserProfile(newSession.user.id);
                } catch (profileCreateError) {
                  console.error("Failed to create missing profile:", profileCreateError);
                }
              }
              
              if (profile) {
                setUser(profile);
              } else {
                console.warn("Failed to get or create user profile");
              }
            } catch (profileError) {
              console.error("Error handling profile in auth change:", profileError);
            }
          } else {
            setSession(null);
            setUser(null);
          }
        });
        
        // Return cleanup function
        return () => {
          // Clean up listeners
          if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
          if (authListener?.subscription) authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error setting up token manager:", error);
        return () => {}; // Return empty cleanup function
      }
    };
    
    // Execute the async setup function
    const cleanupPromise = setupAuth();
    
    // Return a synchronous cleanup function
    return () => {
      // When the promise resolves, call the cleanup function
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      }).catch(err => {
        console.error("Error in cleanup:", err);
      });
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Import the rate limit service dynamically to avoid circular dependencies
      const authRateLimitService = (await import('@/services/authRateLimitService')).default;
      
      // Get client IP
      const ipAddress = await authRateLimitService.getClientIP();
      
      // Check if we're rate limited before attempting to sign in
      const rateLimitCheck = await authRateLimitService.checkRateLimit(email, ipAddress);
      
      if (!rateLimitCheck.allowed) {
        const minutes = Math.ceil(rateLimitCheck.remaining_seconds / 60);
        throw new Error(
          `Too many failed login attempts. Please try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
        );
      }
      
      // If not rate limited, proceed with login
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      // Record the authentication attempt result
      await authRateLimitService.recordAttempt(
        email,
        ipAddress,
        !error // success = !error
      );
      
      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }
      
      if (!data.session || !data.user) {
        throw new Error("No session or user returned from sign in");
      }
      
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      
      navigate('/');
      
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid login credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, full_name: string, csrfToken: string) => {
    try {
      setIsLoading(true);
      
      // Import utilities dynamically to avoid circular dependencies
      const { validateCSRFToken } = await import('@/lib/utils');
      
      // Validate CSRF token
      if (!validateCSRFToken(csrfToken)) {
        throw new Error("Invalid request signature. Please try again.");
      }
      
      // Import the rate limit service dynamically
      const authRateLimitService = (await import('@/services/authRateLimitService')).default;
      
      // Get client IP
      const ipAddress = await authRateLimitService.getClientIP();
      
      // Attempt to create the user account with retries and detailed error handling
      let signupAttempts = 0;
      const maxAttempts = 2;
      let data: any = null;
      let error: any = null;
      
      while (signupAttempts < maxAttempts) {
        signupAttempts++;
        console.log(`Signup attempt ${signupAttempts}/${maxAttempts}`);
        
        try {
          const result = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name,
                signup_ip: ipAddress,
              },
              emailRedirectTo: `${window.location.origin}/auth/verify-callback`
            },
          });
          
          data = result.data;
          error = result.error;
          
          // If successful or got a specific error that won't be fixed by retry, exit loop
          if (data?.user || (error && (error.message?.includes("already") || error.message?.includes("taken")))) {
            break;
          }
          
          // If we got a database error, try waiting and retrying
          if (error && (error.message?.includes("database") || error.message?.includes("timeout"))) {
            console.warn(`Database error on attempt ${signupAttempts}, retrying after delay...`, error);
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
          
          // For any other error, break immediately
          break;
        } catch (catchError) {
          error = catchError;
          console.error("Exception during signup:", catchError);
          break;
        }
      }
      
      if (error) {
        console.error("Sign up error after attempts:", error);
        
        // Provide more user-friendly error messages
        if (error.message?.includes("database")) {
          throw new Error("Database connection issue. Please try again in a few moments.");
        } else if (error.message?.includes("already registered")) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        } else {
          throw error;
        }
      }
      
      if (data.user) {
        // Manually create profile since there's no database trigger
        try {
          console.log("Creating user profile for:", data.user.id);
          await createUserProfile(
            data.user.id,
            email,
            fullName
          );
          console.log("User profile created successfully");
          
          toast({
            title: "Account created!",
            description: "You've successfully signed up. Please check your email for verification.",
          });
          
          navigate('/auth/verify');
        } catch (profileError) {
          console.error("Error creating user profile:", profileError);
          
          // Even if profile creation fails, the account exists
          // Allow the user to continue but warn them
          toast({
            title: "Account created with warning",
            description: "Your account was created but profile setup had an issue. Some features may be limited until this is resolved.",
            variant: "warning",
            duration: 10000 // Show for longer
          });
          
          // Try to fix the profile issue in the background
          setTimeout(async () => {
            try {
              console.log("Delayed retry of profile creation for:", data.user.id);
              await createUserProfile(data.user.id, email, fullName);
              console.log("Delayed profile creation succeeded");
            } catch (retryError) {
              console.error("Delayed profile creation failed:", retryError);
            }
          }, 3000);
          
          navigate('/auth/verify');
        }
      } else {
        throw new Error("Failed to create user account");
      }
      
    } catch (error: any) {
      console.error("Full sign up error:", error);
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
      
      navigate('/auth/signin');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string, csrfToken: string) => {
    try {
      setIsLoading(true);
      
      // Import utilities dynamically to avoid circular dependencies
      const { validateCSRFToken } = await import('@/lib/utils');
      
      // Validate CSRF token
      if (!validateCSRFToken(csrfToken)) {
        throw new Error("Invalid request signature. Please try again.");
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      
      // Record the password reset attempt for monitoring
      try {
        const authRateLimitService = (await import('@/services/authRateLimitService')).default;
        const ipAddress = await authRateLimitService.getClientIP();
        
        // Log the reset attempt (not part of rate limiting)
        await authRateLimitService.recordAttempt(
          email, 
          ipAddress,
          true, // This isn't a failure, just tracking the event
        );
      } catch (loggingError) {
        // Silently continue if logging fails
        console.error("Failed to log password reset:", loggingError);
      }
      
      toast({
        title: "Reset email sent",
        description: "Check your email for the password reset link",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (token: string, newPassword: string, csrfToken: string) => {
    try {
      setIsLoading(true);
      
      // Import utilities dynamically to avoid circular dependencies
      const { validateCSRFToken } = await import('@/lib/utils');
      
      // Validate CSRF token
      if (!validateCSRFToken(csrfToken)) {
        throw new Error("Invalid request signature. Please try again.");
      }
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully",
      });
      
      // Add a slight delay before redirecting
      setTimeout(() => {
        navigate('/auth/signin');
      }, 1000);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      setIsLoading(true);
      
      if (!session?.user?.email) {
        throw new Error("No user email found");
      }
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-callback`
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification link",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if email is verified
  const isEmailVerified = 
    user?.email_verified || 
    !!(session?.user && (session.user as any)?.email_confirmed_at);

  // Determine authentication state - auth bypass has been removed
  const hasValidSession = !!session?.user;
  const isAuthenticated = hasValidSession;

  const value = {
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    isAuthenticated,
    isEmailVerified: isEmailVerified,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
