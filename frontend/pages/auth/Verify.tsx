
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import { useState } from "react";

const Verify = () => {
  const { resendVerificationEmail, session } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  
  const handleResendEmail = async () => {
    try {
      setIsResending(true);
      await resendVerificationEmail();
      setResendCount(prevCount => prevCount + 1);
    } catch (error) {
      console.error("Failed to resend verification email:", error);
    } finally {
      setIsResending(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold">Email Verification Required</h1>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-lg font-semibold">Your account requires verification</p>
            <p className="mt-2 text-muted-foreground">
              We've sent a verification link to <span className="font-medium">{session?.user?.email}</span>.
            </p>
            <p className="mt-1 text-muted-foreground">
              Please check your email and click the verification link to activate your account.
            </p>
          </div>
          
          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Didn't receive an email? Check your spam folder or request a new verification link.
            </p>
            <Button 
              onClick={handleResendEmail} 
              disabled={isResending || resendCount >= 3}
              className="w-full"
            >
              {isResending ? "Sending..." : "Resend Verification Email"}
            </Button>
            
            {resendCount >= 3 && (
              <p className="text-xs text-amber-500 mt-2">
                Maximum resend attempts reached. Please wait or contact support.
              </p>
            )}
          </div>
          
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Once verified, you can{" "}
              <Link
                to="/auth/signin"
                className="font-medium text-primary hover:text-primary/80"
              >
                sign in
              </Link>
              {" "}to access your account.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Having issues?{" "}
              <Link
                to="/auth/debug"
                className="font-medium text-primary hover:text-primary/80"
              >
                Check auth status
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verify;
