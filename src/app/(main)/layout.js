// 파일 경로: src/app/(main)/layout.js
'use client'; // 상태 관리를 위해 클라이언트 컴포넌트로 선언

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

// 햄버거 아이콘 컴포넌트
const HamburgerIcon = ({ isOpen }) => (
  <svg
    className="w-6 h-6 text-gray-800"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    {isOpen ? (
      // 닫기 아이콘 (X)
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    ) : (
      // 햄버거 아이콘
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
    )}
  </svg>
);


export default function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 사이드바 열림/닫힘 상태

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 1. 사이드바 컴포넌트: 열림 상태를 props로 전달 */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* 2. 모바일용 햄버거 버튼 (md 화면보다 작을 때만 보임) */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 md:hidden z-50 p-2 rounded-lg bg-white shadow-md"
      >
        <HamburgerIcon isOpen={isSidebarOpen} />
      </button>

      {/* 3. 사이드바가 열렸을 때 모바일 화면을 덮는 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* 4. 메인 콘텐츠 영역 */}
      {/* md:ml-64: md 화면 이상에서는 사이드바 너비만큼 왼쪽 여백을 줘서 겹치지 않게 함 */}
      <main className="flex-1 ml-0 md:ml-64 overflow-y-auto">
        <div className="p-8">
            {children}
        </div>
      </main>
    </div>
  );
}