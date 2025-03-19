import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function SupabaseAuthDebug() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [authLogs, setAuthLogs] = useState<string[]>([]);
  const [persistSession, setPersistSession] = useState(true);
  const [debugMode, setDebugMode] = useState(true);
  const [authMethod, setAuthMethod] = useState<'signUp' | 'signIn' | 'magic'>('signIn');
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        addLog(`Session check error: ${error.message}`);
      } else if (data.session) {
        setSession(data.session);
        addLog(`Found existing session for user: ${data.session.user.email}`);
      } else {
        addLog('No existing session found');
      }
    };

    checkSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addLog(`Auth state changed: ${event}`);
      if (session) {
        setSession(session);
        addLog(`User authenticated: ${session.user.email}`);
      } else {
        setSession(null);
        addLog('User signed out');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setAuthLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const handleSignUp = async () => {
    setLoading(true);
    addLog(`Attempting to sign up with email: ${email}`);

    try {
      // Configure auth options based on UI settings
      const options = {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options
      });

      if (error) {
        addLog(`Sign up error: ${error.message}`);
        toast({
          title: 'Sign up failed',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        addLog(`Sign up successful. User ID: ${data.user?.id}`);
        if (data.session) {
          setSession(data.session);
          addLog('Session created automatically after signup');
        } else if (data.user) {
          addLog(`Email confirmation required for: ${data.user.email}`);
          toast({
            title: 'Sign up successful',
            description: 'Please check your email for confirmation link',
          });
        }
      }
    } catch (err: any) {
      addLog(`Unexpected error during sign up: ${err.message}`);
      toast({
        title: 'Unexpected error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    addLog(`Attempting to sign in with email: ${email}`);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        addLog(`Sign in error: ${error.message}`);
        toast({
          title: 'Sign in failed',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        addLog(`Sign in successful. User ID: ${data.user.id}`);
        setSession(data.session);
        toast({
          title: 'Sign in successful',
          description: `Signed in as ${data.user.email}`,
        });
      }
    } catch (err: any) {
      addLog(`Unexpected error during sign in: ${err.message}`);
      toast({
        title: 'Unexpected error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setLoading(true);
    addLog(`Attempting to send magic link to: ${email}`);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        addLog(`Magic link error: ${error.message}`);
        toast({
          title: 'Magic link failed',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        addLog('Magic link sent successfully');
        toast({
          title: 'Magic link sent',
          description: `Please check ${email} for the login link`,
        });
      }
    } catch (err: any) {
      addLog(`Unexpected error sending magic link: ${err.message}`);
      toast({
        title: 'Unexpected error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    addLog('Attempting to sign out');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        addLog(`Sign out error: ${error.message}`);
        toast({
          title: 'Sign out failed',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        addLog('Sign out successful');
        setSession(null);
        toast({
          title: 'Signed out',
          description: 'You have been signed out successfully',
        });
      }
    } catch (err: any) {
      addLog(`Unexpected error during sign out: ${err.message}`);
      toast({
        title: 'Unexpected error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearStorage = () => {
    // Clear all Supabase-related storage
    localStorage.removeItem('mizuchi_supabase_auth');
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.removeItem('supabase.auth.token');
    
    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    
    addLog('Cleared all auth storage and cookies');
    toast({
      title: 'Storage cleared',
      description: 'All authentication storage has been cleared',
    });
  };

  const handleAuth = () => {
    if (authMethod === 'signUp') {
      handleSignUp();
    } else if (authMethod === 'signIn') {
      handleSignIn();
    } else {
      handleMagicLink();
    }
  };

  const updateAuthSettings = async () => {
    // This would normally update the Supabase client, but we can't do that directly
    // Instead, we'll reload the page which will recreate the client with new settings
    addLog(`Updating auth settings: persistSession=${persistSession}, debugMode=${debugMode}`);
    localStorage.setItem('supabase_auth_debug', JSON.stringify({
      persistSession,
      debugMode
    }));
    
    toast({
      title: 'Settings updated',
      description: 'Page will reload to apply new settings',
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Supabase Auth Debugger</h1>
          <p className="text-muted-foreground">
            Advanced authentication testing and debugging
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.href = '/supabase-diagnostics'}
            variant="outline"
          >
            Back to Diagnostics
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Test different authentication methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>
              {authMethod !== 'magic' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Authentication Method</Label>
                <div className="flex space-x-2">
                  <Button 
                    variant={authMethod === 'signIn' ? 'default' : 'outline'}
                    onClick={() => setAuthMethod('signIn')}
                    size="sm"
                  >
                    Sign In
                  </Button>
                  <Button 
                    variant={authMethod === 'signUp' ? 'default' : 'outline'}
                    onClick={() => setAuthMethod('signUp')}
                    size="sm"
                  >
                    Sign Up
                  </Button>
                  <Button 
                    variant={authMethod === 'magic' ? 'default' : 'outline'}
                    onClick={() => setAuthMethod('magic')}
                    size="sm"
                  >
                    Magic Link
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleClearStorage}
              >
                Clear Storage
              </Button>
              <Button
                onClick={handleAuth}
                disabled={loading}
              >
                {loading ? 'Processing...' : authMethod === 'signUp' ? 'Sign Up' : authMethod === 'signIn' ? 'Sign In' : 'Send Magic Link'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Configure authentication behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="persistSession" 
                  checked={persistSession} 
                  onCheckedChange={(checked) => setPersistSession(checked as boolean)} 
                />
                <Label htmlFor="persistSession">Persist Session</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="debugMode" 
                  checked={debugMode} 
                  onCheckedChange={(checked) => setDebugMode(checked as boolean)} 
                />
                <Label htmlFor="debugMode">Debug Mode</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={updateAuthSettings}
                variant="outline"
              >
                Update Settings
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
              <CardDescription>
                Current authentication status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session ? (
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">User:</span> {session.user.email}
                  </div>
                  <div>
                    <span className="font-semibold">User ID:</span> {session.user.id}
                  </div>
                  <div>
                    <span className="font-semibold">Expires:</span> {new Date(session.expires_at * 1000).toLocaleString()}
                  </div>
                </div>
              ) : (
                <p>Not authenticated</p>
              )}
            </CardContent>
            <CardFooter>
              {session && (
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                  disabled={loading}
                >
                  Sign Out
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Auth Logs</CardTitle>
              <CardDescription>
                Detailed authentication activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-2 rounded h-[300px] overflow-y-auto font-mono text-xs">
                {authLogs.length > 0 ? (
                  <div className="space-y-1">
                    {authLogs.map((log, index) => (
                      <div key={index} className="border-b border-border pb-1 last:border-0">
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No authentication activity logged yet</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => setAuthLogs([])}
                variant="outline"
                size="sm"
              >
                Clear Logs
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
