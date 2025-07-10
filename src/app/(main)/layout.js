'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { EmployeeProvider } from '@/contexts/EmployeeContext';
import { Toaster } from 'react-hot-toast';
import GlobalChatListener from '@/components/GlobalChatListener'; // ✨ 리스너 import

const MenuIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> );

export default function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
            {/* ✨ 전역 알림 기능이 앱 전체에서 동작하도록 추가합니다. */}
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