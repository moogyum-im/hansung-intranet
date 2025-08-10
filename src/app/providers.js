// 파일 경로: src/app/providers.js
'use client';

import { EmployeeProvider } from '@/contexts/EmployeeContext';

export function Providers({ children }) {
  return (
    <EmployeeProvider>
      {children}
    </EmployeeProvider>
  );
}