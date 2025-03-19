
import { UserProfile, Session } from "@/types/auth";
import { supabase } from "@/utils/supabase/client";

// Auth bypass functionality has been removed for security

// Function to fetch a user's profile from Supabase
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    // Get the user session to check for email verification
    // Use the existing session data rather than making a duplicate call
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting user session:', sessionError);
      // Try to refresh the session
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Failed to refresh session:', refreshError);
        } else {
          console.log('Session refreshed successfully');
        }
      } catch (refreshError) {
        console.error('Error refreshing session:', refreshError);
      }
    }
    
    // Get email verification status
    const isEmailVerified = sessionData?.session?.user?.email_confirmed_at ? true : false;
    
    // Get the profile data with retry logic
    let profileData = null;
    let profileError = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!error) {
          profileData = data;
          break;
        }
        
        profileError = error;
        
        // If it's a permissions error, try to refresh the token
        if (error.code === 'PGRST301') {
          console.warn('Permission denied when fetching profile, attempting token refresh...');
          await supabase.auth.refreshSession();
        }
        
        retryCount++;
        if (retryCount <= maxRetries) {
          // Add small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`Retrying profile fetch (attempt ${retryCount})...`);
        }
      } catch (error) {
        profileError = error;
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (profileError) {
      console.error('Error fetching user profile after retries:', profileError);
    }
    
    if (!profileData) {
      console.warn('No profile data found for user:', userId);
      return null;
    }
    
    // Check if we need to create missing fields in the profile
    const needsUpdate = !profileData.email || !profileData.full_name;
    
    // If the profile is missing essential data and we have session data, update it
    if (needsUpdate && sessionData?.session?.user) {
      const updateData: any = {};
      
      if (!profileData.email && sessionData.session.user.email) {
        updateData.email = sessionData.session.user.email;
      }
      
      if (!profileData.full_name && sessionData.session.user.user_metadata?.full_name) {
        updateData.full_name = sessionData.session.user.user_metadata.full_name;
      }
      
      if (Object.keys(updateData).length > 0) {
        try {
          console.log('Updating incomplete profile with session data:', updateData);
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);
            
          if (updateError) {
            console.error('Error updating profile with session data:', updateError);
          } else {
            // Update local data with the changes
            profileData = { ...profileData, ...updateData };
          }
        } catch (updateError) {
          console.error('Exception updating profile:', updateError);
        }
      }
    }
    
    return {
      id: profileData.id,
      email: profileData.email || sessionData?.session?.user?.email || 'Unknown',
      full_name: profileData.full_name || 'User',
      avatar_url: profileData.avatar_url,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
      role: profileData.role || 'user',
      email_verified: isEmailVerified
    };
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
};

// Mock session and user profile functionality has been removed for security

// Create a new user profile in the profiles table with multiple strategies
export const createUserProfile = async (userId: string, email: string, fullName: string): Promise<void> => {
  console.log(`Attempting to create profile for user: ${userId}`);
  let lastError = null;
  let profileCreated = false;
  
  // Strategy 1: Try using upsert with the profiles table
  try {
    console.log("Strategy 1: Using upsert on profiles table");
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (!error) {
      console.log("Profile created successfully via upsert");
      profileCreated = true;
      return;
    }
    
    console.warn("Strategy 1 failed:", error);
    lastError = error;
  } catch (error) {
    console.warn("Strategy 1 exception:", error);
    lastError = error;
  }
  
  // If first strategy failed, try using RPC with a security definer function
  if (!profileCreated) {
    try {
      console.log("Strategy 2: Using insert_profile_for_auth_id RPC function");
      const { data, error } = await supabase.rpc('insert_profile_for_auth_id', {
        auth_id: userId,
        p_email: email,
        p_full_name: fullName
      });
      
      if (!error) {
        console.log("Profile created successfully via RPC");
        profileCreated = true;
        return;
      }
      
      console.warn("Strategy 2 failed:", error);
      lastError = error;
    } catch (error) {
      console.warn("Strategy 2 exception:", error);
      lastError = error;
    }
  }
  
  // If both strategies failed, try a direct insert as a last resort
  if (!profileCreated) {
    try {
      console.log("Strategy 3: Using direct insert");
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (!error) {
        console.log("Profile created successfully via insert");
        profileCreated = true;
        return;
      }
      
      console.warn("Strategy 3 failed:", error);
      lastError = error;
    } catch (error) {
      console.warn("Strategy 3 exception:", error);
      lastError = error;
    }
  }
  
  // After all strategies, check if we succeeded or need to throw an error
  if (!profileCreated) {
    console.error("Failed to create user profile after all strategies:", lastError);
    throw lastError || new Error("Failed to create user profile after multiple attempts");
  }
};
