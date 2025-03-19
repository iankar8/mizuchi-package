
import { useState, useEffect } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/auth";
import { Notification } from "@/types/supabase";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  setupNotificationsListener,
} from "@/services/notificationService";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const NotificationCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  const loadNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await getUserNotifications(user);
    setNotifications(data);
    setUnreadCount(data.filter(n => !n.is_read).length);
    setIsLoading(false);
  };

  // Mark notification as read
  const handleMarkAsRead = async (id: string) => {
    if (await markNotificationAsRead(user, id)) {
      setNotifications(
        notifications.map(n => 
          n.id === id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (await markAllNotificationsAsRead(user)) {
      setNotifications(
        notifications.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      toast({
        title: "Notifications",
        description: "All notifications marked as read",
      });
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    if (await deleteNotification(user, id)) {
      const updatedNotifications = notifications.filter(n => n.id !== id);
      setNotifications(updatedNotifications);
      
      // Update unread count if necessary
      const deletedNotification = notifications.find(n => n.id === id);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  // Set up real-time listener for new notifications
  useEffect(() => {
    if (!user) return;
    
    // Load initial notifications
    loadNotifications();
    
    // Set up real-time listener
    const unsubscribe = setupNotificationsListener(user, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast for new notification
      toast({
        title: newNotification.title,
        description: newNotification.message,
      });
    });
    
    return () => {
      unsubscribe();
    };
  }, [user, toast]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'watchlist':
        return <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">📊</div>;
      // Research feature removed from MVP
      // case 'research':
      //   return <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">📝</div>;
      case 'alert':
        return <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">⚠️</div>;
      case 'system':
      default:
        return <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">ℹ️</div>;
    }
  };

  // Format notification time
  const formatNotificationTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diffInDays < 1) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (diffInDays < 7) {
      return format(date, 'EEEE');
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
          <Bell size={20} className="text-foreground/70" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 max-h-[70vh] p-0 overflow-hidden" 
        align="end" 
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check size={12} />
              Mark all as read
            </button>
          )}
        </div>
        
        <div className="max-h-[calc(70vh-48px)] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center p-4 h-20">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 h-32 text-center">
              <Bell size={24} className="text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You'll see updates and alerts here
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 border-b border-border hover:bg-secondary/50 transition-colors",
                    !notification.is_read && "bg-primary/5"
                  )}
                >
                  <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    {notification.action_link ? (
                      <Link 
                        to={notification.action_link}
                        onClick={() => {
                          setOpen(false);
                          if (!notification.is_read) {
                            handleMarkAsRead(notification.id);
                          }
                        }}
                      >
                        <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                      </Link>
                    ) : (
                      <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {formatNotificationTime(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!notification.is_read && (
                      <button 
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1 rounded-full hover:bg-secondary"
                        title="Mark as read"
                      >
                        <Check size={14} className="text-primary" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(notification.id)}
                      className="p-1 rounded-full hover:bg-secondary"
                      title="Delete"
                    >
                      <Trash2 size={14} className="text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
