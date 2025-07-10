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
        if (!employee?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        
        const { data, error } = await supabase.rpc('get_chat_rooms_for_user', { p_user_id: employee.id });

        if (error) {
            console.error("채팅방 정보 로딩 실패:", error.message);
            setChatRooms([]);
        } else {
            setChatRooms(data || []);
        }
        setLoading(false);
    }, [employee?.id]);

    useEffect(() => {
        if (employee) {
            fetchChatRooms();
        }
    }, [employee, fetchChatRooms]);

    useEffect(() => {
        if (!employee?.id) return;
        
        const channel = supabase
            .channel('chatroom-list-changes-page-v3')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants', filter: `user_id=eq.${employee.id}` }, payload => {
                console.log('참여자 변경 감지, 목록 새로고침', payload);
                fetchChatRooms();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
                // 새 메시지가 오면, 해당 채팅방 정보만 업데이트 (전체 목록 새로고침 방지)
                setChatRooms(prevRooms => {
                    const roomIndex = prevRooms.findIndex(r => r.id === payload.new.room_id);
                    if (roomIndex === -1) return prevRooms; // 내가 참여하지 않은 방의 메시지는 무시
                    
                    const updatedRoom = { 
                        ...prevRooms[roomIndex],
                        last_message_content: payload.new.content,
                        last_message_at: payload.new.created_at,
                        unread_count: (prevRooms[roomIndex].unread_count || 0) + 1
                    };

                    // 마지막 메시지 순으로 정렬하기 위해, 해당 방을 맨 위로 올림
                    const otherRooms = prevRooms.filter(r => r.id !== payload.new.room_id);
                    return [updatedRoom, ...otherRooms];
                });
            })
            .subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }, [employee?.id, fetchChatRooms]);

    const handleLeaveRoom = (roomId) => {
        setChatRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
    };

    if (employeeLoading && loading) {
        return <div className="p-6"><p className="text-gray-500">사용자 정보 로딩 중...</p></div>;
    }

    return (
        <div className="flex flex-col h-full bg-white">
            <header className="p-4 sm:p-6 border-b flex justify-between items-center flex-shrink-0">
                <h1 className="text-3xl font-extrabold text-gray-900">채팅</h1>
                <button 
                    onClick={() => setCreateModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    새 채팅방 생성
                </button>
            </header>
            <main className="flex-1 overflow-y-auto">
                {loading ? (
                    <p className="p-6 text-gray-500">채팅방 목록을 불러오는 중입니다...</p>
                ) : chatRooms.length === 0 ? (
                     <div className="text-center py-20">
                        <p className="text-gray-500">참여하고 있는 채팅방이 없습니다.</p>
                        <p className="text-sm text-gray-400 mt-2">새 채팅 버튼을 눌러 대화를 시작해보세요.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {chatRooms.map(room => (
                            <ChatRoomListItem key={room.id} room={room} onLeave={handleLeaveRoom} />
                        ))}
                    </div>
                )}
            </main>
            {isCreateModalOpen && (
                <CreateRoomModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setCreateModalOpen(false)} 
                    currentUser={employee}
                    onRoomCreated={fetchChatRooms}
                />
            )}
        </div>
    );
}