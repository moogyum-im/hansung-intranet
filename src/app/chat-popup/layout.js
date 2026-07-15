// src/app/chat-popup/layout.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { EmployeeProvider } from '@/contexts/EmployeeContext';
import { useRouter, usePathname } from 'next/navigation';
import CreateChatRoomModal from '@/components/CreateChatRoomModal';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Toaster } from 'react-hot-toast';
import { Edit, Search, X, MessageSquare } from 'lucide-react';

const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d))     return format(d, 'a h:mm', { locale: ko });
    if (isYesterday(d)) return '어제';
    return format(d, 'M/d');
};

function ChatLayoutInner({ children }) {
    const { employee } = useEmployee();
    const router   = useRouter();
    const pathname = usePathname();
    const [rooms, setRooms]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [isModalOpen, setModal] = useState(false);
    const [search, setSearch]     = useState('');
    const bcRef = useRef(null);

    const selectedRoomId = pathname?.split('/chat-popup/')[1] ?? null;

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

    useEffect(() => { if (employee) fetchRooms(); }, [employee, fetchRooms]);

    useEffect(() => {
        if (!employee) return;
        const ch = supabase.channel(`popup-layout-${employee.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, fetchRooms)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants' }, fetchRooms)
            .subscribe();
        return () => supabase.removeChannel(ch);
    }, [employee, fetchRooms]);

    useEffect(() => {
        bcRef.current = new BroadcastChannel('hansung_chat');
        bcRef.current.onmessage = (e) => {
            if (e.data?.type === 'NAVIGATE_TO_ROOM') {
                router.push(`/chat-popup/${e.data.roomId}`);
                window.focus();
            }
        };
        return () => bcRef.current?.close();
    }, [router]);

    const filtered = rooms.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));
    const totalUnread = rooms.reduce((s, r) => s + (r.unread_count || 0), 0);

    const avatarColors = ['#64748B','#475569','#6366F1','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6'];
    const getAvatarColor = (name = '') => avatarColors[name.charCodeAt(0) % avatarColors.length];

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

            {/* ── 왼쪽: 채팅방 목록 ── */}
            <aside className="w-[280px] shrink-0 flex flex-col bg-white border-r border-[#E8E8E8]">

                {/* 헤더 */}
                <div className="px-4 pt-4 pb-3 shrink-0 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[17px] font-black text-[#1A1A1A] tracking-tight">채팅</span>
                            {totalUnread > 0 && (
                                <span className="text-[10px] font-black text-white bg-[#EF4444] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {totalUnread > 99 ? '99+' : totalUnread}
                                </span>
                            )}
                        </div>
                        <button onClick={() => setModal(true)}
                            className="w-8 h-8 rounded-full hover:bg-[#F2F3F5] flex items-center justify-center text-[#555] transition-colors">
                            <Edit size={16} strokeWidth={2} />
                        </button>
                    </div>

                    {/* 검색 */}
                    <div className="flex items-center gap-2 bg-[#F2F3F5] rounded-xl px-3 py-2">
                        <Search size={14} className="text-[#999] shrink-0" />
                        <input type="text" placeholder="검색" value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-[13px] text-[#1A1A1A] placeholder:text-[#AAA] outline-none" />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-[#AAA] hover:text-[#555]">
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* 목록 */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-3 space-y-1">
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className="flex gap-3 p-3 animate-pulse">
                                    <div className="w-12 h-12 bg-[#F2F3F5] rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2 pt-1.5">
                                        <div className="h-3 bg-[#F2F3F5] rounded w-2/3" />
                                        <div className="h-2.5 bg-[#F2F3F5] rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length > 0 ? filtered.map(room => {
                        const isSelected = room.id === selectedRoomId;
                        // 이니셜 (최대 2글자)
                        const initials = room.name?.split(/[,\s]+/).map(n => n.trim().charAt(0)).filter(Boolean).slice(0, 2).join('') || '?';
                        return (
                            <button key={room.id}
                                onClick={() => router.push(`/chat-popup/${room.id}`)}
                                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
                                    ${isSelected ? 'bg-[#F2F3F5]' : 'hover:bg-[#F9F9F9]'}`}>
                                {/* 프로필 원 */}
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[13px] font-black"
                                        style={{ backgroundColor: getAvatarColor(room.name) }}>
                                        {initials}
                                    </div>
                                    {room.unread_count > 0 && (
                                        <div className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                                            {room.unread_count > 99 ? '99+' : room.unread_count}
                                        </div>
                                    )}
                                </div>
                                {/* 정보 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between mb-0.5">
                                        <p className="text-[14px] font-black text-[#1A1A1A] truncate">{room.name}</p>
                                        <span className="text-[10px] text-[#AAA] shrink-0 ml-2 font-medium">
                                            {formatTime(room.last_message_at)}
                                        </span>
                                    </div>
                                    <p className={`text-[12px] truncate
                                        ${room.unread_count > 0 ? 'text-[#555] font-semibold' : 'text-[#AAA]'}`}>
                                        {room.last_message_content}
                                    </p>
                                </div>
                            </button>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center h-40 text-[#CCC]">
                            <MessageSquare size={28} className="mb-2 opacity-40" />
                            <p className="text-xs">{search ? '검색 결과 없음' : '채팅방이 없습니다'}</p>
                        </div>
                    )}
                </div>

                {/* 하단 프로필 */}
                {employee && (
                    <div className="px-4 py-3 border-t border-[#E8E8E8] shrink-0 flex items-center gap-2.5 bg-white">
                        <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-white text-[11px] font-black shrink-0">
                            {employee.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-black text-[#1A1A1A] truncate">{employee.full_name}</p>
                            <p className="text-[10px] text-[#AAA] truncate">{employee.position}</p>
                        </div>
                        <div className="w-2 h-2 bg-[#2DB400] rounded-full shrink-0" />
                    </div>
                )}
            </aside>

            {/* ── 오른쪽: 채팅창 ── */}
            <div className="flex-1 min-w-0 overflow-hidden bg-[#F2F3F5]">
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