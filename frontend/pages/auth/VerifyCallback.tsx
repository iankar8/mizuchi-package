import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";

const VerifyCallback = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        setIsVerifying(true);
        setError(null);

        // Parse the URL parameters
        const params = new URLSearchParams(location.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");
        
        console.log("Verification callback params:", { 
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type
        });

        // If this is not coming from an email verification, this is not for us
        if (type !== "email_change" && type !== "signup" && type !== "recovery") {
          console.warn("Unexpected verification type:", type);
          setError("Invalid verification link type");
          setIsVerifying(false);
          return;
        }

        if (!accessToken) {
          console.error("No access token in verification URL");
          setError("Invalid verification link - missing token");
          setIsVerifying(false);
          return;
        }

        // Get the current session
        const { data: sessionData } = await supabase.auth.getSession();
        
        // If we already have a session, we'll set the session with the new tokens
        // Otherwise we'll just verify the token to confirm the email
        if (sessionData?.session) {
          console.log("Existing session found, updating session");
          
          // Set the session with the new tokens from the URL
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || sessionData.session.refresh_token,
          });
          
          if (setSessionError) {
            console.error("Error setting session:", setSessionError);
            setError(setSessionError.message);
            setIsVerifying(false);
            return;
          }
          
          if (!data.session) {
            console.error("Failed to set session - no session returned");
            setError("Failed to verify email - please try again");
            setIsVerifying(false);
            return;
          }
          
          console.log("Session updated successfully");
        } else {
          console.log("No existing session, using token exchange");
          
          // Exchange token to verify the email
          const { data, error: exchangeError } = await supabase.auth.verifyOtp({
            token_hash: accessToken,
            type: type === "recovery" ? "recovery" : "email",
          });
          
          if (exchangeError) {
            console.error("Error verifying token:", exchangeError);
            
            if (exchangeError.message.includes("expired")) {
              setError("Verification link has expired. Please request a new one.");
            } else {
              setError(exchangeError.message);
            }
            
            setIsVerifying(false);
            return;
          }
          
          if (!data.session) {
            console.error("Failed to verify email - no session returned");
            setError("Failed to verify email - please try again");
            setIsVerifying(false);
            return;
          }
          
          console.log("Email verified successfully");
        }
        
        // Success!
        setSuccess(true);
        setIsVerifying(false);
        
        toast({
          title: "Email verified",
          description: "Your email has been successfully verified",
        });
        
        // Redirect to sign in page after a short delay
        setTimeout(() => {
          navigate("/auth/signin");
        }, 2000);
        
      } catch (error: any) {
        console.error("Verification error:", error);
        setError(error.message || "An error occurred during verification");
        setIsVerifying(false);
      }
    };

    handleEmailVerification();
  }, [location, navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-3xl font-bold">Email Verification</h1>
        
        <div className="mt-6 p-6 bg-card shadow-sm rounded-lg border border-border">
          {isVerifying ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Spinner size="lg" />
              <p>Verifying your email...</p>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-green-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold">Email Verified Successfully</p>
              <p className="text-muted-foreground">Redirecting you to sign in...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-red-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold">Verification Failed</p>
              <p className="text-muted-foreground">{error || "An error occurred during verification"}</p>
              <Button 
                onClick={() => navigate("/auth/verify")}
                className="mt-4"
              >
                Back to Verification Page
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyCallback;