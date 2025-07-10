'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { EmployeeProvider } from '@/contexts/EmployeeContext';
import { Toaster } from 'react-hot-toast';
import GlobalChatListener from '@/components/GlobalChatListener';
import { usePathname } from 'next/navigation';

// 모바일용 헤더 아이콘
const MenuIcon = (props) => ( 
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg> 
);

export default function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // 현재 URL 경로를 가져옵니다.
    const pathname = usePathname();
    // 현재 페이지가 채팅방 내부 페이지인지 확인합니다.
    const isChatRoomPage = pathname.startsWith('/chatrooms/');

    return (
        <EmployeeProvider>
            <Toaster 
                position="bottom-right" 
                reverseOrder={false}
                toastOptions={{
                    style: {
                        background: '#334155',
                        color: '#fff',
                    },
                }}
            />
            <GlobalChatListener />
            
            <div className="flex h-screen bg-gray-100">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                
                {/* ✨ [수정] 메인 콘텐츠 영역을 감싸는 div의 레이아웃을 수정합니다. */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="lg:hidden flex justify-between items-center bg-white p-4 border-b flex-shrink-0">
                        <button 
                            onClick={() => setSidebarOpen(true)}
                            className="text-gray-500 focus:outline-none"
                            aria-label="Open sidebar"
                        >
                            <MenuIcon />
                        </button>
                        <h1 className="text-xl font-semibold">HANSUNG</h1>
                        <div className="w-6"></div>
                    </header>

                    {/* ✨ [수정] 페이지 종류에 따라 스크롤 방식을 다르게 적용합니다. */}
                    <main className={`flex-1 ${isChatRoomPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                        {children}
                    </main>
                </div>
            </div>
        </EmployeeProvider>
    );
}