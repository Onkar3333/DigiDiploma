import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fcmService } from '@/lib/fcm';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: any;
}

const NotificationHandler: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dd_notifications_dismissed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }

    // Initialize FCM if user is authenticated
    if (isAuthenticated && user) {
      initializeFCM();
    }
  }, [isAuthenticated, user]);

  const initializeFCM = async () => {
    try {
      // Request permission and get token
      const token = await fcmService.requestPermission();
      
      if (token) {
        // Listen for foreground messages
        fcmService.onMessage((payload) => {
          handleForegroundMessage(payload);
        });
        
        // Note: Topic subscriptions are handled server-side when needed
        // Removed automatic topic subscriptions to prevent errors
      }
      // If no token (VAPID not configured), push notifications are disabled
      // App will work fine without them - this is an optional feature
    } catch (error) {
      // Silent fail - push notifications are optional
      // Only log in development
      if (import.meta.env.DEV) {
        console.warn('Push notifications not available:', error);
      }
    }
  };

  const handleForegroundMessage = (payload: any) => {
    const notification: NotificationData = {
      title: payload.notification?.title || 'DigiDiploma',
      body: payload.notification?.body || 'You have a new notification',
      icon: payload.notification?.icon || '/favicon.ico',
      url: payload.data?.url,
      data: payload.data
    };

    // Show toast notification
    toast(notification.title, {
      description: notification.body,
      action: notification.url ? {
        label: 'View',
        onClick: () => window.open(notification.url, '_blank')
      } : undefined,
      duration: 5000,
    });

    // Show browser notification if permission is granted
    if (permission === 'granted') {
      showBrowserNotification(notification);
    }
  };

  const showBrowserNotification = (notification: NotificationData) => {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      const browserNotification = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        tag: 'digidiploma-notification',
        requireInteraction: false,
        silent: false
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.url) {
          window.open(notification.url, '_blank');
        }
        browserNotification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  };

  const requestNotificationPermission = async () => {
    if (!isSupported) {
      toast.error('Notifications are not supported in this browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        toast.success('Notification permission granted!');
        await initializeFCM();
      } else {
        toast.error('Notification permission denied');
        setDismissed(true);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
    }
  };

  useEffect(() => {
    try {
      if (dismissed) localStorage.setItem('dd_notifications_dismissed', '1');
      else localStorage.removeItem('dd_notifications_dismissed');
    } catch {}
  }, [dismissed]);

  // Don't show when unsupported, not authenticated, already granted, or user dismissed
  if (!isSupported || !isAuthenticated || permission === 'granted' || dismissed) {
    return null;
  }

  // Show permission request banner
  return (
      <div className="fixed top-4 right-4 z-[100] max-w-sm pointer-events-auto">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm">Enable Notifications</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Get instant updates about new materials, quizzes, and offers
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={requestNotificationPermission}
                    className="h-8 text-xs"
                  >
                    Enable
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDismissed(true)}
                    className="h-8 text-xs"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
};

export default NotificationHandler;
