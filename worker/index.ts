// worker/index.ts

// --- [추가] 푸시 알림을 수신하고 표시하는 코드 ---
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  // 서버에서 받은 데이터를 파싱합니다.
  const pushData = event.data.json();

  const title = pushData.title || '새로운 알림';
  const options = {
    body: pushData.body || '알림 내용이 없습니다.',
    icon: '/icons/icon-192x192.png', // 알림 아이콘 경로
    badge: '/favicon.ico.png', // 안드로이드에서 표시될 작은 아이콘
    data: {
      url: pushData.url || '/' // 알림 클릭 시 이동할 URL
    }
  };

  // 알림을 표시하기 전까지 서비스 워커가 활성 상태를 유지하도록 합니다.
  event.waitUntil(self.registration.showNotification(title, options));
});

// --- [추가] 알림을 클릭했을 때의 동작을 정의하는 코드 ---
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data.url || '/';
  const chatMatch = url.match(/\/chatrooms\/([^/?#]+)/);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const appClient = clientList.find(c => new URL(c.url).origin === self.location.origin);

      if (chatMatch) {
        const roomId = chatMatch[1];
        if (appClient) {
          // 앱 탭이 열려있으면 메시지를 보내 팝업을 열게 함
          appClient.postMessage({ type: 'OPEN_CHAT_POPUP', roomId });
          return appClient.focus();
        }
        // 앱 탭이 없으면 chat-popup 페이지로 직접 이동
        return self.clients.openWindow(`/chat-popup/${roomId}`);
      }

      if (appClient) {
        appClient.focus();
        return appClient.navigate(url);
      }
      return self.clients.openWindow(url);
    })
  );
});