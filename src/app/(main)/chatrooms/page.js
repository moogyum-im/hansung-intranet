'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import CreateRoomModal from '@/components/CreateRoomModal';
import ChatRoomListItem from '@/components/ChatRoomListItem';
import { useRouter } from 'next/navigation';

export default function ChatRoomsPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    const fetchChatRooms = useCallback(async () => {
        if (!employee?.id) { setLoading(false); return; }
        setLoading(true);
        const { data, error } = await supabase.rpc('get_chat_rooms_for_user', { p_user_id: employee.id });
        if (error) { setChatRooms([]); } else { setChatRooms(data || []); }
        setLoading(false);
    }, [employee?.id]);

    useEffect(() => {
        if (employee) fetchChatRooms();
    }, [employee, fetchChatRooms]);

    useEffect(() => {
        if (!employee?.id) return;
        
        // ✨ [수정] 새 메시지 신호를 받아서 목록을 업데이트하는 로직
        const handleNewMessage = (event) => {
            const newMessage = event.detail;
            setChatRooms(prevRooms => {
                const roomIndex = prevRooms.findIndex(r => r.id === newMessage.room_id);
                if (roomIndex === -1) return prevRooms;

                const updatedRoom = { 
                    ...prevRooms[roomIndex],
                    last_message_content: newMessage.content,
                    last_message_at: newMessage.created_at,
                    unread_count: newMessage.sender_id !== employee.id ? (prevRooms[roomIndex].unread_count || 0) + 1 : prevRooms[roomIndex].unread_count
                };
                const otherRooms = prevRooms.filter(r => r.id !== newMessage.room_id);
                return [updatedRoom, ...otherRooms];
            });
        };
        
        window.addEventListener('new-message', handleNewMessage);

        const participationChannel = supabase.channel('chatroom-list-participation-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants', filter: `user_id=eq.${employee.id}` }, 
            (payload) => { fetchChatRooms(); })
            .subscribe();
            
        return () => { 
            window.removeEventListener('new-message', handleNewMessage);
            supabase.removeChannel(participationChannel); 
        };
    }, [employee?.id, fetchChatRooms]);

    const handleLeaveRoom = (roomId) => {
        setChatRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
    };

    if (employeeLoading && loading) return <div className="p-6"><p>로딩 중...</p></div>;

    return (
        <div className="flex flex-col h-full bg-white">
            <header className="p-4 sm:p-6 border-b flex justify-between items-center flex-shrink-0">
                <h1 className="text-3xl font-extrabold text-gray-900">채팅</h1>
                <button onClick={() => setCreateModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg ...">
                    + 새 채팅방 생성
                </button>
            </header>
            <main className="flex-1 overflow-y-auto">
                {loading ? <p className="p-6">채팅방 목록을 불러오는 중...</p> : 
                 chatRooms.length === 0 ? <div className="text-center py-20"><p>참여 중인 채팅방이 없습니다.</p></div> : 
                 <div className="divide-y divide-gray-200">{chatRooms.map(room => (<ChatRoomListItem key={room.id} room={room} onLeave={handleLeaveRoom} />))}</div>}
            </main>
            {isCreateModalOpen && <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} currentUser={employee} onRoomCreated={fetchChatRooms} />}
        </div>
    );
}