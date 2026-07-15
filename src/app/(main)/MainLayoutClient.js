// src/app/(main)/MainLayoutClient.js
'use client'; 

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false });
import { EmployeeProvider } from '@/contexts/EmployeeContext';
import GlobalChatListener from '@/components/GlobalChatListener';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';

const MenuIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> );

export default function MainLayoutClient({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    // ✅ /chatrooms, /chatrooms/[roomId] 모두 포함
    const isChatRoomPage = pathname.startsWith('/chatrooms');
    const isGanttPage   = pathname.startsWith('/database/execution-plans/site/');

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); }
        };
        checkSession();
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') { router.push('/login'); }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, [router]);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV === 'development') {
            // 개발 환경에서는 등록된 SW를 모두 해제해서 CSS 캐시 깨짐 방지
            navigator.serviceWorker.getRegistrations().then(regs => {
                regs.forEach(r => r.unregister());
            });
            return;
        }
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }, []);

    return (
        <EmployeeProvider>
            <Toaster position="bottom-right" reverseOrder={false} />
            <GlobalChatListener />
            <div className="flex h-screen bg-gray-100">
                {!isGanttPage && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} openSidebar={() => setSidebarOpen(true)} />}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <main className={`flex-1 ${isChatRoomPage ? 'overflow-hidden' : 'overflow-y-auto bg-gray-50'}`}>
                        {children}
                    </main>
                </div>
            </div>
        </EmployeeProvider>
    );
}