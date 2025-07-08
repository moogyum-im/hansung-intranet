'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { EmployeeProvider } from '@/contexts/EmployeeContext';
import { Toaster } from 'react-hot-toast';
import GlobalChatListener from '@/components/GlobalChatListener';

const MenuIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> );

export default function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <EmployeeProvider>
            {/* ✨ [수정] position을 'bottom-right'로 변경하고, toastOptions로 기본 스타일을 지정합니다. */}
            <Toaster 
                position="bottom-right" 
                reverseOrder={false}
                toastOptions={{
                    className: '',
                    style: {
                        background: '#334155', // 슬레이트 색상 배경
                        color: '#fff',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                    },
                }}
            />
            <GlobalChatListener />
            
            <div className="flex h-screen bg-gray-100">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                
                <div className="flex-1 flex flex-col">
                    <header className="lg:hidden flex justify-between items-center bg-white p-4 border-b">
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

                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
                        {children}
                    </main>
                </div>
            </div>
        </EmployeeProvider>
    );
}