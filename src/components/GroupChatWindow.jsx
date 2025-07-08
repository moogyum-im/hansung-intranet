"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import styles from './ChatWindow.module.css';
import { useEmployee } from '@/contexts/EmployeeContext';
import ManageParticipantsModal from './ManageParticipantsModal';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> );
const FileAttachIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13.5" /></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );
const DownloadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V3" /></svg> );

const MessageContent = ({ msg }) => {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    
    switch (msg.message_type) {
        case 'image':
            return <Image src={msg.content} alt="전송된 이미지" width={300} height={300} className="rounded-lg object-cover cursor-pointer" onClick={() => window.open(msg.content, '_blank')} />;
        case 'file':
            try {
                const url = new URL(msg.content);
                const pathParts = url.pathname.split('/');
                const encodedFileName = pathParts[pathParts.length - 1];
                const fileName = decodeURIComponent(encodedFileName).substring(14);
                return (
                    <a href={msg.content} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-gray-100 rounded-lg hover:bg-gray-200 max-w-xs">
                        <DownloadIcon />
                        <span className="truncate underline">{fileName}</span>
                    </a>
                );
            } catch (e) {
                 return <p className={styles.messageContent}>{msg.content}</p>;
            }
        default:
            return (
                <p className={styles.messageContent}>
                    {msg.content.split(/(\s+)/).map((part, index) =>
                        urlRegex.test(part) ? (
                            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">{part}</a>
                        ) : (
                            part
                        )
                    )}
                </p>
            );
    }
};

export default function GroupChatWindow({ serverChatRoom, serverInitialMessages, serverInitialParticipants }) {
    const router = useRouter();
    const { employee: currentEmployee } = useEmployee();
    const [chatRoom, setChatRoom] = useState(serverChatRoom);
    const [messages, setMessages] = useState(serverInitialMessages);
    const [newMessage, setNewMessage] = useState('');
    const [participants, setParticipants] = useState(serverInitialParticipants);
    const [isManageModalOpen, setManageModalOpen] = useState(false);
    const [isEditingRoomName, setIsEditingRoomName] = useState(false);
    const [editedRoomName, setEditedRoomName] = useState(chatRoom.name);
    const [isUploading, setIsUploading] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const channelRef = useRef(null);
    
    const currentRoomId = chatRoom?.id;
    const currentUserId = currentEmployee?.id;

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    const fetchChatData = useCallback(async () => {
        if (!currentRoomId) return;
        const { data: pData } = await supabase.from('chat_room_participants').select('profiles(id, full_name, position)').eq('room_id', currentRoomId);
        if (pData) setParticipants(pData.map(p => p.profiles));
        const { data: mData } = await supabase.from('chat_messages').select(`*, sender:profiles(id, full_name)`).eq('room_id', currentRoomId).order('created_at');
        setMessages(mData || []);
    }, [currentRoomId]);

    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;
        fetchChatData();
        const channel = supabase.channel(`realtime_chat_room:${currentRoomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => { 
                const sender = participants.find(p => String(p.id) === String(payload.new.sender_id)) || { full_name: '알 수 없음' };
                setMessages(prev => [...prev, { ...payload.new, sender }]);
            })
            .subscribe();
        channelRef.current = channel;
        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, [currentRoomId, currentUserId, fetchChatData, participants]);
    
    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId) return;
        const content = newMessage.trim();
        setNewMessage('');
        await supabase.from('chat_messages').insert({ room_id: currentRoomId, sender_id: currentUserId, content: content, message_type: 'text' });
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !currentUserId) return;

        if (file.size > 10 * 1024 * 1024) {
            return toast.error("10MB 이하의 파일만 업로드할 수 있습니다.");
        }

        setIsUploading(true);
        const toastId = toast.loading('파일을 업로드하는 중입니다...');
        
        // ✨ [수정] 파일 이름에서 한글, 공백, 특수문자를 제거하고 영어, 숫자, 일부 특수기호만 남깁니다.
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${currentUserId}/${Date.now()}_${cleanFileName}`;

        try {
            const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
            const publicURL = urlData.publicUrl;
            
            const messageType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.name.split('.').pop().toLowerCase()) ? 'image' : 'file';

            const { error: messageError } = await supabase.from('chat_messages').insert({
                room_id: currentRoomId,
                sender_id: currentUserId,
                content: publicURL,
                message_type: messageType
            });

            if (messageError) throw messageError;
            toast.success("파일이 성공적으로 전송되었습니다.", { id: toastId });

        } catch (error) {
            toast.error(`파일 전송 실패: ${error.message}`, { id: toastId });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    // 이전과 동일한 함수들 (생략)
    const handleSaveRoomName = async () => { /* ... */ };
    const handleLeaveRoom = async () => { /* ... */ };
    
    if (!currentEmployee) return <div className="p-8 text-center">...</div>;

    return (
        <div className={styles.chatWindow}>
            <header className={styles.chatHeader}>
                {/* ... */}
            </header>

            <div className={styles.messagesContainer}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`${styles.messageBubble} ${String(msg.sender_id) === String(currentUserId) ? styles.sent : styles.received}`}>
                        {String(msg.sender_id) !== String(currentUserId) && (<div className={styles.senderName}>{msg.sender?.full_name || '상대방'}</div>)}
                        <MessageContent msg={msg} />
                        <span className={styles.messageTimestamp}>{new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className={styles.messageForm}>
                <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50">
                    <FileAttachIcon />
                </button>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요..." className={styles.messageInput} autoFocus />
                <button type="submit" className={styles.sendButton} disabled={!newMessage.trim() || isUploading}>
                    <SendIcon />
                </button>
            </form>
            {/* ... */}
        </div>
    );
}