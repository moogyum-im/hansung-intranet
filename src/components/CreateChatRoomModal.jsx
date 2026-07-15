"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { createGroupChat } from '@/actions/chatActions';
import { X, Check, Search, Users } from 'lucide-react';

export default function CreateChatRoomModal({ onClose }) {
    const { employee: currentUser } = useEmployee();
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roomName, setRoomName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        supabase
            .from('profiles')
            .select('id, full_name, position, department')
            .not('id', 'eq', currentUser.id)
            .order('full_name')
            .then(({ data, error }) => {
                if (error) toast.error('직원 목록을 불러오는 데 실패했습니다.');
                else setAllEmployees(data || []);
            });
    }, [currentUser]);

    const filteredEmployees = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return allEmployees.filter(emp =>
            emp.full_name.toLowerCase().includes(q) ||
            (emp.department && emp.department.toLowerCase().includes(q))
        );
    }, [allEmployees, searchTerm]);

    const toggleUser = (user) => {
        setSelectedUsers(prev =>
            prev.some(u => u.id === user.id)
                ? prev.filter(u => u.id !== user.id)
                : [...prev, user]
        );
    };

    const handleSubmit = async () => {
        if (selectedUsers.length === 0) {
            toast.error('참여자를 1명 이상 선택해주세요.');
            return;
        }
        const isGroup = selectedUsers.length > 1;
        if (isGroup && !roomName.trim()) {
            toast.error('그룹 채팅방 이름을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading('채팅방을 생성하는 중입니다...');

        const finalName = isGroup
            ? roomName.trim()
            : `${currentUser.full_name}, ${selectedUsers[0].full_name}`;

        const result = await createGroupChat(finalName, selectedUsers.map(u => u.id));

        if (result?.error) {
            toast.error(`생성 실패: ${result.error}`, { id: toastId });
        } else {
            toast.success('채팅방이 생성되었습니다.', { id: toastId });
            onClose(true);
        }
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50" onClick={() => onClose(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-blue-500" />
                        <h2 className="text-[15px] font-black text-slate-800">새 채팅방 만들기</h2>
                    </div>
                    <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    {/* 선택된 사람 태그 */}
                    {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-blue-50 rounded-xl min-h-[40px]">
                            {selectedUsers.map(u => (
                                <span key={u.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-full">
                                    {u.full_name}
                                    <button onClick={() => toggleUser(u)} className="hover:opacity-70">
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* 그룹채팅 이름 입력 (2명 이상 선택 시) */}
                    {selectedUsers.length > 1 && (
                        <input
                            type="text"
                            placeholder="그룹 채팅방 이름을 입력하세요"
                            value={roomName}
                            onChange={e => setRoomName(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                    )}

                    {/* 검색 */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="이름 또는 부서 검색..."
                            className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                    </div>

                    {/* 직원 목록 */}
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                        {filteredEmployees.length === 0 ? (
                            <p className="text-center text-[12px] text-slate-400 py-6">검색 결과가 없습니다.</p>
                        ) : filteredEmployees.map(emp => {
                            const selected = selectedUsers.some(u => u.id === emp.id);
                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => toggleUser(emp)}
                                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                >
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-colors ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {selected ? <Check size={13} /> : emp.full_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[13px] font-bold truncate ${selected ? 'text-blue-700' : 'text-slate-700'}`}>{emp.full_name}</p>
                                        <p className="text-[11px] text-slate-400 truncate">{emp.department} · {emp.position}</p>
                                    </div>
                                    {selected && <Check size={14} className="text-blue-500 shrink-0" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="px-4 pb-4 flex gap-2">
                    <button
                        onClick={() => onClose(false)}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || selectedUsers.length === 0}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                    >
                        {isLoading ? '생성 중...' : `대화 시작 ${selectedUsers.length > 0 ? `(${selectedUsers.length}명)` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
