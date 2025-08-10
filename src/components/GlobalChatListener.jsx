'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function GlobalChatListener() {
    const { employee } = useEmployee();
    const router = useRouter();
    const pathname = usePathname();
    const audioRef = useRef(null);
    const audioUnlocked = useRef(false);

    const NOTIFICATION_SOUND_URL = '/sounds/rclick-13693.mp3';

    const unlockAudio = useCallback(() => {
        if (audioRef.current && !audioUnlocked.current) {
            audioRef.current.muted = true;
            audioRef.current.play().then(() => {
                audioUnlocked.current = true;
                document.removeEventListener('click', unlockAudio);
            }).catch(() => {});
        }
    }, []);

    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.5;
        document.addEventListener('click', unlockAudio, { once: true });
        return () => document.removeEventListener('click', unlockAudio);
    }, [unlockAudio]);

    const playNotificationSound = useCallback(() => {
        if (audioRef.current && audioUnlocked.current) {
            audioRef.current.muted = false;
            audioRef.current.play().catch(e => console.error("알림음 재생 실패:", e));
        }
    }, []);

    useEffect(() => {
        if (!employee) return;

        const channel = supabase
            .channel(`global-listener-for-${employee.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${employee.id}` },
                async (payload) => {
                    const newNotification = payload.new;

                    // ★★★ 새 알림이 오면, 앱 전체 데이터를 새로고침하라고 명령합니다. ★★★
                    // 이것이 대시보드 알림 목록을 실시간으로 업데이트합니다.
                    router.refresh();
                    
                    // 현재 열려있는 페이지로 이동하는 알림은 팝업을 띄우지 않습니다.
                    if (newNotification.link && pathname.includes(newNotification.link)) {
                        return;
                    }
                    
                    playNotificationSound();
                    
                    toast.custom((t) => (
                        <div onClick={() => { router.push(newNotification.link); toast.dismiss(t.id); }}
                            className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer`}>
                           <div className="flex-1 w-0 p-4"><div className="flex items-start"><div className="ml-3 flex-1"><p className="text-sm font-medium text-gray-900">새 알림</p><p className="mt-1 text-sm text-gray-500">{newNotification.content}</p></div></div></div>
                           <div className="flex border-l border-gray-200"><button onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500">닫기</button></div>
                        </div>
                    ));
                }
            )
            .subscribe();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [employee, pathname, router, playNotificationSound]);

    return null;
}