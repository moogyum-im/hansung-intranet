import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// --- [추가] useCallback 훅을 import 합니다. ---
import { useCallback } from 'react';

// ⚠️ 중요: Vercel과 Supabase에 설정한 실제 VAPID 공개 키로 교체해주세요!
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const supabase = createClientComponentClient();

  // --- [수정] 함수를 useCallback으로 감싸서 불필요한 재생성을 방지합니다. ---
  const subscribeToPush = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('푸시 알림이 지원되지 않는 브라우저입니다.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('알림 권한이 거부되었습니다.');
          return;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription_details: subscription,
          endpoint: subscription.endpoint,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      console.log('푸시 구독 정보가 최신 상태로 DB에 저장/업데이트되었습니다.');

    } catch (error) {
      console.error('푸시 알림 구독 및 저장 과정에서 오류 발생:', error);
    }
  }, [supabase]); // supabase 클라이언트는 안정적이므로 의존성에 추가해도 안전합니다.

  return { subscribeToPush };
};