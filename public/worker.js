// public/worker.js

// 서비스 워커가 설치될 때 즉시 활성화되도록 합니다.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 백그라운드에서 푸시 알림을 받았을 때 실행되는 이벤트입니다.
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  
  const title = payload.title || '새로운 알림';
  const options = {
    body: payload.body || '새로운 내용이 도착했습니다.',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/',
    },
  };

  if ('setAppBadge' in navigator) {
    if (payload.badgeCount) {
      navigator.setAppBadge(payload.badgeCount);
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// 사용자가 알림을 클릭했을 때 실행되는 이벤트입니다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});