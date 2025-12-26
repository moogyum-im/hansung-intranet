"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import CreateChatRoomModal from '@/components/CreateChatRoomModal';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  ChevronRight,
  Clock,
  Users,
  ShieldCheck,
  Trophy,
  Bell,
  MessageCircle
} from 'lucide-react';

// 마지막 메시지 시간 표시 함수
const formatLastMessageTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d)) return format(d, 'aaa h:mm', { locale: ko });
    if (isYesterday(d)) return '어제';
    return format(d, 'MM월 dd일');
};

export default function ChatRoomsPage() {
    const { employee } = useEmployee();
    const router = useRouter();
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchChatRooms = useCallback(async () => {
        if (!employee) return;
        setLoading(true);

        const { data: roomsData, error: roomsError } = await supabase.rpc('get_chat_rooms_with_last_message');
        if (roomsError) {
            console.error('Error fetching chat rooms:', roomsError);
            setLoading(false);
            return;
        }
        
        const { data: unreadData, error: unreadError } = await supabase.rpc('get_my_unread_counts_by_room');
        if (unreadError) console.error('Error fetching unread counts:', unreadError);

        const unreadMap = new Map();
        if (unreadData) {
            unreadData.forEach(item => { unreadMap.set(item.room_id, item.unread_count); });
        }
        
        const roomsWithDetails = (roomsData || []).map(room => {
            let lastMessage = room.last_message_content || '대화 내용이 없습니다.';
            if (room.last_message_type === 'image') lastMessage = '📷 사진을 보냈습니다.';
            if (room.last_message_type === 'file') lastMessage = '📁 파일을 공유했습니다.';
            
            return {
                ...room,
                last_message_content: lastMessage,
                unread_count: unreadMap.get(room.id) || 0
            };
        });

        setChatRooms(roomsWithDetails);
        setLoading(false);
    }, [employee]);

    useEffect(() => {
        if (employee) fetchChatRooms();
    }, [employee, fetchChatRooms]);

    useEffect(() => {
        if (!employee) return;
        
        const channel = supabase.channel(`chatrooms-listener-final-${employee.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => fetchChatRooms())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants' }, () => fetchChatRooms())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [employee, fetchChatRooms]);
    
    const handleModalClose = (isSuccess) => {
        setIsModalOpen(false);
        if (isSuccess) fetchChatRooms();
    };

    const filteredRooms = chatRooms.filter(room => 
        room.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-700 font-black tracking-widest animate-pulse text-[11px]">HANSUNG SECURE MESSENGER</p>
        </div>
    );

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-12">
            {/* --- 소장님이 마음에 들어하신 웅장한 블루 테마 헤더 --- */}
            <header className="relative bg-[#1e293b] pt-14 pb-28 px-6 sm:px-12 overflow-hidden shadow-2xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 p-16 opacity-10 rotate-12">
                    <MessageCircle size={320} className="text-white" />
                </div>
                <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 shadow-inner text-blue-400">
                            <Trophy size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] tracking-widest uppercase mb-1">
                                <ShieldCheck size={12} /> Secure Messenger System
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter">
                                채팅 목록
                            </h1>
                            <p className="text-slate-400 font-medium text-[13px] mt-1 max-w-md">
                                팀원들과 실시간으로 소통하며 업무 효율을 높여보세요.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-900/40 transition-all hover:-translate-y-1 active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 새 채팅방 개설
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 -mt-16 relative z-20">
                {/* --- 검색창 디자인 유지 --- */}
                <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-2.5 mb-8 flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="채팅방 이름을 검색하세요..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50/50 border-none rounded-2xl py-4 pl-14 pr-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* --- 요청하신 리스트형 레이아웃 --- */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="divide-y divide-slate-50">
                        {filteredRooms.length > 0 ? (
                            filteredRooms.map((room) => (
                                <div 
                                    key={room.id} 
                                    onClick={() => router.push(`/chatrooms/${room.id}`)} 
                                    className="group flex items-center justify-between p-6 hover:bg-blue-50/30 transition-all cursor-pointer relative"
                                >
                                    {/* 호버 시 나타나는 왼쪽 액센트 바 */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent group-hover:bg-blue-600 transition-all"></div>

                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        {/* 룸 아바타 & 알림 배지 */}
                                        <div className="relative shrink-0">
                                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 transition-all border border-slate-100 group-hover:border-blue-100 shadow-sm">
                                                <Users size={24} />
                                            </div>
                                            {room.unread_count > 0 && (
                                                <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black min-w-[22px] h-5.5 px-1 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg animate-bounce">
                                                    {room.unread_count > 99 ? '99+' : room.unread_count}
                                                </div>
                                            )}
                                        </div>

                                        {/* 방 정보 및 마지막 메시지 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors tracking-tight">
                                                    {room.name}
                                                </h3>
                                                {room.unread_count > 0 && (
                                                    <span className="flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase tracking-tighter">
                                                        <Bell size={8} className="animate-pulse" /> New
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[14px] text-slate-500 font-medium truncate leading-relaxed max-w-2xl">
                                                {room.last_message_content}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 메타 정보 및 화살표 */}
                                    <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                            <Clock size={12} />
                                            {formatLastMessageTime(room.last_message_at)}
                                        </div>
                                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1 border border-slate-100 group-hover:border-blue-500">
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 mb-4 text-slate-200">
                                    <MessageSquare size={48} />
                                </div>
                                <h3 className="text-slate-800 font-black text-xl tracking-tight">참여 중인 대화가 없습니다</h3>
                                <p className="text-slate-400 text-sm mt-2 font-medium">새로운 채팅방을 개설하여 대화를 시작해보세요.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* 하단 카운트 정보 */}
                <div className="mt-6 px-4">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                        Active Chatrooms: <span className="text-blue-600">{filteredRooms.length}</span>
                    </p>
                </div>
            </main>

            {isModalOpen && <CreateChatRoomModal onClose={handleModalClose} />}
        </div>
    );
}