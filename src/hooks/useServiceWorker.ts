import { useEffect, useState } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdated: boolean;
  registration: ServiceWorkerRegistration | null;
}

export const useServiceWorker = () => {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isUpdated: false,
    registration: null
  });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setSwState(prev => ({ ...prev, isSupported: true }));
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      // Unregister all existing service workers first to force fresh start
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Unregistered old service worker');
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Cleared all caches');
      }

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Never use cache for service worker itself
      });

      setSwState(prev => ({
        ...prev,
        isRegistered: true,
        registration
      }));

      // Force immediate update check
      await registration.update();

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              // Immediately activate new worker
              if (newWorker.waiting) {
                newWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
              if (navigator.serviceWorker.controller) {
                setSwState(prev => ({ ...prev, isUpdated: true }));
                // Force reload to use new service worker
                window.location.reload();
              }
            }
          });
        }
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const updateServiceWorker = () => {
    if (swState.registration?.waiting) {
      swState.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const cacheUrls = (urls: string[]) => {
    if (swState.registration?.active) {
      swState.registration.active.postMessage({
        type: 'CACHE_URLS',
        payload: urls
      });
    }
  };

  return {
    ...swState,
    updateServiceWorker,
    cacheUrls
  };
};
