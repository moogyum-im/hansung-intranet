'use client';

import { useState, useEffect } from 'react'; // useEffect 추가
import Sidebar from '@/components/Sidebar';
import { EmployeeProvider } from '@/contexts/EmployeeContext';
import GlobalChatListener from '@/components/GlobalChatListener';
import { usePathname, useRouter } from 'next/navigation'; // useRouter 추가
import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client'; // supabase 클라이언트 추가

const MenuIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> );

export default function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter(); // useRouter 훅 사용
    const isChatRoomPage = pathname.startsWith('/chatrooms/');

    // ★★★ 자동 로그인 세션 복구 로직 추가 ★★★
    useEffect(() => {
        const checkSession = async () => {
            // supabase가 브라우저 저장소에서 자동으로 세션을 가져옵니다.
            const { data: { session } } = await supabase.auth.getSession();
            
            // 만약 저장된 세션이 없다면 (로그인 정보가 없다면) 로그인 페이지로 보냅니다.
            if (!session) {
                router.push('/login');
            }
        };

        checkSession();

        // 사용자의 인증 상태(로그인/로그아웃)가 바뀔 때마다 감지하는 리스너
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            // 로그아웃 이벤트가 발생하면 로그인 페이지로 이동
            if (event === 'SIGNED_OUT') {
                router.push('/login');
            }
        });

        // 컴포넌트가 사라질 때 리스너를 정리합니다. (메모리 누수 방지)
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router]); // 의존성 배열에 router 추가

    return (
        <EmployeeProvider>
            <Toaster position="bottom-right" reverseOrder={false} />
            <GlobalChatListener />
            <div className="flex h-screen bg-gray-100">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="lg:hidden flex justify-between items-center bg-white p-4 border-b">
                        <button onClick={() => setSidebarOpen(true)} className="text-gray-500 focus:outline-none" aria-label="Open sidebar">
                            <MenuIcon />
                        </button>
                        <h1 className="text-xl font-semibold">HANSUNG</h1>
                        <div className="w-6"></div>
                    </header>
                    <main className={`flex-1 ${isChatRoomPage ? 'overflow-hidden' : 'overflow-y-auto bg-gray-50'}`}>
                        {children}
                    </main>
                </div>
            </div>
        </EmployeeProvider>
    );
}