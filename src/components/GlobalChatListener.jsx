// src/components/GlobalChatListener.jsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { openChatPopup, isPopupOpen } from '@/lib/chatPopup';

export default function GlobalChatListener() {
    const { employee } = useEmployee();
    const router = useRouter();
    const pathname = usePathname();
    const audioRef = useRef(null);
    const audioUnlocked = useRef(false);
    const chatChannelsRef = useRef([]);
    const NOTIFICATION_SOUND_URL = '/sounds/new-notification-010-352755.mp3';

    // ── 오디오 초기화 ──
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
    }, [unlockAudio, NOTIFICATION_SOUND_URL]);

    // 서비스 워커로부터 채팅 팝업 열기 요청 수신
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handleSwMessage = (event) => {
            if (event.data?.type === 'OPEN_CHAT_POPUP' && event.data.roomId) {
                openChatPopup(event.data.roomId);
            }
        };
        navigator.serviceWorker.addEventListener('message', handleSwMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }, []);

    const playNotificationSound = useCallback(() => {
        if (audioRef.current && audioUnlocked.current) {
            audioRef.current.muted = false;
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
        }
    }, []);

    // ── 브라우저 알림 표시 ──
    const showBrowserNotification = useCallback((roomId, roomName, senderName, msgPreview) => {
        if (Notification.permission !== 'granted') return;
        const notification = new Notification(roomName || '새 메시지', {
            body: `${senderName}: ${msgPreview}`,
            icon: '/icons/icon-192x192.png',
            tag: `chat-${roomId}`,   // 같은 방 알림은 덮어쓰기
            renotify: true,
            silent: true,            // 소리는 별도로 재생
        });
        notification.onclick = () => {
            window.focus();
            openChatPopup(roomId);
            notification.close();
        };
    }, []);

    // ── 채팅 토스트 표시 ──
    const showChatToast = useCallback((roomId, roomName, senderName, msgPreview) => {
        toast.custom((t) => (
            <div
                onClick={() => { openChatPopup(roomId); toast.dismiss(t.id); }}
                className={`${t.visible ? 'animate-enter' : 'animate-leave'}
                    w-80 bg-white shadow-xl rounded-2xl pointer-events-auto flex items-start gap-3 p-4
                    ring-1 ring-black/5 cursor-pointer hover:bg-slate-50 transition-colors`}
            >
                {/* 아이콘 */}
                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 text-white font-black text-sm">
                    {senderName?.charAt(0)}
                </div>
                {/* 내용 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[12px] font-black text-slate-500 truncate">{roomName}</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
                            className="text-slate-300 hover:text-slate-500 ml-2 shrink-0 text-xs"
                        >✕</button>
                    </div>
                    <p className="text-[13px] font-black text-slate-800">{senderName}</p>
                    <p className="text-[12px] text-slate-500 truncate mt-0.5">{msgPreview}</p>
                </div>
            </div>
        ), { duration: 5000, position: 'bottom-right' });
    }, []);

    // ── 결재 등 시스템 알림 구독 (기존 로직 유지) ──
    useEffect(() => {
        if (!employee) return;
        const channel = supabase
            .channel(`global-system-${employee.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'notifications',
                filter: `recipient_id=eq.${employee.id}`
            }, async (payload) => {
                const n = payload.new;
                router.refresh();
                if (n.link && pathname.includes(n.link)) return;
                playNotificationSound();
                toast.custom((t) => (
                    <div onClick={() => { router.push(n.link); toast.dismiss(t.id); }}
                        className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer`}>
                        <div className="flex-1 w-0 p-4">
                            <p className="text-sm font-medium text-gray-900">새 알림</p>
                            <p className="mt-1 text-sm text-gray-500">{n.content}</p>
                        </div>
                        <div className="flex border-l border-gray-200">
                            <button onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
                                className="p-4 text-sm font-medium text-indigo-600 hover:text-indigo-500">닫기</button>
                        </div>
                    </div>
                ));
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [employee, pathname, router, playNotificationSound]);

    // ── 채팅 메시지 알림 구독 (새로 추가) ──
    useEffect(() => {
        if (!employee) return;

        let isMounted = true;

        const subscribeToMyRooms = async () => {
            // 참여 중인 채팅방 목록 조회
            const { data: rooms } = await supabase
                .from('chat_room_participants')
                .select('room_id')
                .eq('user_id', employee.id);

            if (!rooms || !isMounted) return;

            // 기존 채팅 구독 정리
            chatChannelsRef.current.forEach(ch => supabase.removeChannel(ch));
            chatChannelsRef.current = [];

            // 각 채팅방 메시지 구독
            const channels = rooms.map(({ room_id }) =>
                supabase
                    .channel(`global-chat-msg-${room_id}-${employee.id}`)
                    .on('postgres_changes', {
                        event: 'INSERT', schema: 'public',
                        table: 'chat_messages',
                        filter: `room_id=eq.${room_id}`
                    }, async (payload) => {
                        const msg = payload.new;

                        // 본인 메시지는 무시
                        if (msg.sender_id === employee.id) return;

                        // 팝업이 열려있고 포커스 상태면 무시
                        if (isPopupOpen(room_id)) return;

                        // 현재 해당 채팅방 페이지면 무시
                        const currentPath = window.location.pathname;
                        if (currentPath.includes(room_id)) return;

                        // 방 이름 & 발신자 조회
                        const [{ data: room }, { data: sender }] = await Promise.all([
                            supabase.from('chat_rooms').select('name').eq('id', room_id).single(),
                            supabase.from('profiles').select('full_name').eq('id', msg.sender_id).single(),
                        ]);

                        const msgPreview = msg.message_type === 'text'
                            ? msg.content
                            : msg.message_type === 'image'
                                ? '📷 사진을 보냈습니다.'
                                : '📁 파일을 공유했습니다.';

                        playNotificationSound();
                        showBrowserNotification(room_id, room?.name, sender?.full_name, msgPreview);
                        showChatToast(room_id, room?.name, sender?.full_name, msgPreview);
                    })
                    .subscribe()
            );

            if (isMounted) chatChannelsRef.current = channels;
        };

        subscribeToMyRooms();

        return () => {
            isMounted = false;
            chatChannelsRef.current.forEach(ch => supabase.removeChannel(ch));
            chatChannelsRef.current = [];
        };
    }, [employee, playNotificationSound, showBrowserNotification, showChatToast]);

    return null;
}