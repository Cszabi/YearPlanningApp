const CACHE_NAME = 'flowkigai-v2';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: pre-cache static assets ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: routing strategy ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https — ignore chrome-extension://, data:, etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // In development (localhost) bypass the SW entirely so Vite HMR works
  // and stale JS modules are never served from cache.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Non-GET API requests (POST, PATCH, PUT, DELETE) — pass through directly,
  // never cache mutations and never intercept with SW fallback logic.
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') return;

  // API GET calls → NetworkFirst with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Google Fonts / CDN → CacheFirst with 30-day expiry
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, 30));
    return;
  }

  // Navigation requests (HTML) → NetworkFirst, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline.html')
          .then((r) => r ?? caches.match('/'))
          .then((r) => r ?? Response.error())
      )
    );
    return;
  }

  // Static assets → CacheFirst
  event.respondWith(cacheFirst(request));
});

// ── Strategies ─────────────────────────────────────────────────────────────────

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? Response.error();
  }
}

async function cacheFirst(request, maxAgeDays = 365) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    const dateHeader = cached.headers.get('date');
    if (dateHeader) {
      const age = (Date.now() - new Date(dateHeader).getTime()) / 86400000;
      if (age < maxAgeDays) return cached;
    } else {
      return cached;
    }
  }
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return cached ?? Response.error();
  }
}

// ── Push Notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data.json();
  } catch {
    const text = event.data?.text() ?? 'Notification';
    data = { title: text, body: '', url: '/' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

// When the browser rotates the push subscription (WNS/FCM channel refresh),
// re-subscribe with the same VAPID key and notify open windows so they can
// send the new endpoint to the backend.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((newSub) => {
        const json = newSub.toJSON();
        return self.clients
          .matchAll({ type: 'window', includeUncontrolled: true })
          .then((clients) => {
            clients.forEach((client) =>
              client.postMessage({ type: 'PUSH_SUBSCRIPTION_RENEWED', subscription: json })
            );
          });
      })
  );
});
