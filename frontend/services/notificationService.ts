
import { supabase } from "@/utils/supabase/client";
import { UserProfile } from "@/types/auth";
import { Notification } from "@/types/supabase";
import { toast } from "sonner";

// Function to get user notifications
export const getUserNotifications = async (
  user: UserProfile | null,
  limit: number = 10
): Promise<Notification[]> => {
  if (!user) return [];
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data as Notification[];
  } catch (error) {
    console.error("Error getting notifications:", error);
    return [];
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (
  user: UserProfile | null,
  notificationId: string
): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};

// Function to mark all notifications as read
export const markAllNotificationsAsRead = async (
  user: UserProfile | null
): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
};

// Function to create a new notification
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'watchlist' | 'research' | 'system' | 'alert',
  actionLink?: string,
  relatedId?: string
): Promise<Notification | null> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        action_link: actionLink,
        related_id: relatedId,
        is_read: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data as Notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

// Function to delete a notification
export const deleteNotification = async (
  user: UserProfile | null,
  notificationId: string
): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
};

// Function to create a collaborative action notification
export const createCollaborationNotification = async (
  userId: string,
  actionType: 'added' | 'updated' | 'removed',
  resourceType: 'watchlist' | 'note',
  resourceName: string,
  resourceId: string,
  performedByName: string
): Promise<void> => {
  const title = `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} ${actionType}`;
  const message = `${performedByName} ${actionType} you to the ${resourceType} "${resourceName}"`;
  const actionLink = resourceType === 'watchlist' 
    ? `/watchlist?id=${resourceId}` 
    : `/research?id=${resourceId}`;
  
  await createNotification(
    userId, 
    title, 
    message, 
    resourceType === 'watchlist' ? 'watchlist' : 'research',
    actionLink,
    resourceId
  );
};

// Function to show a new notification toast
export const showNotificationToast = (
  title: string,
  message: string,
  type: 'watchlist' | 'research' | 'system' | 'alert' = 'system'
) => {
  const icon = type === 'watchlist' 
    ? '📊' 
    : type === 'research' 
      ? '📝' 
      : type === 'alert' 
        ? '⚠️' 
        : 'ℹ️';
  
  toast(title, {
    description: message,
    icon,
  });
};

// Function to listen for real-time notifications
export const setupNotificationsListener = (
  user: UserProfile | null,
  callback: (notification: Notification) => void
) => {
  if (!user) return () => {};
  
  const channel = supabase
    .channel('notification-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        const newNotification = payload.new as Notification;
        callback(newNotification);
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};
