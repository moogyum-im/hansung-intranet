"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';

const XIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> );

export default function CreateChatRoomModal({ onClose }) {
    const { employee: currentUser } = useEmployee();
    const [roomName, setRoomName] = useState('');
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchEmployees = async () => {
            if (!currentUser) return;
            // 자기 자신을 제외한 모든 직원 목록을 불러옵니다.
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, position')
                .not('id', 'eq', currentUser.id)
                .order('full_name');

            if (error) {
                toast.error('직원 목록을 불러오는 데 실패했습니다.');
            } else {
                setAllEmployees(data);
            }
        };
        fetchEmployees();
    }, [currentUser]);

    const handleParticipantToggle = (employeeId) => {
        setSelectedParticipants(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!roomName.trim()) return toast.error('채팅방 이름을 입력해주세요.');
        if (selectedParticipants.length === 0) return toast.error('참여자를 1명 이상 선택해주세요.');

        setIsLoading(true);
        const toastId = toast.loading('채팅방을 생성하는 중입니다...');

        // 1. 새 채팅방 생성
        const { data: roomData, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({ name: roomName, created_by: currentUser.id })
            .select()
            .single();

        if (roomError) {
            toast.error(`채팅방 생성 실패: ${roomError.message}`, { id: toastId });
            setIsLoading(false);
            return;
        }

        // 2. 참여자(만든 사람 + 선택된 사람) 추가
        const participantsToInsert = [
            { room_id: roomData.id, user_id: currentUser.id },
            ...selectedParticipants.map(userId => ({ room_id: roomData.id, user_id: userId }))
        ];
        
        const { error: participantsError } = await supabase
            .from('chat_room_participants')
            .insert(participantsToInsert);

        if (participantsError) {
            toast.error(`참여자 추가 실패: ${participantsError.message}`, { id: toastId });
        } else {
            toast.success('채팅방이 성공적으로 생성되었습니다.', { id: toastId });
            onClose(true); // 성공적으로 닫혔음을 알림 (목록 새로고침용)
        }
        setIsLoading(false);
    };

    const filteredEmployees = allEmployees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleCreateRoom}>
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">새 채팅방 만들기</h2>
                            <button type="button" onClick={() => onClose(false)} className="p-1 rounded-full text-gray-500 hover:bg-gray-100">
                                <XIcon />
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div>
                            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">채팅방 이름</label>
                            <input
                                id="roomName"
                                type="text"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="예: 3분기 워크샵 준비"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">참여자 선택</label>
                             <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-3"
                                placeholder="이름으로 검색..."
                            />
                            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                                {filteredEmployees.map(employee => (
                                    <div key={employee.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                                        <div>
                                            <p className="font-medium">{employee.full_name}</p>
                                            <p className="text-sm text-gray-500">{employee.position}</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedParticipants.includes(employee.id)}
                                            onChange={() => handleParticipantToggle(employee.id)}
                                            className="h-5 w-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {isLoading ? '생성 중...' : '만들기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}