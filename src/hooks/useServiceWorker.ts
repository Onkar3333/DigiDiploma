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
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      setSwState(prev => ({
        ...prev,
        isRegistered: true,
        registration
      }));

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setSwState(prev => ({ ...prev, isUpdated: true }));
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
