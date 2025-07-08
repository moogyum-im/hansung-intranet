"use client";

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// 프로필 사진을 표시하기 위한 미니 아바타 컴포넌트
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

    useEffect(() => {
        if (!employee) return;

        const channel = supabase.channel('global-message-listener')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, 
            async (payload) => {
                const newMessage = payload.new;
                
                if (newMessage.sender_id === employee.id) return;

                const { data: participant } = await supabase
                    .from('chat_room_participants')
                    .select('room_id')
                    .eq('room_id', newMessage.room_id)
                    .eq('user_id', employee.id)
                    .maybeSingle();

                if (participant) {
                    // ✨ [수정] 보낸 사람의 프로필 사진 URL도 함께 가져옵니다.
                    const { data: sender } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', newMessage.sender_id)
                        .single();
                    
                    // ✨ [수정] 토스트 알림의 내용과 디자인을 개선합니다.
                    toast((t) => (
                        <div 
                            className="flex gap-4 items-center cursor-pointer w-full max-w-md"
                            onClick={() => {
                                router.push(`/chatrooms/${newMessage.room_id}`);
                                toast.dismiss(t.id);
                            }}
                        >
                            <Avatar profile={sender} />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm">{sender?.full_name || '새 메시지'}</p>
                                <p className="truncate text-sm opacity-80">{newMessage.content}</p>
                            </div>
                        </div>
                    ), {
                        icon: '💬',
                        duration: 5000, // 5초간 표시
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [employee, router]);

    return null;
}