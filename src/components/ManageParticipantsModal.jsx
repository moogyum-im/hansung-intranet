"use client";

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';

export default function ManageParticipantsModal({ isOpen, onClose, chatRoom, initialParticipants }) {
    const { employee: currentEmployee } = useEmployee();
    const [participants, setParticipants] = useState(initialParticipants);
    const [allEmployees, setAllEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // ✨ [추가] 모달 내에서 변경사항이 있었는지 추적하는 상태
    const [hasChanged, setHasChanged] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEmployeesLoading(true);
            const fetchAllEmployees = async () => {
                const { data, error } = await supabase.from('profiles').select('*');
                if (error) {
                    toast.error("직원 목록 로딩 실패");
                } else {
                    setAllEmployees(data || []);
                }
                setEmployeesLoading(false);
            };
            fetchAllEmployees();
            setParticipants(initialParticipants);
            // 모달이 열릴 때마다 변경 상태를 초기화합니다.
            setHasChanged(false);
        }
    }, [isOpen, initialParticipants]);

    const invitableEmployees = useMemo(() => {
        if (!allEmployees.length) return [];
        const currentParticipantIds = new Set(participants.map(p => p.id));
        return allEmployees.filter(emp => {
            if (!emp?.id || !emp?.full_name || currentParticipantIds.has(emp.id)) return false;
            const lowerSearchTerm = searchTerm.toLowerCase();
            return emp.full_name.toLowerCase().includes(lowerSearchTerm) || (emp.department && emp.department.toLowerCase().includes(lowerSearchTerm));
        });
    }, [allEmployees, participants, searchTerm]);

    const handleInvite = async () => {
        if (selectedUsers.length === 0) return toast.error("초대할 사람을 선택해주세요.");
        setIsSubmitting(true);
        const newParticipants = selectedUsers.map(userId => ({ room_id: chatRoom.id, user_id: userId }));
        const { error } = await supabase.from('chat_room_participants').insert(newParticipants);

        if (error) {
            toast.error(`초대 실패: ${error.message}`);
        } else {
            toast.success("성공적으로 초대했습니다!");
            const newlyInvited = allEmployees.filter(emp => selectedUsers.includes(emp.id));
            setParticipants(prev => [...prev, ...newlyInvited]);
            setHasChanged(true); // ✨ 변경사항 발생!
        }
        setIsSubmitting(false);
        setSelectedUsers([]);
        setSearchTerm('');
    };

    const handleRemoveParticipant = async (userIdToRemove) => {
        if (!confirm("정말로 이 멤버를 내보내시겠습니까?")) return;

        const { error } = await supabase.from('chat_room_participants')
            .delete()
            .eq('room_id', chatRoom.id)
            .eq('user_id', userIdToRemove);

        if (error) {
            toast.error("내보내기 실패: " + error.message);
        } else {
            toast.success("멤버를 내보냈습니다.");
            setParticipants(prev => prev.filter(p => p.id !== userIdToRemove));
            setHasChanged(true); // ✨ 변경사항 발생!
        }
    };
    
    // ✨ [추가] 모달을 닫을 때, 변경 여부(hasChanged)를 onClose 함수에 담아 부모에게 전달합니다.
    const handleClose = () => {
        onClose(hasChanged);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col" style={{maxHeight: '90vh'}}>
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold">참여자 관리</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto">
                    <h3 className="font-semibold text-gray-700">현재 참여자 ({participants.length}명)</h3>
                    <div className="space-y-2">
                        {participants.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                                <div>
                                    <p className="font-medium">{p.full_name}</p>
                                    <p className="text-sm text-gray-500">{p.position}</p>
                                </div>
                                {p.id !== currentEmployee.id && (
                                    <button onClick={() => handleRemoveParticipant(p.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">내보내기</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t space-y-3 flex-shrink-0">
                     <h3 className="font-semibold text-gray-700">새로운 멤버 초대</h3>
                    <input
                        type="text" placeholder="이름 또는 부서로 검색..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border rounded-md"
                    />
                    <div className="h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                        {employeesLoading ? <p className="text-center text-gray-500 p-4">로딩 중...</p> : 
                        invitableEmployees.length > 0 ? (
                            invitableEmployees.map(emp => (
                                <div key={emp.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer" onClick={() => setSelectedUsers(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])}>
                                    <input type="checkbox" checked={selectedUsers.includes(emp.id)} readOnly className="h-4 w-4 rounded" />
                                    <label className="ml-3 flex flex-col cursor-pointer">
                                        <span className="font-medium">{emp.full_name}</span>
                                        <span className="text-sm text-gray-500">{emp.department}</span>
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 p-4">초대할 수 있는 직원이 없습니다.</p>
                        )}
                    </div>
                </div>

                <div className="p-4 flex justify-end gap-4 border-t bg-gray-50 flex-shrink-0">
                    <button onClick={handleClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">확인</button>
                    <button onClick={handleInvite} disabled={isSubmitting || selectedUsers.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300">
                        {isSubmitting ? "초대중..." : "초대하기"}
                    </button>
                </div>
            </div>
        </div>
    );
}