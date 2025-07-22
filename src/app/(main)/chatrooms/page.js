"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import CreateChatRoomModal from '@/components/CreateChatRoomModal';
import { format, isToday, isYesterday, formatDistanceToNowStrict } from 'date-fns';
import { ko } from 'date-fns/locale';

const ChatIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V6a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H17z" /></svg> );

// 마지막 메시지 시간을 카카오톡처럼 표시하는 함수
const formatLastMessageTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d)) return format(d, 'p', { locale: ko }); // 오늘: 오후 2:30
    if (isYesterday(d)) return '어제';
    return format(d, 'yyyy. MM. dd.'); // 그 이전
};

export default function ChatRoomsPage() {
    const { employee } = useEmployee();
    const router = useRouter();
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchChatRooms = useCallback(async () => {
        if (!employee) return;
        setLoading(true);

        // 1. 방금 만든 새 함수를 호출해서 채팅방 목록과 마지막 메시지를 한번에 가져옵니다.
        const { data: roomsData, error: roomsError } = await supabase.rpc('get_chat_rooms_with_last_message');
        if (roomsError) {
            console.error('Error fetching chat rooms:', roomsError);
            setLoading(false);
            return;
        }
        
        // 2. 안 읽은 메시지 개수도 함께 가져옵니다.
        const { data: unreadData, error: unreadError } = await supabase.rpc('get_my_unread_counts_by_room');
        if (unreadError) console.error('Error fetching unread counts:', unreadError);

        const unreadMap = new Map();
        if (unreadData) {
            unreadData.forEach(item => { unreadMap.set(item.room_id, item.unread_count); });
        }
        
        // 3. 두 데이터를 합쳐서 최종 채팅방 목록을 만듭니다.
        const roomsWithDetails = (roomsData || []).map(room => {
            let lastMessage = room.last_message_content || '';
            if (room.last_message_type === 'image') lastMessage = '사진';
            if (room.last_message_type === 'file') lastMessage = '파일';
            
            return {
                ...room,
                last_message_content: lastMessage,
                unread_count: unreadMap.get(room.id) || 0
            };
        });

        setChatRooms(roomsWithDetails);
        setLoading(false);
    }, [employee]);

    useEffect(() => {
        if (employee) fetchChatRooms();
    }, [employee]);

    useEffect(() => {
        if (!employee) return;
        
        const channel = supabase.channel(`chatrooms-listener-final-${employee.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => fetchChatRooms())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants' }, () => fetchChatRooms())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [employee, fetchChatRooms]);
    
    const handleModalClose = (isSuccess) => {
        setIsModalOpen(false);
        if (isSuccess) fetchChatRooms();
    }

    if (loading) return <div className="p-8 text-center">채팅방 목록을 불러오는 중입니다...</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">채팅</h1>
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">새 채팅방 만들기</button>
            </div>

            <div className="bg-white rounded-lg shadow">
                <ul role="list" className="divide-y divide-gray-200">
                    {chatRooms.length > 0 ? (
                        chatRooms.map((room) => (
                            <li key={room.id} onClick={() => router.push(`/chatrooms/${room.id}`)} className="p-4 flex items-start justify-between hover:bg-gray-50 cursor-pointer">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="bg-gray-200 p-2 rounded-full flex-shrink-0"><ChatIcon /></div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{room.name}</p>
                                        {/* ★★★ 마지막 메시지 내용을 표시하는 부분 ★★★ */}
                                        <p className="text-sm text-gray-500 truncate">{room.last_message_content}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end flex-shrink-0 ml-4">
                                    {/* ★★★ 마지막 메시지 시간을 표시하는 부분 ★★★ */}
                                    <p className="text-xs text-gray-400 mb-1">{formatLastMessageTime(room.last_message_at)}</p>
                                    {room.unread_count > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5">
                                            {room.unread_count}
                                        </span>
                                    )}
                                </div>
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