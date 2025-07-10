"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const Avatar = ({ profile }) => ( <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-500 flex-shrink-0"> {profile?.avatar_url ? ( <Image src={profile.avatar_url} alt={profile.full_name} layout="fill" objectFit="cover" /> ) : ( <span className="font-bold text-white text-lg flex items-center justify-center h-full">{profile?.full_name?.charAt(0) || '?'}</span> )} </div> );

export default function GlobalChatListener() {
    const { employee } = useEmployee();
    const router = useRouter();
    const [myRoomIds, setMyRoomIds] = useState(new Set());

    useEffect(() => {
        if (!employee) return;
        const fetchMyRooms = async () => {
            const { data } = await supabase.from('chat_room_participants').select('room_id').eq('user_id', employee.id);
            if (data) setMyRoomIds(new Set(data.map(r => r.room_id)));
        };
        fetchMyRooms();
    }, [employee]);

    useEffect(() => {
        if (!employee || myRoomIds.size === 0) return;

        const channel = supabase.channel('global-message-listener')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
                const newMessage = payload.new;
                if (newMessage.sender_id === employee.id || !myRoomIds.has(newMessage.room_id)) return;
                
                const { data: sender } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', newMessage.sender_id).single();
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
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [employee, router, myRoomIds]);

    return null;
}