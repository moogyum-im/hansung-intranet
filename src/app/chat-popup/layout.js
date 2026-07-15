// src/app/chat-popup/layout.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { EmployeeProvider } from '@/contexts/EmployeeContext';
import { useRouter, usePathname } from 'next/navigation';
import CreateChatRoomModal from '@/components/CreateChatRoomModal';
import { findOrCreateDirectChat } from '@/actions/chatActions';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Toaster, toast } from 'react-hot-toast';
import { Edit, Search, X, MessageSquare, Users, Settings } from 'lucide-react';

const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d))     return format(d, 'a h:mm', { locale: ko });
    if (isYesterday(d)) return '어제';
    if (d.getFullYear() !== new Date().getFullYear()) return format(d, 'yy.M.d');
    return format(d, 'M/d');
};

const STATUS_MAP = {
    '업무중':  { dot: '#22C55E', label: '업무중'  },
    '외근중':  { dot: '#3B82F6', label: '외근중'  },
    '회의중':  { dot: '#F59E0B', label: '회의중'  },
    '휴가중':  { dot: '#F97316', label: '휴가중'  },
    '연차중':  { dot: '#8B5CF6', label: '연차중'  },
    '오프라인':{ dot: '#9CA3AF', label: '오프라인' },
};


const CHAT_BG_COLORS = [
    { name: '화이트',  value: '#FFFFFF' },
    { name: '라이트블루', value: '#EFF6FF' },
    { name: '민트',    value: '#F0FDF4' },
    { name: '라벤더',  value: '#F5F3FF' },
    { name: '피치',    value: '#FFF7ED' },
    { name: '슬레이트', value: '#F1F5F9' },
    { name: '아이보리', value: '#FFFBEB' },
    { name: '로즈',    value: '#FFF1F2' },
];

const AVATAR_COLORS = ['#64748B','#475569','#6366F1','#0A84FF','#10B981','#F59E0B','#EF4444','#8B5CF6'];
const getAvatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

