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

    // [수정] 여기 파일 경로를 새로운 알림음 파일 이름으로 변경했습니다.
    const NOTIFICATION_SOUND_URL = '/sounds/new-notification-010-352755.mp3';

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
    }, [unlockAudio, NOTIFICATION_SOUND_URL]); // NOTIFICATION_SOUND_URL 종속성 추가

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
                    
                    router.refresh();
                    
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