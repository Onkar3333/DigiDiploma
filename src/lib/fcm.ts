import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

// Firebase configuration for FCM (DigiDiploma project)
// Use environment variables if available, otherwise use default config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA7lUPH9-kMz3NVgS5VKVJSM3CjMuU4Kjc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'digidiploma-f106d.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'digidiploma-f106d',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'digidiploma-f106d.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '802660843445',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:802660843445:web:8147404bfcefada57be3fc',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-L644P3CG8L'
};

// Initialize Firebase app for FCM
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// VAPID key for FCM - Get this from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
// If no key exists, click "Generate key pair" to create one
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export class FCMService {
  private static instance: FCMService;
  private token: string | null = null;

  private constructor() {}

  public static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  // Request notification permission and get FCM token
  public async requestPermission(): Promise<string | null> {
    try {
      // Check if VAPID key is configured
      if (!VAPID_KEY || VAPID_KEY === '') {
        // Silent fail - push notifications are optional feature
        console.warn('ℹ️ Push notifications disabled: VAPID key not configured (optional feature)');
        return null;
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        
        // Get FCM token
        this.token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });
        
        if (this.token) {
          console.log('FCM Token:', this.token);
          // Send token to backend for storage
          await this.sendTokenToServer(this.token);
          return this.token;
        } else {
          console.log('No registration token available.');
          return null;
        }
      } else {
        console.log('Unable to get permission to notify.');
        return null;
      }
    } catch (error) {
      console.error('An error occurred while retrieving token:', error);
      return null;
    }
  }

  // Send FCM token to backend
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error('Failed to register FCM token');
      }

      console.log('FCM token registered successfully');
    } catch (error) {
      console.error('Error registering FCM token:', error);
    }
  }

  // Listen for foreground messages
  public onMessage(callback: (payload: any) => void): void {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      callback(payload);
    });
  }

  // Get current token
  public getToken(): string | null {
    return this.token;
  }

  // Subscribe to topic (silently fails to prevent errors)
  public async subscribeToTopic(topic: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Silently fail if not authenticated
        return false;
      }

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic })
      });

      if (!response.ok) {
        // Silently fail - don't log errors for topic subscriptions
        return false;
      }

      return true;
    } catch (error) {
      // Silently fail - topic subscriptions are optional
      return false;
    }
  }

  // Unsubscribe from topic (silently fails to prevent errors)
  public async unsubscribeFromTopic(topic: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Silently fail if not authenticated
        return false;
      }

      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic })
      });

      if (!response.ok) {
        // Silently fail - don't log errors for topic unsubscriptions
        return false;
      }

      return true;
    } catch (error) {
      // Silently fail - topic unsubscriptions are optional
      return false;
    }
  }
}

// Export singleton instance
export const fcmService = FCMService.getInstance();
