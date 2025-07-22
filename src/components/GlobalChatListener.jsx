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
                console.log('🔊 오디오 잠금 해제 성공! 이제부터 알림음이 재생됩니다.');
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
        console.log("🔊 알림음 재생을 위해 페이지를 한번 클릭해주세요.");

        return () => {
            document.removeEventListener('click', unlockAudio);
        };
    }, [unlockAudio]);

    const playNotificationSound = useCallback(() => {
        if (audioRef.current && audioUnlocked.current) {
            audioRef.current.play().catch(e => console.error("알림음 재생 실패:", e));
        } else {
            console.log("🔊 알림음 재생 실패: 오디오가 아직 활성화되지 않았습니다. (페이지 클릭 필요)");
        }
    }, []);

    useEffect(() => {
        if (!employee) return;

        const channel = supabase
            .channel('global-toast-sound-listener')
            .on( 'postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                async (payload) => {
                    const newMessage = payload.new;
                    if (newMessage.sender_id === employee.id) return;
                    
                    const currentRoomId = pathname.split('/chatrooms/')[1];
                    if (currentRoomId && currentRoomId === newMessage.room_id) return;
                    
                    playNotificationSound();
                    
                    const { data: senderData } = await supabase.from('profiles').select('full_name').eq('id', newMessage.sender_id).single();
                    const { data: roomData } = await supabase.from('chat_rooms').select('name').eq('id', newMessage.room_id).single();
                    
                    toast.custom((t) => (
                        <div onClick={() => { router.push(`/chatrooms/${newMessage.room_id}`); toast.dismiss(t.id); }}
                            className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer`}>
                           <div className="flex-1 w-0 p-4"><div className="flex items-start"><div className="ml-3 flex-1"><p className="text-sm font-medium text-gray-900"><span className="font-bold">{senderData?.full_name || '...'}</span> <span className="font-normal text-gray-500">({roomData?.name || '...'})</span></p><p className="mt-1 text-sm text-gray-500">{newMessage.content || '새 메시지'}</p></div></div></div>
                           <div className="flex border-l border-gray-200"><button onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">닫기</button></div>
                        </div>
                    ));
                }
            )
            .subscribe();

        return () => { if (channel) supabase.removeChannel(channel); };
    }, [employee, pathname, router, playNotificationSound]);

    return null;
}