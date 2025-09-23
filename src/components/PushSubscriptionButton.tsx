'use client';

import { useState } from 'react';

// VAPID 공개 키를 여기에 입력하세요.
// Supabase 프로젝트 환경 변수에 있는 NEXT_PUBLIC_VAPID_PUBLIC_KEY 값을 사용합니다.
const VAPID_PUBLIC_KEY = 'BILiJxNnN1Yg0OhPAJ_n3W6cNjCnrhpAZICVj335wR0zUYB_yBRPy-B79kFJAEwahG4ScKlHQ29uWt98qgjj-34';

// Base64-URL을 Uint8Array로 변환하는 헬퍼 함수
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSubscriptionButton() {
  const [subscriptionJson, setSubscriptionJson] = useState('');
  const [error, setError] = useState('');

  const handleSubscription = async () => {
    setSubscriptionJson('');
    setError('');

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('푸시 알림이 지원되지 않는 브라우저입니다.');
      return;
    }

    try {
      // 1. 알림 권한 요청
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('알림 권한이 거부되었습니다.');
        return;
      }

      // 2. 서비스 워커 등록 확인
      const registration = await navigator.serviceWorker.ready;
      
      // 3. 구독 정보 가져오기 또는 새로 생성
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      
      // 4. 화면에 표시하기 위해 JSON 형태로 변환
      setSubscriptionJson(JSON.stringify(subscription, null, 2));

    } catch (err) {
      console.error('푸시 구독 중 오류 발생:', err);
      if (err instanceof Error) {
        setError(`오류: ${err.message}`);
      }
    }
  };

  return (
    <div>
      <button 
        onClick={handleSubscription} 
        style={{ padding: '10px', fontSize: '16px' }}
      >
        알림 구독 및 정보 확인
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {subscriptionJson && (
        <div>
          <h3>새로운 구독 정보 (이것을 복사하세요):</h3>
          <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <code>{subscriptionJson}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
