// 파일 경로: src/app/(main)/layout.js
'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

// 햄버거 아이콘 컴포넌트 (생략)
const HamburgerIcon = ({ isOpen }) => (
  <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    {isOpen ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />)}
  </svg>
);


export default function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    // ★★★ 전체 레이아웃을 grid 시스템으로 변경 ★★★
    <div className="md:grid md:grid-cols-[256px_1fr] h-screen"> {/* 데스크톱에서는 '256px 1fr' 그리드로 */}
      
      {/* 1. 사이드바 */}
      {/* 모바일에서는 fixed, 데스크톱에서는 그리드의 첫 번째 컬럼을 차지 */}
      <div className="hidden md:block">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* 모바일용 사이드바 (화면 밖에서 나타남) */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* 모바일용 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* 2. 메인 콘텐츠 */}
      <main className="overflow-y-auto bg-slate-50">
        {/* 모바일용 헤더에 햄버거 버튼 추가 */}
        <div className="md:hidden p-4 flex items-center bg-white border-b">
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg"
            >
                <HamburgerIcon isOpen={isSidebarOpen} />
            </button>
            <div className="ml-4 font-bold text-lg text-indigo-600">HANSUNG</div>
        </div>
        
        {/* 콘텐츠 패딩 */}
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}