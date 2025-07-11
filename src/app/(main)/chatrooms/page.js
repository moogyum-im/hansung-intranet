"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import CreateChatRoomModal from '@/components/CreateChatRoomModal';

const ChatIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V6a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H17z" /></svg> );

export default function ChatRoomsPage() {
    const { employee } = useEmployee();
    const router = useRouter();
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchChatRooms = useCallback(async () => {
        if (!employee) return;

        const { data: roomsData, error: roomsError } = await supabase
            .from('chat_room_participants')
            .select('chat_rooms(*)')
            .eq('user_id', employee.id)
            .order('created_at', { foreignTable: 'chat_rooms', ascending: false });

        if (roomsError) {
            console.error('Error fetching chat rooms:', roomsError);
            setLoading(false);
            return;
        }

        const rooms = roomsData.map(item => item.chat_rooms);
        
        const { data: unreadData, error: unreadError } = await supabase.rpc('get_my_total_unread_count');

        if (unreadError) {
            console.error('Error fetching unread counts:', unreadError);
        }

        const unreadMap = new Map();
        if (unreadData) {
            unreadData.forEach(item => {
                unreadMap.set(item.room_id, item.unread_count);
            });
        }

        const roomsWithUnread = rooms.map(room => ({
            ...room,
            unread_count: unreadMap.get(room.id) || 0
        }));

        setChatRooms(roomsWithUnread);
        setLoading(false);
    }, [employee]);

    useEffect(() => {
        fetchChatRooms();
    }, [fetchChatRooms]);

    useEffect(() => {
        if (!employee) return;
        const channel = supabase
            .channel('public:chat_rooms_and_participants')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants' }, (payload) => {
                fetchChatRooms();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
                fetchChatRooms();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [employee, fetchChatRooms]);
    
    const handleModalClose = (isSuccess) => {
        setIsModalOpen(false);
        if (isSuccess) {
            setLoading(true);
            fetchChatRooms();
        }
    }

    if (loading) {
        return <div className="p-8 text-center">채팅방 목록을 불러오는 중입니다...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">채팅</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    새 채팅방 만들기
                </button>
            </div>

            <div className="bg-white rounded-lg shadow">
                <ul role="list" className="divide-y divide-gray-200">
                    {chatRooms.length > 0 ? (
                        chatRooms.map((room) => (
                            <li key={room.id} onClick={() => router.push(`/chatrooms/${room.id}`)} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="bg-gray-200 p-2 rounded-full flex-shrink-0">
                                        <ChatIcon />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{room.name}</p>
                                        <p className="text-sm text-gray-500">{room.is_direct_message ? '개인 메시지' : '그룹 채팅'}</p>
                                    </div>
                                </div>
                                {room.unread_count > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-semibold rounded-full px-2.5 py-1 ml-4 flex-shrink-0">
                                        {room.unread_count}
                                    </span>
                                )}
                            </li>
                        ))
                    ) : (
                        <p className="p-8 text-center text-gray-500">참여 중인 채팅방이 없습니다.</p>
                    )}
                </ul>
            </div>
            {isModalOpen && <CreateChatRoomModal onClose={handleModalClose} />}
        </div>
    );
}