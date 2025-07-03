// 파일 경로: src/app/(main)/chatrooms/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from 'contexts/EmployeeContext';
import { supabase } from 'lib/supabase/client';
import Link from 'next/link';
import CreateRoomModal from 'components/CreateRoomModal';
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

        // 현재 사용자가 참여하고 있는 채팅방 ID 목록 가져오기
        const { data: participationData, error: participationError } = await supabase
            .from('chat_room_participants')
            .select('room_id')
            .eq('user_id', employee.id);

        if (participationError) {
            console.error("참여 채팅방 목록 조회 실패:", participationError);
            setLoading(false);
            return;
        }

        const roomIds = participationData.map(p => p.room_id);

        if (roomIds.length === 0) {
            setChatRooms([]);
            setLoading(false);
            return;
        }
        
        // 해당 ID를 가진 채팅방들의 정보 가져오기
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('*')
            .in('id', roomIds)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (error) {
            console.error("채팅방 정보 로딩 실패:", error.message);
            setChatRooms([]);
        } else {
            setChatRooms(data || []);
        }
        setLoading(false);
    }, [employee?.id, supabase]);

    useEffect(() => {
        fetchChatRooms();
    }, [fetchChatRooms]);

    if (employeeLoading) {
        return <div className="p-6"><p className="text-gray-500">사용자 정보 로딩 중...</p></div>;
    }

    if (!employee) {
        router.push('/login'); // 로그인 안 되어 있으면 로그인 페이지로
        return null;
    }

    return (
        <div className="flex flex-col h-full">
            <header className="p-6 border-b flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-gray-900">채팅</h1>
                <button 
                    onClick={() => setCreateModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    새 채팅방 생성
                </button>
            </header>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <p className="p-6 text-gray-500">채팅방 목록을 불러오는 중입니다...</p>
                ) : chatRooms.length === 0 ? (
                    <p className="p-6 text-gray-500">참여 중인 채팅방이 없습니다. 새 채팅방을 생성해보세요.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {chatRooms.map(room => (
                            <li key={room.id}>
                                <Link href={`/chatrooms/${room.id}`} className="block p-6 hover:bg-gray-50 transition-colors">
                                    <h2 className="font-semibold text-lg">{room.name}</h2>
                                    <p className="text-gray-600 text-sm mt-1">{room.last_message || "아직 메시지가 없습니다."}</p>
                                    {room.last_message_at && (
                                        <p className="text-gray-400 text-xs mt-2 text-right">
                                            {new Date(room.last_message_at).toLocaleString('ko-KR')}
                                        </p>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {isCreateModalOpen && (
                <CreateRoomModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setCreateModalOpen(false)} 
                    currentUser={employee}
                    onRoomCreated={() => fetchChatRooms()} // 채팅방 생성 후 목록 새로고침
                />
            )}
        </div>
    );
}