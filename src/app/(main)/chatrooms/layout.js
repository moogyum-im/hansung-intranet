// src/app/(main)/chatrooms/layout.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter, usePathname } from 'next/navigation';
import CreateChatRoomModal from '@/components/CreateChatRoomModal';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Search, Users, MessageSquare, X } from 'lucide-react';
import { openChatPopup } from '@/lib/chatPopup'; // ✅ 추가

const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d)) return format(d, 'aaa h:mm', { locale: ko });
    if (isYesterday(d)) return '어제';
    return format(d, 'MM월 dd일');
};

export default function ChatLayout({ children }) {
    const { employee } = useEmployee();
    const router = useRouter();
    const pathname = usePathname();
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedRoomId = pathname?.split('/chatrooms/')[1] ?? null;

    const fetchChatRooms = useCallback(async () => {
        if (!employee) return;
        setLoading(true);
        const { data: roomsData } = await supabase.rpc('get_chat_rooms_with_last_message');
        const { data: unreadData } = await supabase.rpc('get_my_unread_counts_by_room');
        const unreadMap = new Map();
        if (unreadData) unreadData.forEach(item => unreadMap.set(item.room_id, item.unread_count));
        const rooms = (roomsData || []).map(room => {
            let lastMessage = room.last_message_content || '대화 내용이 없습니다.';
            if (room.last_message_type === 'image') lastMessage = '📷 사진을 보냈습니다.';
            if (room.last_message_type === 'file')  lastMessage = '📁 파일을 공유했습니다.';
            return { ...room, last_message_content: lastMessage, unread_count: unreadMap.get(room.id) || 0 };
        });
        setChatRooms(rooms);
        setLoading(false);
    }, [employee]);

    useEffect(() => { if (employee) fetchChatRooms(); }, [employee, fetchChatRooms]);

    useEffect(() => {
        if (!employee) return;
        const channel = supabase
            .channel(`chat-layout-${employee.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, fetchChatRooms)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants' }, fetchChatRooms)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [employee, fetchChatRooms]);

    const filteredRooms = chatRooms.filter(room =>
        room.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-full min-h-0 overflow-hidden bg-[#f8fafc]">
            <aside className="w-[300px] shrink-0 flex flex-col bg-white border-r border-slate-100 overflow-hidden">
                <div className="px-5 pt-5 pb-4 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Secure Messenger</p>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">채팅</h2>
                        </div>
                        <button onClick={() => setIsModalOpen(true)}
                            className="w-8 h-8 bg-slate-900 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-all active:scale-95">
                            <Plus size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                        <Search size={13} className="text-slate-400 shrink-0" />
                        <input type="text" placeholder="채팅방 검색..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 bg-transparent text-[12px] text-slate-700 placeholder:text-slate-400 outline-none font-medium" />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {loading ? (
                        <div className="p-3 space-y-2">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="flex gap-3 p-3 animate-pulse">
                                    <div className="w-11 h-11 bg-slate-100 rounded-2xl shrink-0" />
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                                        <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredRooms.length > 0 ? (
                        filteredRooms.map(room => {
                            const isSelected = room.id === selectedRoomId;
                            return (
                                <div key={room.id}
                                    // ✅ 핵심 변경: router.push → openChatPopup
                                    onClick={() => openChatPopup(room.id)}
                                    className={`relative flex items-center gap-3 mx-2 px-3 py-2.5 rounded-2xl cursor-pointer transition-all
                                        ${isSelected ? 'bg-slate-900 shadow-lg' : 'hover:bg-slate-50'}`}>
                                    <div className="relative shrink-0">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center
                                            ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <Users size={18} />
                                        </div>
                                        {room.unread_count > 0 && (
                                            <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                                                {room.unread_count > 99 ? '99+' : room.unread_count}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className={`text-[13px] font-black truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                                {room.name}
                                            </p>
                                            <span className={`text-[10px] font-medium shrink-0 ml-1 ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                                                {formatTime(room.last_message_at)}
                                            </span>
                                        </div>
                                        <p className={`text-[11px] truncate font-medium ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                                            {room.last_message_content}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <MessageSquare size={26} className="mb-2 opacity-30" />
                            <p className="text-xs font-medium">{searchTerm ? '검색 결과 없음' : '채팅방이 없습니다'}</p>
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 border-t border-slate-50 shrink-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        {filteredRooms.length}개 대화
                    </p>
                </div>
            </aside>

            {/* 오른쪽: 팝업으로 전환했으므로 안내 문구 표시 */}
            <div className="flex-1 min-w-0 overflow-hidden">
                {children}
            </div>

            {isModalOpen && (
                <CreateChatRoomModal onClose={(isSuccess) => { setIsModalOpen(false); if (isSuccess) fetchChatRooms(); }} />
            )}
        </div>
    );
}