function ChatLayoutInner({ children }) {
    const { employee, updateEmployeeStatus } = useEmployee();
    const router   = useRouter();
    const pathname = usePathname();

    // 탭: 'chat' | 'people' | 'settings'
    const [sideTab, setSideTab]       = useState('chat');
    const [rooms, setRooms]           = useState([]);
    const [employees, setEmployees]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [isModalOpen, setModal]     = useState(false);
    const [search, setSearch]         = useState('');
    const [startingChat, setStartingChat] = useState(null);
    const [bubbleColor, setBubbleColor]   = useState('#0A84FF');
    const [bgColor, setBgColor]           = useState('#FFFFFF');
    const bcRef = useRef(null);

    const selectedRoomId = pathname?.split('/chat-popup/')[1] ?? null;

    // 버블·배경 색상 초기화
    useEffect(() => {
        const savedBubble = localStorage.getItem('chatBubbleColor');
        if (savedBubble) setBubbleColor(savedBubble);
        const savedBg = localStorage.getItem('chatBgColor');
        if (savedBg) setBgColor(savedBg);
    }, []);

    const fetchRooms = useCallback(async () => {
        if (!employee) return;
        setLoading(true);
        const { data: roomsData } = await supabase.rpc('get_chat_rooms_with_last_message');
        const { data: unreadData } = await supabase.rpc('get_my_unread_counts_by_room');
        const unreadMap = new Map();
        if (unreadData) unreadData.forEach(i => unreadMap.set(i.room_id, i.unread_count));
        const list = (roomsData || []).map(room => {
            let last = room.last_message_content || '대화를 시작해보세요';
            if (room.last_message_type === 'image') last = '사진을 보냈습니다.';
            if (room.last_message_type === 'file')  last = '파일을 공유했습니다.';
            return { ...room, last_message_content: last, unread_count: unreadMap.get(room.id) || 0 };
        });
        setRooms(list);
        setLoading(false);
    }, [employee]);

    const fetchEmployees = useCallback(async () => {
        if (!employee) return;
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, department, position, status')
            .eq('employment_status', '재직')
            .order('department')
            .order('full_name');
        setEmployees(data || []);
    }, [employee]);

    useEffect(() => {
        if (employee) { fetchRooms(); fetchEmployees(); }
    }, [employee, fetchRooms, fetchEmployees]);

    useEffect(() => {
        if (!employee) return;
        const ch = supabase.channel(`popup-layout-${employee.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, fetchRooms)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants' }, fetchRooms)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, fetchEmployees)
            .subscribe();
        return () => supabase.removeChannel(ch);
    }, [employee, fetchRooms, fetchEmployees]);

    useEffect(() => {
        bcRef.current = new BroadcastChannel('hansung_chat');
        bcRef.current.onmessage = (e) => {
            if (e.data?.type === 'NAVIGATE_TO_ROOM') {
                router.push(`/chat-popup/${e.data.roomId}`);
                setSideTab('chat');
                window.focus();
            }
        };
        return () => bcRef.current?.close();
    }, [router]);

    const handleStartChat = async (targetId) => {
        if (!targetId || startingChat) return;
        setStartingChat(targetId);
        try {
            const result = await findOrCreateDirectChat(targetId);
            if (result?.roomId) {
                router.push(`/chat-popup/${result.roomId}`);
                setSideTab('chat');
            } else {
                toast.error(result?.error || '채팅방을 열 수 없습니다.');
            }
        } finally {
            setStartingChat(null);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!employee) return;
        try {
            await updateEmployeeStatus(employee.id, newStatus);
        } catch {
            toast.error('상태 변경에 실패했습니다.');
        }
    };

    const handleBubbleColorChange = (color) => {
        setBubbleColor(color);
        localStorage.setItem('chatBubbleColor', color);
        window.dispatchEvent(new CustomEvent('chatBubbleColorChanged', { detail: color }));
    };

    const handleBgColorChange = (color) => {
        setBgColor(color);
        localStorage.setItem('chatBgColor', color);
        window.dispatchEvent(new CustomEvent('chatBgColorChanged', { detail: color }));
    };

    const totalUnread = rooms.reduce((s, r) => s + (r.unread_count || 0), 0);
    const filteredRooms = rooms.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));
    const filteredEmps = employees.filter(e =>
        e.id !== employee?.id &&
        (e.full_name?.includes(search) || e.department?.includes(search) || e.position?.includes(search))
    );
    const groupedEmps = filteredEmps.reduce((acc, emp) => {
        const dept = emp.department || '기타';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(emp);
        return acc;
    }, {});

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

            {/* ── 1. 아이콘 바 (48px) ─────────────────────────────── */}
            <div className="w-12 shrink-0 flex flex-col items-center py-3 gap-1 bg-[#F9F9F9] border-r border-[#E5E5EA]">
                {/* 내 아바타 */}
                <div className="relative mb-2">
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-black"
                        style={{ backgroundColor: getAvatarColor(employee?.full_name || '') }}
                    >
                        {employee?.full_name?.charAt(0)}
                    </div>
                    <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#F9F9F9]"
                        style={{ backgroundColor: STATUS_MAP[employee?.status]?.dot || '#9CA3AF' }}
                    />
                </div>

                {/* 채팅 탭 */}
                <button
                    onClick={() => { setSideTab('chat'); setSearch(''); router.push('/chat-popup'); }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-colors
                        ${sideTab === 'chat' && !selectedRoomId ? 'bg-white shadow-sm text-[#0A84FF]' : 'text-[#8E8E93] hover:bg-white/80'}`}
                    title="채팅"
                >
                    <MessageSquare size={20} strokeWidth={2} />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#EF4444] text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 ring-2 ring-[#F9F9F9]">
                            {totalUnread > 99 ? '99' : totalUnread}
                        </span>
                    )}
                </button>

                {/* 직원 탭 */}
                <button
                    onClick={() => { setSideTab('people'); setSearch(''); router.push('/chat-popup'); }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                        ${sideTab === 'people' && !selectedRoomId ? 'bg-white shadow-sm text-[#0A84FF]' : 'text-[#8E8E93] hover:bg-white/80'}`}
                    title="직원 목록"
                >
                    <Users size={20} strokeWidth={2} />
                </button>

                <div className="flex-1" />

                {/* 설정 탭 */}
                <button
                    onClick={() => { setSideTab('settings'); setSearch(''); router.push('/chat-popup'); }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                        ${sideTab === 'settings' && !selectedRoomId ? 'bg-white shadow-sm text-[#0A84FF]' : 'text-[#8E8E93] hover:bg-white/80'}`}
                    title="설정"
                >
                    <Settings size={18} strokeWidth={2} />
                </button>
            </div>

            {/* ── 2. 목록 패널 (채팅방 선택 시 숨김) ──────────────── */}
            <aside className={`shrink-0 flex flex-col bg-white border-r border-[#E5E5EA] transition-all duration-200
                ${selectedRoomId ? 'w-0 overflow-hidden' : 'w-[232px]'}`}>

                {sideTab === 'settings' ? (
                    /* ── 설정 패널 ── */
                    <div className="flex flex-col h-full">
                        <div className="px-4 py-3.5 border-b border-[#E5E5EA] shrink-0">
                            <p className="text-[15px] font-black text-[#1C1C1E]">설정</p>
                        </div>

                        {/* 말풍선 색상 */}
                        <div className="px-4 py-4 border-b border-[#E5E5EA] shrink-0">
                            <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest mb-3">내 말풍선 색상</p>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative w-10 h-10 rounded-full shrink-0 ring-2 ring-[#E5E5EA] overflow-hidden"
                                    style={{ backgroundColor: bubbleColor }}>
                                    <input
                                        type="color"
                                        value={bubbleColor}
                                        onChange={(e) => handleBubbleColorChange(e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-[#1C1C1E]">{bubbleColor.toUpperCase()}</p>
                                    <p className="text-[11px] text-[#8E8E93]">클릭해서 색상 선택</p>
                                </div>
                            </label>
                        </div>

                        {/* 채팅 배경색 */}
                        <div className="px-4 py-4 shrink-0">
                            <p className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest mb-3">채팅 배경색</p>
                            <div className="grid grid-cols-4 gap-2">
                                {CHAT_BG_COLORS.map(({ value, name }) => (
                                    <button
                                        key={value}
                                        onClick={() => handleBgColorChange(value)}
                                        title={name}
                                        className={`w-10 h-10 rounded-xl transition-all border
                                            ${bgColor === value ? 'ring-[2px] ring-offset-1 ring-[#0A84FF] scale-105 border-[#0A84FF]' : 'border-[#E5E5EA] hover:scale-105'}`}
                                        style={{ backgroundColor: value }}
                                    />
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8E8E93] mt-3">채팅방 배경색을 변경합니다</p>
                        </div>
                    </div>
                ) : (
                    /* ── 채팅 / 직원 패널 ── */
                    <>
                        {/* 헤더 */}
                        <div className="px-4 pt-3.5 pb-0 shrink-0">
                            <div className="flex items-center justify-between mb-2.5">
                                <p className="text-[15px] font-black text-[#1C1C1E]">
                                    {sideTab === 'chat' ? '채팅' : '직원'}
                                </p>
                                {sideTab === 'chat' && (
                                    <button onClick={() => setModal(true)}
                                        className="w-7 h-7 rounded-full hover:bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] transition-colors">
                                        <Edit size={15} strokeWidth={2} />
                                    </button>
                                )}
                            </div>
                            {/* 검색 */}
                            <div className="flex items-center gap-2 bg-[#F2F2F7] rounded-xl px-3 py-1.5 mb-2.5">
                                <Search size={13} className="text-[#8E8E93] shrink-0" />
                                <input
                                    type="text"
                                    placeholder={sideTab === 'chat' ? '검색' : '이름, 부서 검색'}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="flex-1 bg-transparent text-[12px] text-[#1C1C1E] placeholder:text-[#C7C7CC] outline-none" />
                                {search && (
                                    <button onClick={() => setSearch('')} className="text-[#C7C7CC] hover:text-[#8E8E93]">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 목록 */}
                        <div className="flex-1 overflow-y-auto">
                            {sideTab === 'chat' ? (
                                /* 채팅방 목록 */
                                loading ? (
                                    <div className="p-3 space-y-1">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className="flex gap-3 p-2 animate-pulse">
                                                <div className="w-11 h-11 bg-[#F2F2F7] rounded-full shrink-0" />
                                                <div className="flex-1 space-y-2 pt-1">
                                                    <div className="h-3 bg-[#F2F2F7] rounded w-2/3" />
                                                    <div className="h-2.5 bg-[#F2F2F7] rounded w-1/2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredRooms.length > 0 ? filteredRooms.map(room => {
                                    const isSelected = room.id === selectedRoomId;
                                    const initials = room.name?.split(/[,\s]+/).map(n => n.trim().charAt(0)).filter(Boolean).slice(0, 2).join('') || '?';
                                    return (
                                        <button key={room.id}
                                            onClick={() => router.push(`/chat-popup/${room.id}`)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left
                                                ${isSelected ? 'bg-[#EBF5FF] shadow-[inset_3px_0_0_#0A84FF]' : 'hover:bg-[#F9FAFB]'}`}>
                                            <div className="relative shrink-0">
                                                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[12px] font-black"
                                                    style={{ backgroundColor: getAvatarColor(room.name) }}>
                                                    {initials}
                                                </div>
                                                {room.unread_count > 0 && (
                                                    <div className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[8px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                                                        {room.unread_count > 99 ? '99+' : room.unread_count}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between mb-0.5">
                                                    <p className="text-[13px] font-black text-[#1A1A1A] truncate">{room.name}</p>
                                                    <span className="text-[10px] text-[#8E8E93] shrink-0 ml-1.5">
                                                        {formatTime(room.last_message_at)}
                                                    </span>
                                                </div>
                                                <p className={`text-[11px] truncate
                                                    ${room.unread_count > 0 ? 'text-[#555] font-semibold' : 'text-[#8E8E93]'}`}>
                                                    {room.last_message_content}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                }) : (
                                    <div className="flex flex-col items-center justify-center h-32 text-[#C7C7CC]">
                                        <MessageSquare size={24} className="mb-2 opacity-40" />
                                        <p className="text-xs">{search ? '검색 결과 없음' : '채팅방이 없습니다'}</p>
                                    </div>
                                )
                            ) : (
                                /* 직원 목록 */
                                Object.keys(groupedEmps).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-[#C7C7CC]">
                                        <Users size={24} className="mb-2 opacity-40" />
                                        <p className="text-xs">{search ? '검색 결과 없음' : '직원 정보 없음'}</p>
                                    </div>
                                ) : Object.entries(groupedEmps).map(([dept, emps]) => (
                                    <div key={dept}>
                                        <div className="px-3 py-1.5 bg-[#F9F9F9] sticky top-0 z-10">
                                            <p className="text-[10px] font-black text-[#8E8E93] tracking-widest">{dept}</p>
                                        </div>
                                        {emps.map(emp => {
                                            const statusDot = STATUS_MAP[emp.status]?.dot || '#9CA3AF';
                                            return (
                                                <button
                                                    key={emp.id}
                                                    onClick={() => handleStartChat(emp.id)}
                                                    disabled={!!startingChat}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F9FAFB] transition-colors text-left"
                                                >
                                                    <div className="relative shrink-0">
                                                        <div
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-black"
                                                            style={{ backgroundColor: getAvatarColor(emp.full_name) }}
                                                        >
                                                            {emp.full_name?.charAt(0)}
                                                        </div>
                                                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white"
                                                            style={{ backgroundColor: statusDot }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[12px] font-bold text-[#1A1A1A] truncate">{emp.full_name}</p>
                                                        <p className="text-[10px] text-[#8E8E93] truncate">{emp.position}</p>
                                                    </div>
                                                    {startingChat === emp.id && (
                                                        <div className="w-3 h-3 border-2 border-[#0A84FF]/30 border-t-[#0A84FF] rounded-full animate-spin shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </aside>

            {/* ── 3. 채팅창 ──────────────────────────────────────── */}
            <div className="flex-1 min-w-0 overflow-hidden bg-white">
                {children}
            </div>

            {isModalOpen && (
                <CreateChatRoomModal onClose={(ok) => { setModal(false); if (ok) fetchRooms(); }} />
            )}
        </div>
    );
}

export default function ChatPopupLayout({ children }) {
    return (
        <EmployeeProvider>
            <ChatLayoutInner>{children}</ChatLayoutInner>
        </EmployeeProvider>
    );
}
