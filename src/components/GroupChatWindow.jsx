"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );
const LeaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );

export default function GroupChatWindow({ serverChatRoom, serverInitialMessages, serverInitialParticipants }) {
    const router = useRouter();
    const { employee: currentEmployee } = useEmployee();
    const [messages, setMessages] = useState(serverInitialMessages);
    const [newMessage, setNewMessage] = useState('');
    
    const messagesEndRef = useRef(null);
    const channelRef = useRef(null);
    
    const currentRoomId = serverChatRoom?.id;
    const currentUserId = currentEmployee?.id;

    const scrollToBottom = useCallback(() => {
        setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 50);
    }, []);

    useEffect(() => {
        if(messages.length) scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;

        const handleNewMessage = (payload) => {
            // 다른 사람이 보낸 메시지만 실시간으로 추가합니다.
            if (String(payload.new.sender_id) !== String(currentUserId)) {
                const senderProfile = serverInitialParticipants.find(p => p.id === payload.new.sender_id);
                const messageWithSender = { ...payload.new, sender: senderProfile || { full_name: '알 수 없음' } };
                setMessages(prev => [...prev, messageWithSender]);
            }
        };

        const channel = supabase.channel(`rt:chat:${currentRoomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${currentRoomId}` }, handleNewMessage)
            .subscribe();
        channelRef.current = channel;

        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, [currentRoomId, currentUserId, serverInitialParticipants]);

    // ✨ [수정] 가장 안정적인 '낙관적 UI' 메시지 전송 로직
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId) return;
        
        const content = newMessage.trim();
        setNewMessage('');
        
        const tempId = `temp_${Date.now()}`;
        const optimisticMessage = {
            id: tempId,
            content: content,
            created_at: new Date().toISOString(),
            sender_id: currentUserId,
            sender: { full_name: currentEmployee.full_name }
        };
        setMessages(prev => [...prev, optimisticMessage]);

        const { data: savedMessage, error } = await supabase
            .from('chat_messages')
            .insert({ room_id: currentRoomId, sender_id: currentUserId, content })
            .select()
            .single();

        if (error) {
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setNewMessage(content); // 실패 시 입력 내용 복원
            toast.error("메시지 전송 실패: " + error.message);
        } else {
            // 성공 시, 임시 메시지를 실제 DB 데이터로 교체합니다. (실시간 리스너는 이 메시지를 무시합니다)
            setMessages(prev => prev.map(msg => msg.id === tempId ? { ...savedMessage, sender: optimisticMessage.sender } : msg));
        }
    };
    
    if (!currentEmployee || !serverChatRoom) return <div className="p-8 text-center">로딩 중...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <header className="flex items-center justify-between p-4 border-b bg-white flex-shrink-0">
                <h3 className="text-lg font-bold truncate">{serverChatRoom.name}</h3>
                <button onClick={() => router.push('/chatrooms')} className="p-2 text-gray-500 hover:text-red-600 rounded-full">
                    <LeaveIcon />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                    {messages.map((msg) => {
                        const isSentByMe = String(msg.sender_id) === String(currentUserId);
                        return (
                            <div key={msg.id} className={`flex items-end gap-3 ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                                {!isSentByMe && (
                                    <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 text-sm" title={msg.sender?.full_name || '상대방'}>
                                        {msg.sender?.full_name?.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    {!isSentByMe && <p className="text-xs text-gray-500 mb-1 ml-1">{msg.sender?.full_name || '상대방'}</p>}
                                    <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${isSentByMe ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-white text-gray-800 rounded-bl-lg border'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400 self-end">
                                    {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false })}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div ref={messagesEndRef} />
            </div>

            <footer className="p-4 bg-white border-t flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400" disabled={!newMessage.trim()}>
                        <SendIcon />
                    </button>
                </form>
            </footer>
        </div>
    );
}