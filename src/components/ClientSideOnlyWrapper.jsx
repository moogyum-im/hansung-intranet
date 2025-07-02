// 파일 경로: src/components/ClientSideOnlyWrapper.jsx
'use client'; 

import { useState, useEffect } from 'react';

export default function ClientSideOnlyWrapper({ children }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true); 
  }, []);

  if (!hasMounted) {
    return null; 
  }

  return <>{children}</>;
}