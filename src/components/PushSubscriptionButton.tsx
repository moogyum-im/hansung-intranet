// 파일 경로: src/components/PushSubscriptionButton.tsx
'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState } from 'react';

export default function PushSubscriptionButton() {
  const { subscribeToPush } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleSubscription = async () => {
    setIsLoading(true);
    setResult('');
    try {
      await subscribeToPush();
      setResult('알림이 성공적으로 켜졌습니다! 🎉');
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setResult(`오류: ${error.message}`);
      }
    }
    setIsLoading(false);
  };

  return (
    <div>
      <button 
        onClick={handleSubscription} 
        disabled={isLoading}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? '구독 중...' : '푸시 알림 켜기'}
      </button>
      {result && <p className="mt-2 text-xs text-gray-600">{result}</p>}
    </div>
  );
}