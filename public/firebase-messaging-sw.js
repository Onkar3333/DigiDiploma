// Firebase Cloud Messaging Service Worker
// This file must be in the public directory and served with correct MIME type

// Import Firebase scripts (using compat version for service workers)
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  projectId: 'digidiploma-f106d',
  apiKey: 'AIzaSyA7lUPH9-kMz3NVgS5VKVJSM3CjMuU4Kjc',
  authDomain: 'digidiploma-f106d.firebaseapp.com',
  storageBucket: 'digidiploma-f106d.firebasestorage.app',
  messagingSenderId: '802660843445',
  appId: '1:802660843445:web:8147404bfcefada57be3fc',
  measurementId: 'G-L644P3CG8L'
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Optional: Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'DigiDiploma';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icons/android-chrome-192x192.png',
    badge: '/icons/android-chrome-192x192.png',
    data: payload.data,
    tag: 'digidiploma-notification',
    requireInteraction: false,
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/favicon-32x32.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/favicon-32x32.png'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // If a window is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

