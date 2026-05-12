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
import {
    Search, Plus, Users, MessageSquare, X,
    Edit, Bell, Settings
} from 'lucide-react';

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
    const [search, setSearch]     = useState('');
    const [isModalOpen, setModal] = useState(false);
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
            let lastMsg = room.last_message_content || '대화를 시작해보세요';
            if (room.last_message_type === 'image') lastMsg = '📷 사진';
            if (room.last_message_type === 'file')  lastMsg = '📁 파일';
            return { ...room, last_message_content: lastMsg, unread_count: unreadMap.get(room.id) || 0 };
        });
        setRooms(list);
        setLoading(false);
    }, [employee]);

    useEffect(() => { if (employee) fetchRooms(); }, [employee, fetchRooms]);

    // 실시간 갱신
    useEffect(() => {
        if (!employee) return;
        const ch = supabase.channel(`popup-layout-${employee.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, fetchRooms)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants' }, fetchRooms)
            .subscribe();
        return () => supabase.removeChannel(ch);
    }, [employee, fetchRooms]);

    // BroadcastChannel: 메인 창에서 방 이동 요청 수신
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

    const filtered = rooms.filter(r =>
        r.name?.toLowerCase().includes(search.toLowerCase())
    );

    const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);

    return (
        <div className="flex h-screen overflow-hidden bg-white select-none">
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

            {/* ── 왼쪽 패널 ── */}
            <aside className="w-[280px] shrink-0 flex flex-col bg-white border-r border-slate-100">

                {/* 상단 헤더 */}
                <div className="px-4 pt-5 pb-3 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
                                <span className="text-white text-[10px] font-black tracking-tight">H</span>
                            </div>
                            <div>
                                <h1 className="text-[15px] font-black text-slate-900 leading-none">메시지</h1>
                                {totalUnread > 0 && (
                                    <p className="text-[10px] text-rose-500 font-bold mt-0.5">{totalUnread}개 읽지 않음</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setModal(true)}
                            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-95"
                            title="새 채팅방"
                        >
                            <Edit size={14} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* 검색 */}
                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5">
                        <Search size={13} className="text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="검색"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 outline-none font-medium"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* 채팅방 목록 */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-3 space-y-1">
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className="flex gap-3 p-3 animate-pulse">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                                        <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length > 0 ? (
                        <div>
                            {filtered.map(room => {
                                const isSelected = room.id === selectedRoomId;
                                const initials = room.name?.split(',').map(n => n.trim().charAt(0)).slice(0, 2).join('') || '?';
                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => router.push(`/chat-popup/${room.id}`)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                                            ${isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                                    >
                                        {/* 아바타 */}
                                        <div className="relative shrink-0">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[13px] font-black
                                                ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {initials}
                                            </div>
                                            {room.unread_count > 0 && (
                                                <div className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                                                    {room.unread_count > 99 ? '99+' : room.unread_count}
                                                </div>
                                            )}
                                        </div>

                                        {/* 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className={`text-[14px] font-black truncate
                                                    ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                                                    {room.name}
                                                </p>
                                                <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                                                    {formatTime(room.last_message_at)}
                                                </span>
                                            </div>
                                            <p className={`text-[12px] truncate
                                                ${room.unread_count > 0 ? 'text-slate-700 font-bold' : 'text-slate-400 font-medium'}`}>
                                                {room.last_message_content}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 px-4">
                            <MessageSquare size={28} className="mb-2 opacity-30" />
                            <p className="text-xs font-medium text-center">
                                {search ? `"${search}" 검색 결과 없음` : '채팅방이 없습니다'}
                            </p>
                        </div>
                    )}
                </div>

                {/* 하단 프로필 */}
                {employee && (
                    <div className="px-4 py-3 border-t border-slate-100 shrink-0 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[12px] font-black shrink-0">
                            {employee.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-black text-slate-800 truncate">{employee.full_name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{employee.position}</p>
                        </div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" title="온라인" />
                    </div>
                )}
            </aside>

            {/* ── 오른쪽 패널 ── */}
            <div className="flex-1 min-w-0 overflow-hidden bg-[#f0f2f5]">
                {children}
            </div>

            {isModalOpen && (
                <CreateChatRoomModal
                    onClose={(ok) => { setModal(false); if (ok) fetchRooms(); }}
                />
            )}
        </div>
    );
}

// EmployeeProvider 래핑
export default function ChatPopupLayout({ children }) {
    return (
        <EmployeeProvider>
            <ChatLayoutInner>{children}</ChatLayoutInner>
        </EmployeeProvider>
    );
}