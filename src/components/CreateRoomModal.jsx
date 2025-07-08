"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function CreateRoomModal({ isOpen, onClose }) {
    const { employee: currentEmployee } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roomName, setRoomName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEmployeesLoading(true);
            const fetchAllEmployees = async () => {
                const { data, error } = await supabase.from('profiles').select('*');
                if (error) {
                    toast.error("직원 목록 로딩에 실패했습니다.");
                    setAllEmployees([]);
                } else {
                    // 자기 자신은 목록에서 제외
                    setAllEmployees(data.filter(emp => emp.id !== currentEmployee?.id) || []);
                }
                setEmployeesLoading(false);
            };
            fetchAllEmployees();
        }
    }, [isOpen, currentEmployee]);

    const filteredEmployees = useMemo(() => {
        if (!allEmployees.length) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return allEmployees.filter(emp => 
            emp.full_name.toLowerCase().includes(lowerSearchTerm) ||
            (emp.department && emp.department.toLowerCase().includes(lowerSearchTerm))
        );
    }, [allEmployees, searchTerm]);

    const handleSelectUser = (user) => {
        setSelectedUsers(prev => 
            prev.some(su => su.id === user.id) 
            ? prev.filter(su => su.id !== user.id) 
            : [...prev, user]
        );
    };

    const handleSubmit = async () => {
        if (selectedUsers.length === 0) {
            return toast.error("대화 상대를 1명 이상 선택해주세요.");
        }
        
        // 1:1 채팅인지 그룹 채팅인지 판단
        const isDirectMessage = selectedUsers.length === 1;
        
        if (!isDirectMessage && !roomName.trim()) {
            return toast.error("그룹 채팅방의 이름을 입력해주세요.");
        }

        setIsSubmitting(true);

        try {
            // 1. (그룹채팅) 방 이름 설정 또는 (1:1 채팅) 상대방 이름으로 설정
            const finalRoomName = isDirectMessage 
                ? `${currentEmployee.full_name}, ${selectedUsers[0].full_name}` 
                : roomName.trim();

            // 2. 채팅방 생성
            const { data: newRoom, error: roomError } = await supabase.from('chat_rooms')
                .insert({
                    name: finalRoomName,
                    created_by: currentEmployee.id,
                    is_direct_message: isDirectMessage
                })
                .select()
                .single();

            if (roomError) throw roomError;

            // 3. 참여자 정보 생성 (나 + 선택한 사람들)
            const participantIds = [currentEmployee.id, ...selectedUsers.map(u => u.id)];
            const newParticipants = participantIds.map(userId => ({
                room_id: newRoom.id,
                user_id: userId
            }));
            
            const { error: participantError } = await supabase.from('chat_room_participants').insert(newParticipants);
            if (participantError) throw participantError;

            toast.success("새로운 채팅방이 생성되었습니다!");
            onClose();
            router.push(`/chatrooms/${newRoom.id}`); // 생성된 채팅방으로 바로 이동

        } catch (error) {
            console.error("채팅방 생성 오류:", error);
            toast.error(`채팅방 생성 실패: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">새 대화 시작하기</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
                </div>
                <div className="p-4 space-y-4">
                    {selectedUsers.length > 1 && (
                         <div>
                            <label className="font-semibold text-gray-700">채팅방 이름</label>
                            <input
                                type="text" placeholder="그룹 채팅방 이름을 입력하세요" value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full p-2 mt-1 border rounded-md"
                            />
                        </div>
                    )}
                    <div>
                        <label className="font-semibold text-gray-700">대화 상대 선택</label>
                        <input
                            type="text" placeholder="이름 또는 부서로 검색..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 mt-1 mb-2 border rounded-md"
                        />
                        <div className="h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
                            {employeesLoading ? <p className="text-center text-gray-500 p-4">직원 목록 로딩 중...</p> : 
                            filteredEmployees.length > 0 ? (
                                filteredEmployees.map(emp => (
                                    <div key={emp.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectUser(emp)}>
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.some(su => su.id === emp.id)}
                                            readOnly
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label className="ml-3 flex flex-col cursor-pointer">
                                            <span className="font-medium text-gray-900">{emp.full_name}</span>
                                            <span className="text-sm text-gray-500">{emp.department}</span>
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 p-4">검색 결과가 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-4 flex justify-end gap-4 border-t bg-gray-50">
                    <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">취소</button>
                    <button onClick={handleSubmit} disabled={isSubmitting || selectedUsers.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
                        {isSubmitting ? "생성중..." : "대화 시작"}
                    </button>
                </div>
            </div>
        </div>
    );
}