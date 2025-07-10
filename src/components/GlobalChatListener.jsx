"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const Avatar = ({ profile }) => (
    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-500 flex-shrink-0">
        {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.full_name} layout="fill" objectFit="cover" />
        ) : (
            <span className="font-bold text-white text-lg flex items-center justify-center h-full">
                {profile?.full_name?.charAt(0) || '?'}
            </span>
        )}
    </div>
);

export default function GlobalChatListener() {
    const { employee } = useEmployee();
    const router = useRouter();
    const [myRoomIds, setMyRoomIds] = useState(new Set());

    useEffect(() => {
        if (!employee) return;
        console.log('[진단] 1. 직원 정보 로드 완료, 내 채팅방 ID 가져오기 시작.');
        const fetchMyRooms = async () => {
            const { data, error } = await supabase
                .from('chat_room_participants')
                .select('room_id')
                .eq('user_id', employee.id);
            
            if (data) {
                console.log(`[진단] 2. 내가 참여한 채팅방 ${data.length}개 확인.`);
                setMyRoomIds(new Set(data.map(r => r.room_id)));
            } else {
                 console.error('[진단] 2-1. 내 채팅방 목록 가져오기 실패!', error);
            }
        };
        fetchMyRooms();
    }, [employee]);

    useEffect(() => {
        if (!employee || myRoomIds.size === 0) return;
        console.log('[진단] 3. 실시간 리스너 설정 시작.');

        const channel = supabase.channel('global-message-listener-v2')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, 
            async (payload) => {
                console.log('[진단] 5. 새로운 메시지 방송 수신!', payload.new);
                const newMessage = payload.new;
                
                if (newMessage.sender_id === employee.id) {
                    console.log('[진단] 6. 내가 보낸 메시지라 알림 건너뜀.');
                    return;
                }

                if (!myRoomIds.has(newMessage.room_id)) {
                    console.log(`[진단] 6. 내가 참여하지 않은 방(ID: ${newMessage.room_id})의 메시지라 알림 건너뜀.`);
                    return;
                }
                
                console.log('[진단] 7. 보낸 사람 프로필 정보 조회 시작.');
                const { data: sender } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', newMessage.sender_id).single();
                
                console.log('[진단] 8. 토스트 팝업 실행!');
                toast((t) => (
                    <div className="flex gap-4 items-center cursor-pointer w-full max-w-md" onClick={() => { router.push(`/chatrooms/${newMessage.room_id}`); toast.dismiss(t.id); }}>
                        <Avatar profile={sender} />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">{sender?.full_name || '새 메시지'}</p>
                            <p className="truncate text-sm opacity-80">{newMessage.content}</p>
                        </div>
                    </div>
                ), { icon: '💬', duration: 5000 });
            })
            .subscribe((status) => {
                // 실시간 연결 상태를 확인하는 가장 중요한 로그
                console.log('[진단] 4. 실시간 채널 구독 상태:', status);
            });

        return () => {
            console.log('[진단] 9. 리스너 정리 및 채널 연결 해제.');
            supabase.removeChannel(channel);
        };

    }, [employee, router, myRoomIds]);

    return null;
}