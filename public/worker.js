// public/worker.js

if (typeof importScripts === 'function') {
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');
}

if (self.workbox) {
  self.workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || '새로운 알림';
  const options = {
    body: payload.body || '새로운 내용이 도착했습니다.',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: { url: payload.url || '/' },
  };
  if ('setAppBadge' in navigator && navigator.setAppBadge) {
    if (payload.badgeCount) {
      navigator.setAppBadge(payload.badgeCount);
    }
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url || '/'));
});