// 파일 경로: src/app/(main)/layout.js
import React from 'react';
import MainLayoutClient from './MainLayoutClient'; // 방금 만든 클라이언트용 알맹이를 가져옵니다.

export default function MainLayout({ children }) {
  return (
    <MainLayoutClient>
      {children}
    </MainLayoutClient>
  );
}