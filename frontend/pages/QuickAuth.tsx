import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';


export const QuickAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Check your email for the confirmation link');
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Signed in successfully');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Signed out successfully');
    }
  };

  const checkSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session) {
      setSuccess(`Logged in as: ${session.user.email}`);
    } else {
      setError('No active session');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '20px auto' }}>
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Quick Auth Test</h2>
        
        <div style={{ marginBottom: '10px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleSignUp} disabled={loading} style={{ padding: '8px 16px' }}>
            Sign Up
          </button>
          <button onClick={handleSignIn} disabled={loading} style={{ padding: '8px 16px' }}>
            Sign In
          </button>
          <button onClick={handleSignOut} style={{ padding: '8px 16px' }}>
            Sign Out
          </button>
          <button onClick={checkSession} style={{ padding: '8px 16px' }}>
            Check Session
          </button>
        </div>

        {error && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ color: 'green', marginTop: '10px' }}>
            {success}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickAuth;
