// ═══════════════════════════════════════════════════════════════════════
// JMC TEST — Progressive Web App Service Worker
// Handles caching, offline support, and background sync
// ═══════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'jmc-test-v1';
const DYNAMIC_CACHE = 'jmc-test-dynamic-v1';
const API_CACHE = 'jmc-test-api-v1';

// ─── Core App Shell (cached on install) ───
const APP_SHELL = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/student-dashboard.html',
  '/staff-dashboard.html',
  '/take-test.html',
  '/settings/settings.html',
  '/offline.html',

  // CSS
  '/css/style.css',
  '/css/landing.css',
  '/css/auth-professional.css',
  '/css/dashboard.css',
  '/css/test-interface.css',
  '/css/analytics.css',
  '/css/ai-buddy.css',
  '/css/custom-scrollbar.css',
  '/css/modal.css',

  // JavaScript
  '/js/landing.js',
  '/js/auth.js',
  '/js/db.js',
  '/js/dashboard.js',
  '/js/staff-dashboard.js',
  '/js/staff-settings.js',
  '/js/analytics.js',
  '/js/ai-buddy.js',
  '/js/ranking-system.js',
  '/js/pdf-reports.js',
  '/js/scroll-control.js',
  '/js/zoom-control.js',
  '/js/pwa.js',

  // Assets
  '/logo.png',
  '/manifest.json',

  // Icons
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
];

// ─── External resources to cache ───
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap',
];

// ═══════════════ INSTALL EVENT ═══════════════
// Pre-cache the app shell for instant loading
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v1...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell...');
        // Cache app shell files individually to avoid one failure breaking all
        return Promise.allSettled(
          APP_SHELL.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Failed to cache: ${url}`, err.message);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// ═══════════════ ACTIVATE EVENT ═══════════════
// Clean up old caches when a new version is deployed
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v1...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE && name !== API_CACHE)
            .map((name) => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients...');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// ═══════════════ FETCH EVENT ═══════════════
// Intercept network requests for caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE — pass through)
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // ─── Strategy 1: API requests → Network First, Cache Fallback ───
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // ─── Strategy 2: Google Fonts → Cache First (they rarely change) ───
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // ─── Strategy 3: Static assets → Stale While Revalidate ───
  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidateStrategy(request));
    return;
  }

  // ─── Strategy 4: HTML pages → Network First with Offline Fallback ───
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // ─── Default: Stale While Revalidate ───
  event.respondWith(staleWhileRevalidateStrategy(request));
});

// ═══════════════ CACHING STRATEGIES ═══════════════

/**
 * Network First: Try network, fall back to cache
 * Best for: API calls, dynamic data
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    // Return a JSON error response for API calls
    return new Response(
      JSON.stringify({ error: 'You are offline. Please check your connection.' }),
      { headers: { 'Content-Type': 'application/json' }, status: 503 }
    );
  }
}

/**
 * Cache First: Check cache, fall back to network
 * Best for: Fonts, CDN resources (rarely change)
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    return new Response('', { status: 408 });
  }
}

/**
 * Stale While Revalidate: Return cache immediately, update in background
 * Best for: CSS, JS, images (fast but fresh)
 */
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse);

  return cachedResponse || networkFetch;
}

/**
 * Network First with Offline Fallback: For HTML pages
 * Shows offline page when network is unavailable
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    // Show offline fallback page
    return caches.match('/offline.html');
  }
}

// ═══════════════ HELPERS ═══════════════

/**
 * Check if a URL path points to a static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// ═══════════════ BACKGROUND SYNC ═══════════════
// Queue failed API requests to retry when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    console.log('[SW] Syncing pending actions...');
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  // Future: Implement background sync for offline form submissions
  console.log('[SW] Background sync completed');
}

// ═══════════════ PUSH NOTIFICATIONS ═══════════════
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'You have a new notification from JMC Test',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'JMC Test', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// ═══════════════ PERIODIC CACHE CLEANUP ═══════════════
// Limit dynamic cache size to prevent storage bloat
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxItems);
  }
}

// Periodic cleanup
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'trimCaches') {
    trimCache(DYNAMIC_CACHE, 50);
    trimCache(API_CACHE, 30);
  }

  // Force update
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
