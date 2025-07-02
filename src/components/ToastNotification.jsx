// 파일 경로: src/components/ToastNotification.jsx
'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastNotification() {
  return (
    <Toaster
      position="top-right" // 알림 위치 (오른쪽 상단)
      reverseOrder={false}
      toastOptions={{
        // 기본 스타일 정의
        style: {
          background: '#333',
          color: '#fff',
        },
        // 성공 알림 스타일
        success: {
          duration: 3000,
          theme: {
            primary: 'green',
            secondary: 'black',
          },
        },
      }}
    />
  );
}