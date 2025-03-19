import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { useToast } from '@/components/ui/use-toast';
import BetaOnboarding from '@/components/beta/BetaOnboarding';
import betaUserService from '@/services/betaUserService';

export function BetaInvite() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [validInvite, setValidInvite] = useState(false);

  useEffect(() => {
    const verifyInvite = async () => {
      if (!inviteCode) {
        return;
      }

      try {
        setLoading(true);
        const betaUser = await betaUserService.getBetaUserByInviteCode(inviteCode);
        
        if (betaUser) {
          setValidInvite(true);
          
          // If user is already registered and logged in, redirect to onboarding
          if (isAuthenticated && user?.email === betaUser.email) {
            if (betaUser.status === 'registered' || betaUser.status === 'active') {
              navigate('/');
            }
            // Otherwise continue with onboarding
          }
        } else {
          toast({
            title: "Invalid invite code",
            description: "The invite code you're using is not valid.",
            variant: "destructive"
          });
          navigate('/');
        }
      } catch (error) {
        console.error("Error verifying invite:", error);
        toast({
          title: "Verification error",
          description: "There was an error verifying your invite code.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    verifyInvite();
  }, [inviteCode, isAuthenticated, user, navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-pulse text-center">
          <h2 className="text-2xl font-semibold mb-2">Verifying invite...</h2>
          <p className="text-muted-foreground">Please wait while we verify your invitation.</p>
        </div>
      </div>
    );
  }

  if (!validInvite) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Invalid Invitation</h2>
          <p className="text-muted-foreground mb-4">
            The invite code you're using is not valid or has expired.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Mizuchi Beta</h1>
        <p className="text-muted-foreground">
          You've been invited to join our exclusive beta program for active traders.
        </p>
      </div>
      
      <BetaOnboarding inviteCode={inviteCode} />
    </div>
  );
}

export default BetaInvite;
