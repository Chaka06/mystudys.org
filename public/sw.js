const CACHE = 'studys-v1';
const OFFLINE_URL = '/';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/manifest.json']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then((r) => r ?? caches.match(OFFLINE_URL)))
  );
});

// ─── Push notifications ────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title ?? "STUDY'S", {
      body: data.body ?? "",
      icon: data.icon ?? '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: data.url ?? '/notifications' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? '/notifications';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
