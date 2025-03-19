import { supabase } from "@/utils/supabase/client";
import { Database } from "@/types/supabase";

type Tables = Database['public']['Tables'];
type BetaUserRow = Tables['beta_users']['Row'];
type BetaUserInsert = Tables['beta_users']['Insert'];
type BetaUserUpdate = Tables['beta_users']['Update'];
type BetaFeedbackRow = Tables['beta_feedback']['Row'];
type BetaFeedbackInsert = Tables['beta_feedback']['Insert'];

// Types for beta user management
export interface BetaUser {
  id: string;
  email: string;
  name: string;
  inviteCode: string;
  status: 'invited' | 'registered' | 'active';
  invitedAt: string;
  registeredAt?: string;
  lastActiveAt?: string;
  tradingExperience?: string;
  tradingFrequency?: string;
  preferredAssets?: string[];
  feedbackProvided?: boolean;
}

export interface BetaInvite {
  email: string;
  name: string;
  inviteCode: string;
}

export interface BetaFeedback {
  userId: string;
  rating: number;
  feedback: string;
  category: string;
  createdAt: string;
}

// Service for managing beta users
const betaUserService = {
  // Get all beta users (admin only) with pagination
  getAllBetaUsers: async (page: number = 1, pageSize: number = 20): Promise<{
    users: BetaUser[];
    count: number;
  }> => {
    try {
      // Calculate range start and end for pagination
      const rangeStart = (page - 1) * pageSize;
      const rangeEnd = rangeStart + pageSize - 1;
      
      // First get the total count
      const { count, error: countError } = await supabase
        .from('beta_users')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      // Then get the paginated data
      const { data, error } = await supabase
        .from('beta_users')
        .select('*')
        .order('invited_at', { ascending: false })
        .range(rangeStart, rangeEnd);
      
      if (error) throw error;
      
      // Map from snake_case DB fields to camelCase for our interface
      const users = (data || []).map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        inviteCode: user.invite_code,
        status: user.status as 'invited' | 'registered' | 'active',
        invitedAt: user.invited_at,
        registeredAt: user.registered_at,
        lastActiveAt: user.last_active_at,
        tradingExperience: user.trading_experience,
        tradingFrequency: user.trading_frequency,
        preferredAssets: user.preferred_assets,
        feedbackProvided: user.feedback_provided
      }));
      
      return {
        users,
        count: count || 0
      };
    } catch (error) {
      console.error("Error fetching beta users:", error);
      return {
        users: [],
        count: 0
      };
    }
  },
  
  // Get beta user by ID
  getBetaUserById: async (userId: string): Promise<BetaUser | null> => {
    try {
      const { data, error } = await supabase
        .from('beta_users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      // Map from snake_case DB fields to camelCase for our interface
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        inviteCode: data.invite_code,
        status: data.status as 'invited' | 'registered' | 'active',
        invitedAt: data.invited_at,
        registeredAt: data.registered_at,
        lastActiveAt: data.last_active_at,
        tradingExperience: data.trading_experience,
        tradingFrequency: data.trading_frequency,
        preferredAssets: data.preferred_assets,
        feedbackProvided: data.feedback_provided
      };
    } catch (error) {
      console.error("Error fetching beta user:", error);
      return null;
    }
  },
  
  // Get beta user by email
  getBetaUserByEmail: async (email: string): Promise<BetaUser | null> => {
    try {
      const { data, error } = await supabase
        .from('beta_users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      // Map from snake_case DB fields to camelCase for our interface
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        inviteCode: data.invite_code,
        status: data.status as 'invited' | 'registered' | 'active',
        invitedAt: data.invited_at,
        registeredAt: data.registered_at,
        lastActiveAt: data.last_active_at,
        tradingExperience: data.trading_experience,
        tradingFrequency: data.trading_frequency,
        preferredAssets: data.preferred_assets,
        feedbackProvided: data.feedback_provided
      };
    } catch (error) {
      console.error("Error fetching beta user by email:", error);
      return null;
    }
  },
  
  // Get beta user by invite code
  getBetaUserByInviteCode: async (inviteCode: string): Promise<BetaUser | null> => {
    try {
      const { data, error } = await supabase
        .from('beta_users')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      // Map from snake_case DB fields to camelCase for our interface
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        inviteCode: data.invite_code,
        status: data.status as 'invited' | 'registered' | 'active',
        invitedAt: data.invited_at,
        registeredAt: data.registered_at,
        lastActiveAt: data.last_active_at,
        tradingExperience: data.trading_experience,
        tradingFrequency: data.trading_frequency,
        preferredAssets: data.preferred_assets,
        feedbackProvided: data.feedback_provided
      };
    } catch (error) {
      console.error("Error fetching beta user by invite code:", error);
      return null;
    }
  },
  
  // Create a new beta invite
  createBetaInvite: async (invite: BetaInvite): Promise<BetaUser | null> => {
    try {
      // First check if the user already exists
      const existingUser = await betaUserService.getBetaUserByEmail(invite.email);
      if (existingUser) {
        return existingUser;
      }
      
      // Create a new beta user
      const newUser = {
        email: invite.email,
        name: invite.name,
        invite_code: invite.inviteCode,
        status: 'invited',
        invited_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('beta_users')
        .insert(newUser)
        .select()
        .single();
      
      if (error) throw error;
      
      // Convert from snake_case DB fields to camelCase for our interface
      const betaUser: BetaUser = {
        id: data.id,
        email: data.email,
        name: data.name,
        inviteCode: data.invite_code,
        status: data.status as 'invited' | 'registered' | 'active',
        invitedAt: data.invited_at,
        registeredAt: data.registered_at,
        lastActiveAt: data.last_active_at,
        tradingExperience: data.trading_experience,
        tradingFrequency: data.trading_frequency,
        preferredAssets: data.preferred_assets,
        feedbackProvided: data.feedback_provided
      };
      
      return betaUser;
    } catch (error) {
      console.error("Error creating beta invite:", error);
      return null;
    }
  },
  
  // Update beta user status
  updateBetaUserStatus: async (userId: string, status: 'invited' | 'registered' | 'active'): Promise<boolean> => {
    try {
      const updates: {
        status: string;
        registered_at?: string;
        last_active_at?: string;
      } = { status };
      
      // Add timestamp based on the status
      if (status === 'registered') {
        updates.registered_at = new Date().toISOString();
      } else if (status === 'active') {
        updates.last_active_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('beta_users')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error updating beta user status:", error);
      return false;
    }
  },
  
  // Update beta user profile
  updateBetaUserProfile: async (userId: string, profile: Partial<BetaUser>): Promise<boolean> => {
    try {
      // Convert from camelCase to snake_case for DB
      const dbProfile: {
        trading_experience?: string;
        trading_frequency?: string;
        preferred_assets?: string[];
        status?: string;
        last_active_at?: string;
        registered_at?: string;
        feedback_provided?: boolean;
      } = {};
      
      if (profile.tradingExperience) dbProfile.trading_experience = profile.tradingExperience;
      if (profile.tradingFrequency) dbProfile.trading_frequency = profile.tradingFrequency;
      if (profile.preferredAssets) dbProfile.preferred_assets = profile.preferredAssets;
      if (profile.status) dbProfile.status = profile.status;
      if (profile.lastActiveAt) dbProfile.last_active_at = profile.lastActiveAt;
      if (profile.registeredAt) dbProfile.registered_at = profile.registeredAt;
      
      const { error } = await supabase
        .from('beta_users')
        .update(dbProfile)
        .eq('id', userId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error("Error updating beta user profile:", error);
      return false;
    }
  },
  
  // Submit beta feedback
  submitBetaFeedback: async (feedback: Omit<BetaFeedback, 'createdAt'>): Promise<boolean> => {
    try {
      // Convert to snake_case for DB
      const dbFeedback = {
        user_id: feedback.userId,
        rating: feedback.rating,
        feedback: feedback.feedback,
        category: feedback.category,
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('beta_feedback')
        .insert(dbFeedback);
      
      if (error) throw error;
      
      // Update the user's feedback status
      await supabase
        .from('beta_users')
        .update({ feedback_provided: true })
        .eq('id', feedback.userId);
      
      return true;
    } catch (error) {
      console.error("Error submitting beta feedback:", error);
      return false;
    }
  },
  
  // Get all feedback (admin only) with pagination
  getAllFeedback: async (page: number = 1, pageSize: number = 20): Promise<{
    feedback: BetaFeedback[];
    count: number;
  }> => {
    try {
      // Calculate range start and end for pagination
      const rangeStart = (page - 1) * pageSize;
      const rangeEnd = rangeStart + pageSize - 1;
      
      // First get the total count
      const { count, error: countError } = await supabase
        .from('beta_feedback')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      // Then get the paginated data
      const { data, error } = await supabase
        .from('beta_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .range(rangeStart, rangeEnd);
      
      if (error) throw error;
      
      // Convert from snake_case to camelCase
      const feedbackItems = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        rating: item.rating,
        feedback: item.feedback,
        category: item.category,
        createdAt: item.created_at
      })) as BetaFeedback[];
      
      return {
        feedback: feedbackItems,
        count: count || 0
      };
    } catch (error) {
      console.error("Error fetching beta feedback:", error);
      return {
        feedback: [],
        count: 0
      };
    }
  },
  
  // Get feedback by user ID
  getFeedbackByUserId: async (userId: string): Promise<BetaFeedback[]> => {
    try {
      const { data, error } = await supabase
        .from('beta_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Convert from snake_case to camelCase
      const feedback = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        rating: item.rating,
        feedback: item.feedback,
        category: item.category,
        createdAt: item.created_at
      }));
      
      return feedback;
    } catch (error) {
      console.error("Error fetching user feedback:", error);
      return [];
    }
  },
  
  // Generate a unique invite code with verification
  generateInviteCode: async (): Promise<string> => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let attempts = 0;
    const maxAttempts = 5;
    
    // Try up to 5 times to generate a unique code
    while (attempts < maxAttempts) {
      attempts++;
      
      // Generate a code
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if the code already exists
      const { count } = await supabase
        .from('beta_users')
        .select('*', { count: 'exact', head: true })
        .eq('invite_code', result);
      
      // If no matches found, this code is unique
      if (count === 0) {
        return result;
      }
    }
    
    // If we've exhausted attempts, add a timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36).toUpperCase();
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return `${result}${timestamp.slice(-3)}`;
  },
  
  // Create multiple invites at once (bulk operation)
  createBulkInvites: async (invites: Array<{name: string, email: string}>): Promise<{
    success: number;
    failed: number;
    invites: BetaUser[];
  }> => {
    try {
      const results = {
        success: 0,
        failed: 0,
        invites: [] as BetaUser[]
      };
      
      // Process each invite sequentially to ensure unique invite codes
      for (const invite of invites) {
        try {
          // Check if user already exists
          const existingUser = await betaUserService.getBetaUserByEmail(invite.email);
          if (existingUser) {
            results.invites.push(existingUser);
            results.success++;
            continue;
          }
          
          // Generate a unique invite code
          const inviteCode = await betaUserService.generateInviteCode();
          
          // Create the invite
          const newUser = await betaUserService.createBetaInvite({
            email: invite.email,
            name: invite.name,
            inviteCode
          });
          
          if (newUser) {
            results.invites.push(newUser);
            results.success++;
          } else {
            results.failed++;
          }
        } catch (error) {
          console.error(`Error creating invite for ${invite.email}:`, error);
          results.failed++;
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error creating bulk invites:", error);
      return {
        success: 0,
        failed: invites.length,
        invites: []
      };
    }
  }
};

export default betaUserService;
