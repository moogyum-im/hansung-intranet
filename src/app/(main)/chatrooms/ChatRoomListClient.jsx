"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import CreateRoomModal from '@/components/CreateRoomModal';
import ChatRoomListItem from '@/components/ChatRoomListItem';

export default function ChatRoomListClient({ initialChatRooms, userId }) {
    const [chatRooms, setChatRooms] = useState(initialChatRooms);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    useEffect(() => {
        if (!userId) return;
        
        const channel = supabase
            .channel('chatroom-list-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants', filter: `user_id=eq.${userId}` }, 
                async () => {
                     const { data: updatedRooms } = await supabase.rpc('get_chat_rooms_with_unread_count', { p_user_id: userId });
                     if(updatedRooms) setChatRooms(updatedRooms);
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_rooms' }, 
                (payload) => {
                    setChatRooms(prevRooms => 
                        prevRooms.map(room => 
                            room.id === payload.new.id ? { ...room, ...payload.new } : room
                        )
                    );
                }
            )
            .subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }, [userId]);
    
    // ✨ [추가] 채팅방을 나갔을 때, 목록에서 즉시 제거하는 함수
    const handleLeaveRoom = (roomId) => {
        setChatRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <header className="p-4 sm:p-6 border-b flex justify-between items-center flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-800">채팅</h1>
                <button 
                    onClick={() => setCreateModalOpen(true)} 
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    + 새 채팅
                </button>
            </header>

            <main className="flex-1 overflow-y-auto">
                <div className="divide-y divide-gray-200">
                    {chatRooms.length > 0 ? (
                        chatRooms.map(room => (
                            // ✨ [수정] onLeave 함수를 props로 전달합니다.
                            <ChatRoomListItem key={room.id} room={room} onLeave={handleLeaveRoom} />
                        ))
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-gray-500">참여하고 있는 채팅방이 없습니다.</p>
                            <p className="text-sm text-gray-400 mt-2">새 채팅 버튼을 눌러 대화를 시작해보세요.</p>
                        </div>
                    )}
                </div>
            </main>
            
            {isCreateModalOpen && <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />}
        </div>
    );
}