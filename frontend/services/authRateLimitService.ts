import { supabase } from "@/utils/supabase/client";

/**
 * Generate a simple browser fingerprint
 * This creates a pseudonymous identifier for rate limiting when IP detection fails
 * Note: This is not meant to be a full fingerprinting solution, just a basic fallback
 */
async function generateBrowserFingerprint(): Promise<string> {
  // Collect various browser properties
  const screenProps = `${window.screen.height}x${window.screen.width}x${window.screen.colorDepth}`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const platform = navigator.platform;
  const userAgent = navigator.userAgent;
  
  // Combine the properties and hash them
  const rawFingerprint = `${screenProps}|${timeZone}|${language}|${platform}|${userAgent}`;
  
  // Use a simple hash function
  let hash = 0;
  for (let i = 0; i < rawFingerprint.length; i++) {
    const char = rawFingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to a hex string
  return Math.abs(hash).toString(16);
}

export interface RateLimitResponse {
  allowed: boolean;
  remaining_seconds: number;
  attempts: number;
  lockout_time_minutes: number;
}

/**
 * Service to handle authentication rate limiting
 */
const authRateLimitService = {
  /**
   * Check if an authentication attempt is allowed for the given email and IP
   * @param email The email address to check
   * @param ipAddress The IP address to check
   * @returns A promise that resolves to a RateLimitResponse object
   */
  checkRateLimit: async (email: string, ipAddress: string): Promise<RateLimitResponse> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-rate-limit/check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            ip_address: ipAddress,
            user_agent: navigator.userAgent,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check rate limit");
      }

      const data = await response.json();
      return data as RateLimitResponse;
    } catch (error) {
      console.error("Rate limit check error:", error);
      // Default to allowing the request if the rate limit check fails
      return {
        allowed: true,
        remaining_seconds: 0,
        attempts: 0,
        lockout_time_minutes: 0,
      };
    }
  },

  /**
   * Record an authentication attempt for the given email and IP
   * @param email The email address used in the attempt
   * @param ipAddress The IP address making the attempt
   * @param success Whether the authentication attempt was successful
   */
  recordAttempt: async (email: string, ipAddress: string, success: boolean): Promise<void> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-rate-limit/record`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            ip_address: ipAddress,
            success,
            user_agent: navigator.userAgent,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to record attempt");
      }
    } catch (error) {
      console.error("Record attempt error:", error);
      // Just log the error and continue; we don't want to block the user flow
      // if recording the attempt fails
    }
  },

  /**
   * Get the client IP address from Supabase Edge Functions
   * Uses Supabase Edge Function to get the real client IP address
   * Falls back to client-side detection if the Edge Function fails
   */
  getClientIP: async (): Promise<string> => {
    try {
      // First attempt: Call the IP detection Edge Function
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-client-ip`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.ip) {
            return data.ip;
          }
        }
      } catch (edgeFunctionError) {
        console.warn("Edge function IP detection failed:", edgeFunctionError);
        // Continue to fallback
      }
      
      // Second attempt: Try to get IP from a public API (CORS-friendly)
      try {
        // Use a CORS-enabled public IP service
        const publicResponse = await fetch('https://api.ipify.org?format=json');
        if (publicResponse.ok) {
          const publicData = await publicResponse.json();
          if (publicData.ip) {
            return publicData.ip;
          }
        }
      } catch (publicApiError) {
        console.warn("Public IP API detection failed:", publicApiError);
        // Continue to next fallback
      }
      
      // Final fallback: Generate a browser fingerprint as a pseudonymous identifier
      const fingerprint = await generateBrowserFingerprint();
      return `browser-${fingerprint}`;
    } catch (error) {
      console.error("All IP detection methods failed:", error);
      return "unknown-client";
    }
  },
};

export default authRateLimitService;