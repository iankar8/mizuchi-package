import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { clearSupabaseStorage } from '@/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function ClearCache() {
  const [isClearing, setIsClearing] = useState(false);
  const [isCleared, setIsCleared] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear Supabase storage
      const success = await clearSupabaseStorage();
      
      if (success) {
        setIsCleared(true);
        toast({
          title: "Cache cleared successfully",
          description: "All Supabase storage has been cleared. You can now sign in again.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error clearing cache",
          description: "There was an error clearing the Supabase storage. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in clear cache handler:', error);
      toast({
        title: "Error clearing cache",
        description: "An unexpected error occurred. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Clear Auth Cache</CardTitle>
          <CardDescription>
            Use this utility to clear Supabase authentication cache if you're experiencing login issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-medium flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              When to use this
            </h3>
            <ul className="list-disc pl-5 mt-2 text-sm">
              <li>You see "Multiple GoTrueClient instances" warnings</li>
              <li>You're having trouble logging in</li>
              <li>Authentication state seems inconsistent</li>
              <li>You're stuck in a login loop</li>
            </ul>
          </div>

          {isCleared && (
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-md border border-green-200 dark:border-green-800">
              <h3 className="font-medium flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-5 w-5" />
                Cache cleared successfully
              </h3>
              <p className="text-sm mt-2 text-green-600 dark:text-green-400">
                All Supabase storage has been cleared. You can now sign in again.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleClearCache} 
            className="w-full" 
            disabled={isClearing || isCleared}
          >
            {isClearing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {isClearing ? 'Clearing Cache...' : 'Clear Auth Cache'}
          </Button>
          
          {isCleared && (
            <>
              <Button 
                onClick={handleGoToLogin} 
                className="w-full"
                variant="outline"
              >
                Go to Login
              </Button>
              <Button 
                onClick={handleReload} 
                className="w-full mt-2"
                variant="secondary"
              >
                Reload Page
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
