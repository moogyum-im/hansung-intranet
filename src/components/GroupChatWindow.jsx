"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import ManageParticipantsModal from './ManageParticipantsModal';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Send, 
  Paperclip, 
  LogOut, 
  Download, 
  X, 
  Edit3, 
  Users, 
  ShieldCheck, 
  Clock, 
  Lock,
  MessageCircle
} from 'lucide-react';

// 메시지 타입별 렌더링 컴포넌트
const MessageContent = ({ msg, allMessages }) => {
    const repliedToMessage = msg.replied_to_message_id 
        ? allMessages.find(m => m.id === msg.replied_to_message_id) 
        : null;

    const renderRepliedMessage = () => {
        if (!repliedToMessage) return null;
        let repliedContent = repliedToMessage.content;
        if (repliedToMessage.message_type === 'image') repliedContent = '사진';
        if (repliedToMessage.message_type === 'file') {
            try { repliedContent = JSON.parse(repliedToMessage.content).name; } catch(e) { repliedContent = '파일'; }
        }
        return (
            <div className="bg-black/5 p-2 rounded-lg mb-2 text-[11px] border-l-4 border-blue-500/50 backdrop-blur-sm">
                <p className="font-black text-blue-700">{repliedToMessage.sender?.full_name || '...'}님에게 답장</p>
                <p className="truncate text-slate-500">{repliedContent}</p>
            </div>
        );
    };

    switch (msg.message_type) {
        case 'image': 
            return ( 
                <div className="space-y-2"> 
                    {renderRepliedMessage()} 
                    <div className="relative group overflow-hidden rounded-2xl shadow-md transition-transform hover:scale-[1.02]">
                        <Image src={msg.content} alt="전송된 이미지" width={280} height={280} unoptimized={true} className="object-cover cursor-pointer" onClick={() => window.open(msg.content, '_blank')} /> 
                    </div>
                </div> 
            );
        case 'file':
            try {
                const fileInfo = JSON.parse(msg.content);
                return ( 
                    <div className="space-y-2"> 
                        {renderRepliedMessage()} 
                        <a href={fileInfo.url} download={fileInfo.name} target="_blank" rel="noopener noreferrer" 
                           className="flex items-center gap-3 p-3 bg-white/50 border border-slate-200 rounded-2xl hover:bg-white hover:shadow-lg transition-all group">
                            <div className="p-2 bg-blue-100 rounded-xl text-blue-600 group-hover:bg-[#1e293b] group-hover:text-white transition-colors">
                                <Download size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-slate-800 truncate leading-none mb-1">{fileInfo.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Secure Download</p>
                            </div>
                        </a>
                    </div> 
                );
            } catch (e) { return <p className="text-xs text-red-500 font-bold">⚠️ 파일 정보를 표시할 수 없습니다.</p>; }
        default: 
            return ( 
                <div className="space-y-1"> 
                    {renderRepliedMessage()} 
                    <p className="text-[14px] font-bold leading-relaxed whitespace-pre-wrap tracking-tight">{msg.content}</p> 
                </div> 
            );
    }
};

