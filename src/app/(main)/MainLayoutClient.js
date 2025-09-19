// 파일 경로: src/app/(main)/MainLayoutClient.js
'use client'; 

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { EmployeeProvider } from '@/contexts/EmployeeContext';
import GlobalChatListener from '@/components/GlobalChatListener';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { saveSubscription } from '@/actions/pushActions';

const MenuIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> );

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function MainLayoutClient({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const isChatRoomPage = pathname.startsWith('/chatrooms/');

    useEffect(() => {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        // --- [중요 디버깅 코드] Vercel에서 환경 변수를 제대로 읽어오는지 확인합니다. ---
        console.log('🔑 VAPID Public Key from env:', vapidPublicKey);

        const setupPushNotifications = async () => {
            try {
                const registration = await navigator.serviceWorker.ready;
                let subscription = await registration.pushManager.getSubscription();
                
                if (subscription === null) {
                    console.log('Push Subscription not found, subscribing...');
                    if (!vapidPublicKey) {
                        console.error('🚨 VAPID public key is not defined!');
                        return;
                    }
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                    });
                    console.log('✅ New Push Subscription created, saving to DB...');
                    await saveSubscription(subscription);
                } else {
                    console.log('✅ Existing Push Subscription found.');
                }
            } catch (error) {
                console.error('🚨 Failed to subscribe to push notifications', error);
            }
        };

        if ('serviceWorker' in navigator && 'PushManager' in window) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    setupPushNotifications();
                }
            });
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                router.push('/login');
            } else if (event === 'SIGNED_IN' && 'serviceWorker' in navigator) {
                 setupPushNotifications();
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, [router]);

    return (
        <EmployeeProvider>
            <Toaster position="bottom-right" reverseOrder={false} />
            <GlobalChatListener />
            <div className="flex h-screen bg-gray-100">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="lg:hidden flex justify-between items-center bg-white p-4 border-b">
                        <button onClick={() => setSidebarOpen(true)} className="text-gray-500 focus:outline-none" aria-label="Open sidebar"><MenuIcon /></button>
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