// Disable aggressive caching for fresh loads
const CACHE_NAME = 'nexbuy-no-cache-v2';
const ASSETS_CACHE = 'nexbuy-no-cache-assets-v2';
const API_CACHE = 'nexbuy-no-cache-api-v2';

// Minimal static asset list (do not pre-cache pages to avoid stale content)
const STATIC_ASSETS = [
  '/css/style.css',
  '/css/tokens.css',
  '/css/modern.css',
  '/css/chatbot.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing (no-cache mode)...');
  event.waitUntil(self.skipWaiting());
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== ASSETS_CACHE && cacheName !== API_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always network-only to ensure fresh content
  event.respondWith(fetch(request));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  } else if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/images/icon.svg',
    badge: '/images/icon.svg',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'NexBuy', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Helper functions
async function syncCart() {
  try {
    const cache = await caches.open(API_CACHE);
    const requests = await cache.keys();
    const cartRequests = requests.filter(req => req.url.includes('/api/cart'));
    
    for (const request of cartRequests) {
      await fetch(request);
    }
    console.log('[Service Worker] Cart synced');
  } catch (error) {
    console.error('[Service Worker] Cart sync failed:', error);
  }
}

async function syncOrders() {
  try {
    const cache = await caches.open(API_CACHE);
    const requests = await cache.keys();
    const orderRequests = requests.filter(req => req.url.includes('/api/orders'));
    
    for (const request of orderRequests) {
      await fetch(request);
    }
    console.log('[Service Worker] Orders synced');
  } catch (error) {
    console.error('[Service Worker] Orders sync failed:', error);
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
