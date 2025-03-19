import { useState, useEffect } from 'react';
import { supabase, getAuthStatus, testSupabaseConnection, clearSupabaseStorage } from '../utils/supabase/client';

export default function DirectSupabaseAuth() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [status, setStatus] = useState<any>({});
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);

  // Initialize on component mount
  useEffect(() => {    
    // Get storage keys
    refreshStorageKeys();
    
    // Check for existing session
    checkExistingSession();
    
    // Run diagnostics
    runDiagnostics();
  }, []);
  
  const refreshStorageKeys = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    setStorageKeys(keys);
  };

  const runDiagnostics = async () => {
    try {
      const results = await testSupabaseConnection();
      setDiagnosticsResult(results);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    }
  };

  const checkExistingSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (data?.session) {
        setSessionInfo({
          user: data.session.user,
          expiresAt: new Date(data.session.expires_at! * 1000).toLocaleString(),
          accessToken: `${data.session.access_token.substring(0, 15)}...`,
        });
      } else {
        setSessionInfo(null);
      }
      setStatus({ check: { success: !!data?.session, error } });
    } catch (error) {
      setStatus({ check: { success: false, error } });
    }
  };

  const handleSignUp = async () => {
    try {
      setStatus({ message: 'Signing up...' });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      refreshStorageKeys();
      if (error) throw error;
      
      setStatus({
        signup: { 
          success: true, 
          message: data?.user?.email_confirmed_at 
            ? 'Signup complete' 
            : 'Confirmation email sent',
          data
        }
      });
      
      // Check for session after signup
      checkExistingSession();
      runDiagnostics();
    } catch (error) {
      setStatus({ signup: { success: false, error } });
    }
  };

  const handleSignIn = async () => {
    try {
      setStatus({ message: 'Signing in...' });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      refreshStorageKeys();
      if (error) throw error;
      
      setSessionInfo({
        user: data.user,
        expiresAt: new Date(data.session.expires_at * 1000).toLocaleString(),
        accessToken: `${data.session.access_token.substring(0, 15)}...`,
      });
      
      setStatus({ signin: { success: true, data } });
      runDiagnostics();
    } catch (error) {
      console.error('Sign-in error:', error);
      setStatus({ signin: { success: false, error } });
    }
  };

  const handleSignOut = async () => {
    try {
      setStatus({ message: 'Signing out...' });
      const { error } = await supabase.auth.signOut();
      
      refreshStorageKeys();
      if (error) throw error;
      
      setSessionInfo(null);
      setStatus({ signout: { success: true } });
      runDiagnostics();
    } catch (error) {
      setStatus({ signout: { success: false, error } });
    }
  };

  const handleClearStorage = () => {
    try {
      // Use the utility function from our client
      clearSupabaseStorage();
      
      refreshStorageKeys();
      setSessionInfo(null);
      setStatus({ clear: { success: true } });
      checkExistingSession();
      runDiagnostics();
    } catch (error) {
      setStatus({ clear: { success: false, error } });
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Direct Supabase Auth Test</h1>
      <p>This page bypasses the application's Supabase client to test authentication directly.</p>
      
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Session Status</h2>
        {sessionInfo ? (
          <div>
            <div style={{ color: 'green', fontWeight: 'bold' }}>✓ Authenticated</div>
            <div>User ID: {sessionInfo.user.id}</div>
            <div>Email: {sessionInfo.user.email}</div>
            <div>Expires: {sessionInfo.expiresAt}</div>
            <div>Token: {sessionInfo.accessToken}</div>
          </div>
        ) : (
          <div style={{ color: 'red' }}>✗ Not authenticated</div>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <h2>Auth Actions</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>Email: </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Password: </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSignUp}
              style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Sign Up
            </button>
            <button
              onClick={handleSignIn}
              style={{ flex: 1, padding: '10px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Sign In
            </button>
            <button
              onClick={handleSignOut}
              style={{ flex: 1, padding: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <h2>Storage</h2>
          <div style={{ marginBottom: '10px' }}>
            <button
              onClick={handleClearStorage}
              style={{ padding: '10px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
            >
              Clear Supabase Storage
            </button>
          </div>
          <div style={{ height: '200px', overflow: 'auto', border: '1px solid #ccc', padding: '10px', fontSize: '12px' }}>
            <h3>localStorage Keys ({storageKeys.length})</h3>
            <ul>
              {storageKeys.map((key) => (
                <li key={key}>
                  <span style={{ fontWeight: 'bold' }}>{key}</span>: 
                  <span>{localStorage.getItem(key)?.substring(0, 50)}...</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
        <h2>Last Action Status</h2>
        <pre>{JSON.stringify(status, null, 2)}</pre>
      </div>
      
      {diagnosticsResult && (
        <div style={{ marginTop: '20px', backgroundColor: '#e8f4fe', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
          <h2>Supabase Diagnostics</h2>
          <pre>{JSON.stringify(diagnosticsResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
