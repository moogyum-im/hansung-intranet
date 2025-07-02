// 파일 경로: src/components/CreateRoomModal.jsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';

export default function CreateRoomModal({ isOpen, onClose }) {
    const { employee: currentUser } = useEmployee();
    const [allEmployees, setAllEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [roomName, setRoomName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        if (isOpen && currentUser) {
            setEmployeesLoading(true);
            const fetchAllEmployees = async () => {
                // 자기 자신을 제외한 모든 직원 목록을 가져옵니다.
                const { data, error } = await supabase.from('profiles').select('*').not('id', 'eq', currentUser.id);
                if (error) {
                    console.error("전체 직원 목록 로딩 실패:", error);
                } else {
                    setAllEmployees(data || []);
                }
                setEmployeesLoading(false);
            };
            fetchAllEmployees();
        }
    }, [isOpen, currentUser, supabase]);

    const availableEmployees = useMemo(() => {
        if (!allEmployees) return [];
        if (!searchTerm) return allEmployees;
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        return allEmployees.filter(emp => 
            emp.full_name?.toLowerCase().includes(lowerSearchTerm) || 
            emp.department?.toLowerCase().includes(lowerSearchTerm)
        );
    }, [allEmployees, searchTerm]);

    const handleSelectUser = (userId) => {
        setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const handleCreateRoom = async () => {
        if (!roomName.trim()) return alert("채팅방 이름을 입력해주세요.");
        if (selectedUsers.length === 0) return alert("최소 한 명 이상의 멤버를 선택해주세요.");
        if (!currentUser) return alert("로그인 정보가 필요합니다.");
        
        setIsSubmitting(true);

        // 1. 새로운 그룹 채팅방을 만듭니다. (is_direct_message = false)
        const { data: newRoom, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({ name: roomName, created_by: currentUser.id, is_direct_message: false })
            .select('id')
            .single();

        if (roomError || !newRoom) {
            alert(`채팅방 생성 실패: ${roomError?.message}`);
            setIsSubmitting(false);
            return;
        }

        // 2. 선택된 멤버와 나 자신을 참여자로 추가합니다.
        const allParticipantIds = [...selectedUsers, currentUser.id];
        const newParticipants = allParticipantIds.map(userId => ({ room_id: newRoom.id, user_id: userId }));
        
        const { error: participantsError } = await supabase.from('chat_room_participants').insert(newParticipants);

        if (participantsError) {
            alert(`멤버 추가 실패: ${participantsError.message}`);
            // 여기서 생성된 채팅방을 삭제하는 롤백 로직을 추가할 수도 있습니다.
            setIsSubmitting(false);
            return;
        }

        alert("그룹 채팅방이 성공적으로 만들어졌습니다!");
        onClose();
        // 3. 새로 만든 채팅방으로 이동합니다.
        router.push(`/chatrooms/${newRoom.id}`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-4 border-b"><h2 className="text-xl font-bold">새 그룹 채팅 만들기</h2></div>
                <div className="p-4 space-y-4">
                    <div>
                        <label htmlFor="roomName" className="font-semibold">채팅방 이름</label>
                        <input id="roomName" type="text" placeholder="채팅방 이름을 입력하세요" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full p-2 mt-1 border rounded-md" />
                    </div>
                    <div>
                        <label className="font-semibold">멤버 선택</label>
                        <input type="text" placeholder="이름 또는 부서로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 mt-1 border rounded-md" />
                        <div className="h-48 mt-2 overflow-y-auto border rounded-lg p-2 space-y-1">
                            {employeesLoading ? <p>로딩 중...</p> : availableEmployees.map(emp => (
                                <div key={emp.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectUser(emp.id)}>
                                    <input type="checkbox" id={`create-user-${emp.id}`} checked={selectedUsers.includes(emp.id)} readOnly className="h-4 w-4 rounded" />
                                    <label htmlFor={`create-user-${emp.id}`} className="ml-3 cursor-pointer">{emp.full_name} ({emp.department})</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 flex justify-end gap-4 border-t">
                    <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 rounded-lg">취소</button>
                    <button onClick={handleCreateRoom} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg">만들기</button>
                </div>
            </div>
        </div>
    );
}