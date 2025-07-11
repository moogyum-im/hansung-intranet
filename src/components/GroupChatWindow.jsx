"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import ManageParticipantsModal from './ManageParticipantsModal';

const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> );
const FileAttachIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13.5" /></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );
const DownloadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V3" /></svg> );
const LeaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );

const MessageContent = ({ msg }) => {
    switch (msg.message_type) {
        case 'image': return <Image src={msg.content} alt="전송된 이미지" width={250} height={250} className="rounded-lg object-cover cursor-pointer" onClick={() => window.open(msg.content, '_blank')} />;
        case 'file':
            try {
                const fileName = decodeURIComponent(new URL(msg.content).pathname.split('/').pop()).substring(14);
                return (
                    <a href={msg.content} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-gray-100 rounded-lg hover:bg-gray-200 border max-w-xs">
                        <DownloadIcon /><span className="truncate underline text-sm">{fileName}</span>
                    </a>
                );
            } catch (e) { return <p className="text-sm">{msg.content}</p>; }
        default: return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
    }
};

export default function GroupChatWindow({ serverChatRoom, serverInitialMessages, serverInitialParticipants }) {
    const router = useRouter();
    const { employee: currentEmployee } = useEmployee();
    const [chatRoom, setChatRoom] = useState(serverChatRoom);
    const [messages, setMessages] = useState(serverInitialMessages || []);
    const [participants, setParticipants] = useState((serverInitialParticipants || []).filter(Boolean));
    const [newMessage, setNewMessage] = useState('');
    const [isManageModalOpen, setManageModalOpen] = useState(false);
    const [isEditingRoomName, setIsEditingRoomName] = useState(false);
    const [editedRoomName, setEditedRoomName] = useState(chatRoom?.name);
    const [isUploading, setIsUploading] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const channelRef = useRef(null);
    
    const currentRoomId = chatRoom?.id;
    const currentUserId = currentEmployee?.id;
    const isRoomCreator = chatRoom?.created_by === currentUserId;

    const scrollToBottom = useCallback(() => {
        setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
    }, []);

    const fetchChatData = useCallback(async () => {
        if (!currentRoomId) return;
        const { data: pData } = await supabase.from('chat_room_participants').select('profiles(id, full_name, position)').eq('room_id', currentRoomId);
        if (pData) {
            const validParticipants = pData.map(p => p.profiles).filter(Boolean);
            setParticipants(validParticipants);
        }
    }, [currentRoomId]);

    useEffect(() => {
        if (messages.length) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;

        const markAsRead = async () => {
            await supabase
                .from('chat_room_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('room_id', currentRoomId)
                .eq('user_id', currentUserId);
        };
        markAsRead();

        const handleNewMessage = (payload) => {
            if (!payload.new || !payload.new.id) {
                return;
            }
            const senderProfile = participants.find(p => p.id === payload.new.sender_id);
            const messageWithSender = { ...payload.new, sender: senderProfile || { full_name: '알 수 없음' } };
            setMessages(prev => {
                if (prev.some(msg => msg.id === messageWithSender.id)) return prev;
                return [...prev, messageWithSender];
            });
            if(payload.new.sender_id !== currentUserId) {
                markAsRead();
            }
        };

        // ★★★★★ 핵심 수정사항 ★★★★★
        // 채널 이름 뒤에 '-v3'를 붙여서, 완전히 새로운 연결을 시도합니다.
        const channel = supabase.channel(`realtime_chat_room_v3:${currentRoomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${currentRoomId}` }, handleNewMessage)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants', filter: `room_id=eq.${currentRoomId}` }, fetchChatData)
            .subscribe();
        channelRef.current = channel;

        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, [currentRoomId, currentUserId, participants, fetchChatData]);

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
            const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);
            const messageType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.name.split('.').pop().toLowerCase()) ? 'image' : 'file';
            await supabase.from('chat_messages').insert({ room_id: currentRoomId, sender_id: currentUserId, content: urlData.publicUrl, message_type: messageType });
            toast.success("파일 전송 완료!", { id: toastId });
        } catch (error) {
            toast.error(`파일 전송 실패: ${error.message}`);
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    const handleSaveRoomName = async () => { /* ... */ };
    const handleLeaveRoom = async () => { /* ... */ };
    
    if (!currentEmployee || !chatRoom) return <div className="p-8 text-center">로딩 중...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <header className="flex items-center justify-between p-4 border-b bg-white flex-shrink-0">
                <div className="flex items-center min-w-0">
                    <h3 className="text-lg font-bold truncate">{chatRoom.name}</h3>
                    {isRoomCreator && !chatRoom.is_direct_message && (
                        <button onClick={() => setIsEditingRoomName(true)} className="ml-2 p-1 text-gray-500 hover:text-gray-800 rounded-full"><EditIcon /></button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!chatRoom.is_direct_message && (
                        <button onClick={() => setManageModalOpen(true)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300">
                            참여자 관리
                        </button>
                    )}
                    <button onClick={handleLeaveRoom} className="p-2 text-gray-500 hover:text-red-600 rounded-full"><LeaveIcon /></button>
                </div>
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
                                <div className="flex flex-col gap-1 w-full max-w-md">
                                    {!isSentByMe && <p className="text-xs text-gray-500 ml-3">{msg.sender?.full_name || '알 수 없음'}</p>}
                                    <div className={`flex items-end gap-2 ${isSentByMe ? 'flex-row-reverse' : ''}`}>
                                        <div className={`p-1 rounded-2xl ${isSentByMe ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border'}`}>
                                            <div className="p-2"><MessageContent msg={msg} /></div>
                                        </div>
                                        <span className="text-xs text-gray-400 self-end flex-shrink-0">
                                            {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false })}
                                        </span>
                                    </div>
                                </div>
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
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요..." className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400" disabled={!newMessage.trim() || isUploading}>
                        <SendIcon />
                    </button>
                </form>
            </footer>

            {isManageModalOpen && (
                <ManageParticipantsModal isOpen={isManageModalOpen} onClose={(isChanged) => { setManageModalOpen(false); if(isChanged) fetchChatData(); }} chatRoom={chatRoom} initialParticipants={participants} />
            )}
        </div>
    );
}