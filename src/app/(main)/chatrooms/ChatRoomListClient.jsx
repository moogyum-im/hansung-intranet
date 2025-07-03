// src/app/(main)/chatrooms/ChatRoomListClient.jsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import Link from 'next/link';
import CreateRoomModal from '@/components/CreateRoomModal';

export default function ChatRoomListClient({ initialChatRooms }) {
    const [chatRooms, setChatRooms] = useState(initialChatRooms);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    useEffect(() => {
        // 실시간 업데이트 리스너
        const channel = supabase
            .channel('any-db-changes-for-my-chatrooms')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, 
                async (payload) => {
                    // 변경이 감지되면, 서버에서 다시 데이터를 가져오는 대신,
                    // 클라이언트에서 직접 데이터를 다시 fetch 합니다.
                    // (이 부분은 추후 서버액션으로 개선할 수 있습니다.)
                    const { data: user } = await supabase.auth.getUser();
                    if(user) {
                         const { data: updatedRooms } = await supabase.rpc('get_chat_rooms_with_unread_count', { p_user_id: user.id });
                         if(updatedRooms) setChatRooms(updatedRooms);
                    }
                }
            ).subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }, [supabase]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">채팅</h1>
                <button onClick={() => setCreateModalOpen(true)} className="px-4 py-2 bg-green-600 ...">
                    + 새 대화방 만들기
                </button>
            </div>
            <div className="space-y-3">
                {chatRooms.length > 0 ? (
                    chatRooms.map(room => (
                        <Link key={room.id} href={`/chatrooms/${room.id}`} className="block p-4 ...">
                           <div className="flex justify-between">
                               <h2 className="font-bold">{room.name}</h2>
                               {room.unread_count > 0 && <span className="bg-red-500 ...">{room.unread_count}</span>}
                           </div>
                           <p className="text-sm ...">{room.last_message_content || '...'}</p>
                        </Link>
                    ))
                ) : <p>참여하고 있는 채팅방이 없습니다.</p>}
            </div>
            {isCreateModalOpen && <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />}
        </div>
    );
}