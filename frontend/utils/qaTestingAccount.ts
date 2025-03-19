
// QA Testing Account credentials and utility functions
// This file contains functions for testing purposes only
import { UserProfile } from "@/types/auth";
import { supabase } from "../utils/supabase/client";

export const QA_TESTING_CREDENTIALS = {
  email: "qa-tester@mizuchi.test",
  password: "TestingMizuchi123",
  fullName: "QA Tester"
};

// Debug session state storage key
export const SESSION_DEBUG_KEY = 'mizuchi_debug_session';

export const isQaTestingEnabled = (): boolean => {
  // Check if we're in development mode or if testing is explicitly enabled
  return import.meta.env.MODE === 'development' || import.meta.env.VITE_ENABLE_QA_TESTING === "true";
};

// Enhanced login function that saves session details in multiple places
export const loginWithTestAccount = async (signInFunction: (email: string, password: string) => Promise<any>) => {
  try {
    // Try using the signInFunction provided
    const result = await signInFunction(QA_TESTING_CREDENTIALS.email, QA_TESTING_CREDENTIALS.password);
    
    // Also try direct Supabase auth to ensure we have a session
    const { data, error } = await supabase.auth.signInWithPassword({
      email: QA_TESTING_CREDENTIALS.email,
      password: QA_TESTING_CREDENTIALS.password,
    });
    
    if (data?.session) {
      // Store session information in multiple locations
      storeDebugSession(data.session);
      return { success: true, session: data.session };
    }
    
    if (error) {
      console.error("Direct Supabase auth error:", error);
      return { success: false, error };
    }
    
    return { success: !!result, data: result };
  } catch (error) {
    console.error("Failed to login with test account:", error);
    return { success: false, error };
  }
};

// Function to store debug session info manually
export const storeDebugSession = (session: any) => {
  try {
    if (!session) return false;
    
    // Store a simplified version of the session in multiple storage mechanisms
    const sessionInfo = {
      id: session?.user?.id,
      email: session?.user?.email,
      created_at: new Date().toISOString(),
      access_token_prefix: session?.access_token?.substring(0, 10) + '...',
      expires_at: session?.expires_at,
      aud: session?.user?.aud,
    };
    
    // Store in localStorage
    localStorage.setItem(SESSION_DEBUG_KEY, JSON.stringify(sessionInfo));
    
    // Also store as a cookie for additional reliability
    document.cookie = `${SESSION_DEBUG_KEY}=${JSON.stringify(sessionInfo)}; path=/; max-age=86400`;
    
    console.log('Debug session stored successfully', sessionInfo);
    return true;
  } catch (error) {
    console.error('Failed to store debug session:', error);
    return false;
  }
};

// Function to get the stored debug session
export const getDebugSession = () => {
  try {
    // Try localStorage first
    const localData = localStorage.getItem(SESSION_DEBUG_KEY);
    if (localData) {
      return JSON.parse(localData);
    }
    
    // Try to get from cookie if localStorage failed
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(SESSION_DEBUG_KEY))
      ?.split('=')[1];
      
    if (cookieValue) {
      return JSON.parse(decodeURIComponent(cookieValue));
    }
    
    return null;
  } catch (error) {
    console.error('Failed to retrieve debug session:', error);
    return null;
  }
};

// Function to clear all debug session data
export const clearDebugSession = () => {
  try {
    localStorage.removeItem(SESSION_DEBUG_KEY);
    document.cookie = `${SESSION_DEBUG_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    return true;
  } catch (error) {
    console.error('Failed to clear debug session:', error);
    return false;
  }
};
