import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/context/auth';
import betaUserService, { BetaUser } from '@/services/betaUserService';

interface BetaOnboardingProps {
  inviteCode?: string;
}

export function BetaOnboarding({ inviteCode }: BetaOnboardingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [betaUser, setBetaUser] = useState<BetaUser | null>(null);
  const [tradingExperience, setTradingExperience] = useState('');
  const [tradingFrequency, setTradingFrequency] = useState('');
  const [preferredAssets, setPreferredAssets] = useState<string[]>([]);
  const [customInviteCode, setCustomInviteCode] = useState(inviteCode || '');
  const [step, setStep] = useState(inviteCode ? 1 : 0);

  // Asset types for checkboxes
  const assetTypes = [
    { id: 'stocks', label: 'Stocks' },
    { id: 'etfs', label: 'ETFs' },
    { id: 'options', label: 'Options' },
    { id: 'crypto', label: 'Cryptocurrencies' },
    { id: 'forex', label: 'Forex' },
    { id: 'futures', label: 'Futures' },
    { id: 'bonds', label: 'Bonds' }
  ];

  const verifyInviteCode = async (code: string) => {
    try {
      setVerifying(true);
      const user = await betaUserService.getBetaUserByInviteCode(code);
      
      if (user) {
        setBetaUser(user);
        setStep(1);
      } else {
        toast({
          title: "Invalid invite code",
          description: "The invite code you entered is not valid.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error verifying invite code:", error);
      toast({
        title: "Verification failed",
        description: "There was an error verifying your invite code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyCode = () => {
    if (customInviteCode.trim()) {
      verifyInviteCode(customInviteCode.trim());
    }
  };
  
   
  useEffect(() => {
    if (inviteCode) {
      verifyInviteCode(inviteCode);
    } else {
      setVerifying(false);
    }
  }, [inviteCode]);

  const handleAssetToggle = (asset: string) => {
    setPreferredAssets(
      preferredAssets.includes(asset)
        ? preferredAssets.filter(a => a !== asset)
        : [...preferredAssets, asset]
    );
  };

  const handleSubmit = async () => {
    if (!betaUser || !user) return;
    
    try {
      setLoading(true);
      
      // Update the beta user profile with onboarding information
      const success = await betaUserService.updateBetaUserProfile(betaUser.id, {
        tradingExperience,
        tradingFrequency,
        preferredAssets,
        status: 'registered'
      });
      
      if (success) {
        toast({
          title: "Onboarding complete",
          description: "Welcome to the Mizuchi beta program! You now have access to all features.",
          variant: "default"
        });
        
        // Redirect to dashboard
        navigate('/');
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Onboarding failed",
        description: "There was an error completing your onboarding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Mizuchi Beta Program</CardTitle>
        <CardDescription>
          {step === 0 
            ? "Enter your invite code to join the beta"
            : "Complete your profile to get started"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                placeholder="Enter your invite code"
                value={customInviteCode}
                onChange={(e) => setCustomInviteCode(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleVerifyCode}
              disabled={verifying || !customInviteCode.trim()}
            >
              {verifying ? "Verifying..." : "Continue"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Trading Experience</Label>
              <RadioGroup value={tradingExperience} onValueChange={setTradingExperience}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="beginner" id="beginner" />
                  <Label htmlFor="beginner">Beginner (&lt; 1 year)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="intermediate" id="intermediate" />
                  <Label htmlFor="intermediate">Intermediate (1-3 years)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="advanced" id="advanced" />
                  <Label htmlFor="advanced">Advanced (3-5 years)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="expert" id="expert" />
                  <Label htmlFor="expert">Expert (5+ years)</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Trading Frequency</Label>
              <RadioGroup value={tradingFrequency} onValueChange={setTradingFrequency}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="daily" />
                  <Label htmlFor="daily">Daily</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly">Weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly">Monthly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quarterly" id="quarterly" />
                  <Label htmlFor="quarterly">Quarterly or less</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Preferred Asset Types</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {assetTypes.map((asset) => (
                  <div key={asset.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={asset.id} 
                      checked={preferredAssets.includes(asset.id)}
                      onCheckedChange={() => handleAssetToggle(asset.id)}
                    />
                    <Label htmlFor={asset.id}>{asset.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {step === 1 && (
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={loading || !tradingExperience || !tradingFrequency || preferredAssets.length === 0}
          >
            {loading ? "Submitting..." : "Complete Onboarding"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default BetaOnboarding;
