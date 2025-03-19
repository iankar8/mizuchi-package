import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const DebugAuth = () => {
  const [authData, setAuthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getAuthDebugInfo = async () => {
    setLoading(true);
    
    try {
      // Get session data
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // Try token refresh
      const tokenRefreshResult = { success: false, error: null };
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        tokenRefreshResult.success = !!refreshData.session;
        tokenRefreshResult.error = refreshError;
      } catch (error) {
        tokenRefreshResult.error = error;
      }
      
      // Get local storage keys related to auth
      const localStorageKeys = Object.keys(localStorage)
        .filter(key => 
          key.includes('supabase') || 
          key.includes('sb-') || 
          key.includes('auth')
        )
        .map(key => ({
          key,
          value: localStorage.getItem(key) 
            ? localStorage.getItem(key)!.substring(0, 50) + "..." 
            : null
        }));
      
      setAuthData({
        session: sessionData,
        sessionError,
        tokenRefreshResult,
        localStorageKeys,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting auth debug info:", error);
      setAuthData({ error });
    } finally {
      setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    getAuthDebugInfo();
  }, []);

  const handleClearStorage = async () => {
    try {
      // Sign out
      await supabase.auth.signOut();
      
      // Clear all localStorage items related to Supabase
      const keysToRemove = Object.keys(localStorage)
        .filter(key => 
          key.includes('supabase') || 
          key.includes('sb-') || 
          key.includes('auth')
        );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      toast({
        title: "Storage cleared",
        description: `Cleared ${keysToRemove.length} items from local storage`,
      });
      
      // Refresh debug info
      getAuthDebugInfo();
    } catch (error) {
      console.error("Error clearing storage:", error);
      toast({
        title: "Error",
        description: "Failed to clear storage",
        variant: "destructive",
      });
    }
  };

  const renderJsonTree = (data: any) => {
    return (
      <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="flex items-center space-x-4 mb-6">
        <Button onClick={getAuthDebugInfo} disabled={loading}>
          {loading ? "Loading..." : "Refresh Data"}
        </Button>
        <Button onClick={handleClearStorage} variant="destructive">
          Clear Auth Storage
        </Button>
      </div>
      
      {authData ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Session Status</h2>
            <div className="p-4 rounded-md bg-card border">
              <div className="flex items-center mb-2">
                <div className={`w-3 h-3 rounded-full mr-2 ${authData.session?.session ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">
                  {authData.session?.session ? 'Authenticated' : 'Not Authenticated'}
                </span>
              </div>
              {authData.session?.session && (
                <div className="text-sm">
                  <p>User ID: {authData.session.session.user.id}</p>
                  <p>Email: {authData.session.session.user.email}</p>
                  <p>
                    Token expires:{' '}
                    {new Date(authData.session.session.expires_at * 1000).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Token Refresh</h2>
            <div className="p-4 rounded-md bg-card border">
              <div className="flex items-center mb-2">
                <div className={`w-3 h-3 rounded-full mr-2 ${authData.tokenRefreshResult.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium">
                  {authData.tokenRefreshResult.success ? 'Refresh Successful' : 'Refresh Failed'}
                </span>
              </div>
              {authData.tokenRefreshResult.error && (
                <div className="mt-2 p-2 bg-red-100 text-red-800 rounded-md text-sm">
                  {authData.tokenRefreshResult.error.message}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Local Storage Keys</h2>
            {authData.localStorageKeys.length > 0 ? (
              <div className="p-4 rounded-md bg-card border">
                <ul className="space-y-2 text-sm">
                  {authData.localStorageKeys.map((item: any, index: number) => (
                    <li key={index} className="border-b pb-2">
                      <div className="font-medium">{item.key}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.value}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No auth-related items in local storage</p>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Raw Debug Data</h2>
            {renderJsonTree(authData)}
          </div>
        </div>
      ) : (
        <p>Loading debug information...</p>
      )}
    </div>
  );
};

export default DebugAuth;