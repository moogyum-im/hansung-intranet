'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { removeParticipant, addParticipants } from '@/actions/chatActions';
import { supabase } from '@/lib/supabase/client';
import { X, UserPlus, Search, Check } from 'lucide-react';

export default function ManageParticipantsModal({ room, participants, onClose }) {
    const { employee: currentUser } = useEmployee();
    const [isProcessing, setIsProcessing] = useState(false);
    const [view, setView] = useState('list'); // 'list' | 'invite'
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedToAdd, setSelectedToAdd] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const isRoomCreator = room.created_by === currentUser?.id;

    useEffect(() => {
        if (view !== 'invite') return;
        const participantIds = new Set(participants.map(p => p.user_id));
        supabase
            .from('profiles')
            .select('id, full_name, position, department')
            .order('full_name')
            .then(({ data }) => {
                setAllEmployees((data || []).filter(e => !participantIds.has(e.id)));
            });
    }, [view, participants]);

    const filteredEmployees = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return allEmployees.filter(e =>
            e.full_name.toLowerCase().includes(q) ||
            (e.department && e.department.toLowerCase().includes(q))
        );
    }, [allEmployees, searchTerm]);

    const toggleSelect = (emp) => {
        setSelectedToAdd(prev =>
            prev.some(u => u.id === emp.id) ? prev.filter(u => u.id !== emp.id) : [...prev, emp]
        );
    };

    const handleRemove = async (participantId) => {
        if (!confirm('정말로 이 참여자를 내보내시겠습니까?')) return;
        setIsProcessing(true);
        const result = await removeParticipant(room.id, participantId);
        if (result?.error) {
            toast.error(`내보내기 실패: ${result.error}`);
        } else {
            toast.success('참여자를 내보냈습니다.');
            onClose(true);
        }
        setIsProcessing(false);
    };

    const handleAddParticipants = async () => {
        if (selectedToAdd.length === 0) return toast.error('추가할 참여자를 선택하세요.');
        setIsProcessing(true);
        const result = await addParticipants(room.id, selectedToAdd.map(u => u.id));
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success(`${result.added}명을 초대했습니다.`);
            onClose(true);
        }
        setIsProcessing(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50" onClick={() => onClose(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-[15px] font-black text-slate-800">
                        {view === 'list' ? `참여자 (${participants.length}명)` : '참여자 초대'}
                    </h2>
                    <button onClick={() => onClose(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                {view === 'list' ? (
                    <>
                        {/* 참여자 목록 */}
                        <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                            {participants.map(p => (
                                <div key={p.user_id} className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[12px] font-black text-slate-500">
                                            {p.profiles.full_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5">
                                                {p.profiles.full_name}
                                                {room.created_by === p.user_id && (
                                                    <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">방장</span>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-slate-400">{p.profiles.position}</p>
                                        </div>
                                    </div>
                                    {isRoomCreator && p.user_id !== currentUser?.id && (
                                        <button
                                            onClick={() => handleRemove(p.user_id)}
                                            disabled={isProcessing}
                                            className="text-[11px] font-bold text-rose-500 hover:text-rose-700 disabled:opacity-40"
                                        >
                                            내보내기
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* 하단 버튼 */}
                        <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
                            {isRoomCreator && (
                                <button
                                    onClick={() => setView('invite')}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                >
                                    <UserPlus size={14} /> 참여자 초대
                                </button>
                            )}
                            <button
                                onClick={() => onClose(false)}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* 선택된 사람 태그 */}
                        {selectedToAdd.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                                {selectedToAdd.map(u => (
                                    <span key={u.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-full">
                                        {u.full_name}
                                        <button onClick={() => toggleSelect(u)} className="hover:opacity-70"><X size={10} /></button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* 검색 */}
                        <div className="px-4 pt-3 pb-1 relative">
                            <Search size={14} className="absolute left-7 top-[22px] text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="이름 또는 부서 검색..."
                                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                            />
                        </div>

                        {/* 직원 목록 */}
                        <div className="mx-4 mb-4 max-h-52 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                            {filteredEmployees.length === 0 ? (
                                <p className="text-center text-[12px] text-slate-400 py-6">
                                    {allEmployees.length === 0 ? '초대 가능한 직원이 없습니다.' : '검색 결과가 없습니다.'}
                                </p>
                            ) : filteredEmployees.map(emp => {
                                const selected = selectedToAdd.some(u => u.id === emp.id);
                                return (
                                    <div
                                        key={emp.id}
                                        onClick={() => toggleSelect(emp)}
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

                        {/* 초대 버튼 */}
                        <div className="px-4 pb-4 flex gap-2">
                            <button
                                onClick={() => { setView('list'); setSelectedToAdd([]); setSearchTerm(''); }}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleAddParticipants}
                                disabled={isProcessing || selectedToAdd.length === 0}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                            >
                                {isProcessing ? '초대 중...' : `초대${selectedToAdd.length > 0 ? ` (${selectedToAdd.length}명)` : ''}`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
