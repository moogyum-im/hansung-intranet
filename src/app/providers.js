'use client';

import { useEffect } from 'react';
import { EmployeeProvider } from '@/contexts/EmployeeContext';

function SwUpdateHandler() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // 새 SW가 activate되면 페이지 자동 새로고침
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);
  return null;
}

export function Providers({ children }) {
  return (
    <EmployeeProvider>
      <SwUpdateHandler />
      {children}
    </EmployeeProvider>
  );
}