export default function GroupChatWindow({ currentUser, chatRoom, initialMessages, initialParticipants }) {
    const router = useRouter();
    const { employee, loading: employeeLoading } = useEmployee();
    const currentUserId = currentUser?.id || employee?.id;
    const [messages, setMessages] = useState(initialMessages || []);
    const [newMessage, setNewMessage] = useState('');
    const [participants, setParticipants] = useState(initialParticipants || []);
    const [isManageModalOpen, setManageModalOpen] = useState(false);
    const [isEditingRoomName, setIsEditingRoomName] = useState(false);
    const [editedRoomName, setEditedRoomName] = useState(chatRoom?.name);
    const [isUploading, setIsUploading] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [replyingTo, setReplyingTo] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const channelRef = useRef(null);
    const currentRoomId = chatRoom?.id;

    const getSupabaseClient = useCallback(() => {
        return createClientComponentClient({
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        });
    }, []);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }, []);

    const fetchUnreadCounts = useCallback(async () => {
        if (!currentRoomId || !currentUserId) return;
        const { data, error } = await supabase.rpc('get_unread_counts_for_my_messages', { p_room_id: currentRoomId });
        if (error) return;
        if (data) {
            const countsMap = data.reduce((acc, item) => {
                acc[item.message_id] = item.unread_count;
                return acc;
            }, {});
            setUnreadCounts(countsMap);
        }
    }, [currentRoomId, currentUserId]);

    useEffect(() => { 
        scrollToBottom(); 
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;
        const markAsRead = async () => {
            await supabase.from('chat_room_participants').update({ last_read_at: new Date().toISOString() }).eq('room_id', currentRoomId).eq('user_id', currentUserId);
        };
        markAsRead();
        fetchUnreadCounts();
        
        const channel = supabase.channel(`room-final-${currentRoomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${currentRoomId}` }, 
                async (payload) => {
                    if (payload.new.sender_id === currentUserId) return;
                    const { data: newMessageData } = await supabase.from('chat_messages').select('*, sender:profiles(id, full_name, avatar_url)').eq('id', payload.new.id).single();
                    if (newMessageData) {
                        setMessages(prev => {
                            if (prev.some(msg => msg.id === newMessageData.id)) return prev;
                            return [...prev, newMessageData];
                        });
                        await markAsRead();
                    }
                }
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants', filter: `room_id=eq.${currentRoomId}` }, 
                async () => {
                    const { data: pData } = await supabase.from('chat_room_participants').select('profiles(id, full_name, position)').eq('room_id', currentRoomId);
                    if (pData) {
                        setParticipants(pData.map(p => p.profiles));
                        fetchUnreadCounts();
                    }
                }
            )
            .subscribe();
        channelRef.current = channel;
        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, [currentRoomId, currentUserId, fetchUnreadCounts]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId || !currentRoomId || employeeLoading) return;
        
        const content = newMessage.trim();
        const repliedToId = replyingTo ? replyingTo.id : null;
        setNewMessage('');
        setReplyingTo(null);

        const tempMessageId = Date.now().toString();
        const messageData = { room_id: currentRoomId, sender_id: currentUserId, content, message_type: 'text', replied_to_message_id: repliedToId };
        const tempMessage = { id: tempMessageId, ...messageData, created_at: new Date().toISOString(), sender: employee };
        
        setMessages(prev => [...prev, tempMessage]);
        scrollToBottom();

        const localSupabase = getSupabaseClient();
        const { data: insertedMessage, error } = await localSupabase.from('chat_messages').insert(messageData).select('*, sender:profiles(id, full_name, avatar_url)').single();
        if (error) {
            setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
            setNewMessage(content);
        } else if (insertedMessage) {
            setMessages(prev => prev.map(msg => msg.id === tempMessageId ? insertedMessage : msg));
            fetchUnreadCounts();
        }
    };
    
    const handleFileChange = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !currentUserId || !currentRoomId || employeeLoading) return;

        setIsUploading(true);
        const toastId = toast.loading(`${files.length}개의 파일 보안 검사 및 전송 중...`);
        const repliedToId = replyingTo ? replyingTo.id : null;
        setReplyingTo(null);

        const uploadPromises = Array.from(files).map(async (file) => {
            const normalizedFileName = file.name.normalize('NFC');
            const tempMessageId = `${Date.now()}-${normalizedFileName}`;
            setMessages(prev => [...prev, { id: tempMessageId, content: `파일 전송 중...`, message_type: 'text', created_at: new Date().toISOString(), sender: employee }]);

            try {
                const fileExtension = normalizedFileName.split('.').pop() ?? '';
                const filePath = `${currentUserId}/${crypto.randomUUID()}.${fileExtension}`;
                const localSupabase = getSupabaseClient();
                const { error: uploadError } = await localSupabase.storage.from('chat-files').upload(filePath, file);
                if (uploadError) throw uploadError;

                const { data: urlData } = localSupabase.storage.from('chat-files').getPublicUrl(filePath);
                const messageType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension.toLowerCase()) ? 'image' : 'file';
                const content = messageType === 'image' ? urlData.publicUrl : JSON.stringify({ name: normalizedFileName, url: urlData.publicUrl });
                
                const { data: insertedMessage, error: insertError } = await localSupabase.from('chat_messages').insert({ room_id: currentRoomId, sender_id: currentUserId, content, message_type: messageType, replied_to_message_id: repliedToId }).select('*, sender:profiles(id, full_name, avatar_url)').single();
                if (insertedMessage) setMessages(prev => prev.map(msg => msg.id === tempMessageId ? insertedMessage : msg));
            } catch (error) {
                setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
            }
        });

        await Promise.all(uploadPromises);
        fetchUnreadCounts();
        toast.success(`전송 완료`, { id: toastId });
        setIsUploading(false);
    };
    
    const handleSaveRoomName = async () => {
        if (!editedRoomName.trim() || editedRoomName === chatRoom.name) { setIsEditingRoomName(false); return; }
        const { error } = await supabase.from('chat_rooms').update({ name: editedRoomName.trim() }).eq('id', currentRoomId);
        if (!error) { setEditedRoomName(editedRoomName.trim()); setIsEditingRoomName(false); }
    };

    const handleLeaveRoom = async () => {
        if (!currentUserId || !currentRoomId) return;
        if (window.confirm('채팅방을 나가시겠습니까?')) {
            const { error } = await supabase.from('chat_room_participants').delete().eq('user_id', currentUserId).eq('room_id', currentRoomId);
            if (!error) { router.push('/chatrooms'); router.refresh(); }
        }
    };

    if (!currentUser || !chatRoom || employeeLoading) return (
        <div className="h-full flex flex-col items-center justify-center bg-[#1e293b]">
            <Lock size={40} className="text-blue-400 animate-bounce" />
            <p className="text-white font-black text-sm tracking-widest mt-4 uppercase">Secure Loading...</p>
        </div>
    );
    
    const renderMessagesWithDateSeparator = () => {
        let lastDate = null;
        return messages.map((msg) => {
            if (!msg.created_at) return null;
            const messageDateStr = new Date(msg.created_at).toDateString();
            const dateSep = messageDateStr !== lastDate ? (
                <div key={`sep-${messageDateStr}`} className="flex items-center gap-4 my-8">
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                    <span className="bg-white border border-slate-100 text-slate-400 text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm uppercase tracking-widest">
                        {new Date(msg.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                </div>
            ) : null;
            lastDate = messageDateStr;

            const isMine = String(msg.sender_id) === String(currentUserId);
            const unreadCount = unreadCounts[msg.id] || 0;

            return (
                <div key={msg.id}>
                    {dateSep}
                    <div onClick={() => setReplyingTo(msg)} className={`group flex items-end gap-3 mb-6 transition-all cursor-pointer ${isMine ? 'flex-row-reverse' : 'justify-start'}`}>
                        {!isMine && (
                            <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                                {msg.sender?.full_name?.charAt(0)}
                            </div>
                        )}
                        <div className={`flex flex-col gap-1 w-full max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                            {!isMine && <p className="text-[11px] font-black text-slate-400 ml-1 mb-1 tracking-tight">{msg.sender?.full_name}</p>}
                            <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                                <div className={`px-5 py-3 rounded-[2rem] shadow-sm transition-all hover:shadow-md
                                    ${isMine ? 'bg-[#1e293b] text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}`}>
                                    <MessageContent msg={msg} allMessages={messages} />
                                </div>
                                <div className={`flex flex-col gap-1 items-center ${isMine ? 'items-end' : 'items-start'}`}>
                                    {isMine && unreadCount > 0 && <span className="text-[10px] font-black text-blue-500 animate-pulse">{unreadCount}</span>}
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                                        {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden">
            {/* 상단 웅장한 블루 헤더 */}
            <header className="relative bg-[#1e293b] pt-10 pb-20 px-8 overflow-hidden shrink-0 shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                    <MessageCircle size={180} className="text-white" />
                </div>
                <div className="max-w-6xl mx-auto relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-5 min-w-0">
                        <div className="w-14 h-14 bg-blue-500/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 text-blue-400 shadow-2xl">
                            <Users size={28} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-blue-400 mb-1">
                                <ShieldCheck size={12} className="fill-current" />
                                <span className="text-[10px] font-black tracking-[0.2em] uppercase">HANSUNG Secure Channel</span>
                            </div>
                            {isEditingRoomName ? (
                                <input type="text" value={editedRoomName} onChange={(e) => setEditedRoomName(e.target.value)} onBlur={handleSaveRoomName}
                                    className="bg-transparent text-2xl font-black text-white border-b-2 border-blue-500 focus:outline-none w-full" autoFocus />
                            ) : (
                                <h1 className="text-2xl font-black text-white tracking-tight truncate flex items-center gap-3">
                                    {chatRoom.name}
                                    {chatRoom.created_by === currentUserId && (
                                        <button onClick={() => setIsEditingRoomName(true)} className="p-1 hover:text-blue-400 text-white/30 transition-colors">
                                            <Edit3 size={16} />
                                        </button>
                                    )}
                                </h1>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!chatRoom.is_direct_message && (
                            <button onClick={() => setManageModalOpen(true)} className="hidden sm:flex bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl font-black text-xs shadow-lg transition-all items-center gap-2">
                                <Users size={16} /> 참여자 관리
                            </button>
                        )}
                        <button onClick={handleLeaveRoom} className="w-11 h-11 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 rounded-2xl flex items-center justify-center border border-white/10 transition-all shadow-xl">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* 대화 영역 - 카드 디자인 */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-6 -mt-10 relative z-20 overflow-hidden flex flex-col mb-4">
                <div className="flex-1 bg-white rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar bg-slate-50/30">
                        {renderMessagesWithDateSeparator()}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 하단 푸터 및 입력창 */}
                    <footer className="p-6 bg-white border-t border-slate-50 shrink-0">
                        {replyingTo && (
                            <div className="px-5 py-3 mb-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100 animate-in slide-in-from-bottom-2">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">답장 대상: {replyingTo.sender?.full_name}</p>
                                    <p className="text-xs text-slate-500 truncate font-bold">{replyingTo.content}</p>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-slate-100 p-2 rounded-[2rem] border-2 border-transparent focus-within:border-blue-500/20 focus-within:bg-white transition-all shadow-inner">
                            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" multiple />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-[#1e293b] transition-colors rounded-2xl hover:bg-white/50">
                                <Paperclip size={24} />
                            </button>
                            <input ref={messageInputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요..." 
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-black text-slate-700 placeholder:text-slate-300" />
                            <button type="submit" disabled={!newMessage.trim() || isUploading} 
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${newMessage.trim() ? 'bg-[#1e293b] text-white hover:scale-105 active:scale-95 shadow-slate-900/20' : 'bg-slate-200 text-slate-400'}`}>
                                <Send size={22} className={newMessage.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                            </button>
                        </form>
                    </footer>
                </div>
            </main>

            {isManageModalOpen && (
                <ManageParticipantsModal isOpen={isManageModalOpen} onClose={(isChanged) => { setManageModalOpen(false); if(isChanged) router.refresh(); }} 
                  room={chatRoom} participants={participants} currentUser={currentUser} />
            )}
        </div>
    );
}