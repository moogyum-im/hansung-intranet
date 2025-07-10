"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

// 아이콘 컴포넌트
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );
const LeaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const FileAttachIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13.5" /></svg> );

export default function GroupChatWindow({ serverChatRoom, serverInitialMessages, serverInitialParticipants }) {
    const router = useRouter();
    const { employee: currentEmployee } = useEmployee();
    const [messages, setMessages] = useState(serverInitialMessages);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const channelRef = useRef(null);
    
    const currentRoomId = serverChatRoom?.id;
    const currentUserId = currentEmployee?.id;

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
    }, []);

    useEffect(() => {
        // 메시지 목록이 처음 로드되거나, 새 메시지가 추가될 때 스크롤을 맨 아래로 이동
        if (messages.length) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;

        const handleNewMessage = (payload) => {
            // 보낸 사람의 정보를 찾아서 메시지에 추가
            const senderProfile = serverInitialParticipants.find(p => p.id === payload.new.sender_id);
            const messageWithSender = { ...payload.new, sender: senderProfile || { full_name: '알 수 없음' } };
            setMessages(prev => [...prev, messageWithSender]);
        };

        const channel = supabase.channel(`realtime_chat_room:${currentRoomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${currentRoomId}` }, handleNewMessage)
            .subscribe();
        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [currentRoomId, currentUserId, serverInitialParticipants]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId) return;
        const content = newMessage.trim();
        setNewMessage('');
        await supabase.from('chat_messages').insert({ room_id: currentRoomId, sender_id: currentUserId, content, message_type: 'text' });
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !currentUserId) return;
        if (file.size > 10 * 1024 * 1024) return toast.error("10MB 이하의 파일만 업로드할 수 있습니다.");

        setIsUploading(true);
        const toastId = toast.loading('파일을 업로드하는 중입니다...');
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${currentUserId}/${Date.now()}_${cleanFileName}`;

        try {
            const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
            const messageType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.name.split('.').pop().toLowerCase()) ? 'image' : 'file';
            await supabase.from('chat_messages').insert({ room_id: currentRoomId, sender_id: currentUserId, content: urlData.publicUrl, message_type: messageType });
            toast.success("파일 전송 완료!", { id: toastId });
        } catch (error) {
            toast.error(`파일 전송 실패: ${error.message}`, { id: toastId });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    if (!currentEmployee || !serverChatRoom) {
        return <div className="p-8 text-center">로딩 중...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <header className="flex items-center justify-between p-4 border-b bg-white flex-shrink-0">
                <h3 className="text-lg font-bold truncate">{serverChatRoom.name}</h3>
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
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50">
                        <FileAttachIcon />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400" disabled={!newMessage.trim() || isUploading}>
                        <SendIcon />
                    </button>
                </form>
            </footer>
        </div>
    );
}