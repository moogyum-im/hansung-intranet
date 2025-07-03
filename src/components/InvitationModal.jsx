// 파일 경로: src/components/InvitationModal.jsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';

export default function InvitationModal({ isOpen, onClose, chatRoom, currentParticipants }) {
    const [allEmployees, setAllEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            setEmployeesLoading(true);
            const fetchAllEmployees = async () => {
                const { data, error } = await supabase.from('profiles').select('*');
                if (error) {
                    console.error("전체 직원 목록 로딩 실패:", error);
                } else {
                    setAllEmployees(data || []);
                }
                setEmployeesLoading(false);
            };
            fetchAllEmployees();
        }
    }, [isOpen, supabase]);


    const invitableEmployees = useMemo(() => {
        if (!allEmployees || allEmployees.length === 0) return [];
        const currentParticipantIds = new Set(currentParticipants.map(p => p.id));
        
        return allEmployees.filter(emp => {
            if (!emp?.id || !emp?.full_name) return false;
            if (currentParticipantIds.has(emp.id)) return false;

            const lowerSearchTerm = searchTerm.toLowerCase();
            const nameMatch = emp.full_name.toLowerCase().includes(lowerSearchTerm);
            const deptMatch = emp.department && emp.department.toLowerCase().includes(lowerSearchTerm);
            return nameMatch || deptMatch;
        });
    }, [allEmployees, currentParticipants, searchTerm]);


    const handleSelectUser = (userId) => {
        setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const handleInvite = async () => {
        if (selectedUsers.length === 0) return alert("초대할 사람을 선택해주세요.");
        setIsSubmitting(true);

        const newParticipants = selectedUsers.map(userId => ({ room_id: chatRoom.id, user_id: userId }));
        // ★★★ 테이블 이름 최종 확인: chat_room_participants
        const { error } = await supabase.from('chat_room_participants').insert(newParticipants);

        if (error) {
            alert(`초대 실패: ${error.message}`);
        } else {
            alert("성공적으로 초대했습니다!");
            onClose(true); // 성공을 알리고 모달 닫기
        }
        setIsSubmitting(false);
        setSelectedUsers([]);
        setSearchTerm('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">새로운 멤버 초대</h2>
                    <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
                </div>
                <div className="p-4">
                    <input
                        type="text" placeholder="이름 또는 부서로 검색..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 mb-4 border rounded-md"
                    />
                    <div className="h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
                        {employeesLoading ? <p className="text-center text-gray-500 p-4">직원 목록 로딩 중...</p> : 
                        invitableEmployees.length > 0 ? (
                            invitableEmployees.map(emp => (
                                <div key={emp.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectUser(emp.id)}>
                                    <input
                                        type="checkbox" id={`user-${emp.id}`}
                                        checked={selectedUsers.includes(emp.id)}
                                        readOnly
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    <label htmlFor={`user-${emp.id}`} className="ml-3 flex flex-col cursor-pointer">
                                        <span className="font-medium text-gray-900">{emp.full_name}</span>
                                        <span className="text-sm text-gray-500">{emp.department} / {emp.position}</span>
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 p-4">초대할 수 있는 직원이 없습니다.</p>
                        )}
                    </div>
                </div>
                <div className="mt-2 p-4 flex justify-end gap-4 border-t">
                    <button onClick={() => onClose(false)} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">취소</button>
                    <button onClick={handleInvite} disabled={isSubmitting || selectedUsers.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300">
                        {isSubmitting ? "초대중..." : "초대하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}