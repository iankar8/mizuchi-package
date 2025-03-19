
import { supabase } from "@/utils/supabase/client";
import { UserProfile } from "@/types/auth";
import { UserPreference } from "@/types/supabase";

// Function to save a user preference
export const saveUserPreference = async (
  user: UserProfile | null, 
  preferenceType: 'stock' | 'sector' | 'tag' | 'search_query',
  preferenceValue: string
): Promise<UserPreference | null> => {
  if (!user) return null;
  
  try {
    // Check if preference already exists
    const { data: existingPreference, error: existingError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('preference_type', preferenceType)
      .eq('preference_value', preferenceValue)
      .single();
    
    if (!existingError && existingPreference) {
      // Preference already exists, no need to create it again
      return {
        id: existingPreference.id,
        user_id: existingPreference.user_id,
        preference_type: existingPreference.preference_type as 'stock' | 'sector' | 'tag' | 'search_query',
        preference_value: existingPreference.preference_value,
        created_at: existingPreference.created_at,
      };
    }
    
    // Insert new preference
    const { data: newPreference, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: user.id,
        preference_type: preferenceType,
        preference_value: preferenceValue,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return newPreference ? {
      id: newPreference.id,
      user_id: newPreference.user_id,
      preference_type: newPreference.preference_type as 'stock' | 'sector' | 'tag' | 'search_query',
      preference_value: newPreference.preference_value,
      created_at: newPreference.created_at,
    } : null;
  } catch (error) {
    console.error("Error saving user preference:", error);
    return null;
  }
};

// Function to get all user preferences
export const getUserPreferences = async (user: UserProfile | null): Promise<UserPreference[]> => {
  if (!user) return [];
  
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(pref => ({
      id: pref.id,
      user_id: pref.user_id,
      preference_type: pref.preference_type as 'stock' | 'sector' | 'tag' | 'search_query',
      preference_value: pref.preference_value,
      created_at: pref.created_at,
    }));
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return [];
  }
};

// Function to remove a user preference
export const removeUserPreference = async (
  user: UserProfile | null, 
  preferenceId: string
): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('id', preferenceId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error removing user preference:", error);
    return false;
  }
};

// Function to save a search query as a preference (to remember past searches)
export const saveSearchQuery = async (
  user: UserProfile | null,
  query: string
): Promise<void> => {
  if (user && query.trim()) {
    await saveUserPreference(user, 'search_query', query.trim());
  }
};

// Function to get recent search queries
export const getRecentSearchQueries = async (
  user: UserProfile | null,
  limit: number = 5
): Promise<string[]> => {
  if (!user) return [];
  
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preference_value')
      .eq('user_id', user.id)
      .eq('preference_type', 'search_query')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data.map(item => item.preference_value);
  } catch (error) {
    console.error("Error getting recent search queries:", error);
    return [];
  }
};
