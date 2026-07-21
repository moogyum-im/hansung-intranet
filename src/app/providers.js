'use client';

import { useEffect } from 'react';
import { EmployeeProvider } from '@/contexts/EmployeeContext';

function SwUpdateHandler() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // 구버전 서비스워커가 남아있어 이전 UI가 캐시로 재노출되는 문제 방지:
    // 브라우저의 자체 업데이트 체크를 기다리지 않고 즉시 해제 + 캐시 삭제
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    // 새 SW가 activate되면 페이지 자동 새로고침 (남아있는 구버전 SW가 스스로 해제될 때 대비)
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