// 파일 경로: src/components/GroupChatWindow.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import styles from './ChatWindow.module.css';
import { useEmployee } from '@/contexts/EmployeeContext';
import InvitationModal from './InvitationModal';

// 아이콘 컴포넌트들 (변경 없음)
const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> );
const FileAttachIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13.5" /></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );

export default function GroupChatWindow({ serverChatRoom, serverInitialMessages, serverInitialParticipants }) {
    const { employee: currentEmployee } = useEmployee();
    const [messages, setMessages] = useState(serverInitialMessages);
    const [newMessage, setNewMessage] = useState('');
    const [participants, setParticipants] = useState(serverInitialParticipants);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [isEditingRoomName, setIsEditingRoomName] = useState(false);
    const [editedRoomName, setEditedRoomName] = useState(serverChatRoom.name);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const channelRef = useRef(null);
    const chatContainerRef = useRef(null); // ★★★ 빠졌던 변수 선언 추가 ★★★

    const currentRoomId = serverChatRoom?.id;
    const currentUserId = currentEmployee?.id;
    const isRoomCreator = serverChatRoom.created_by === currentUserId;

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    const fetchChatData = useCallback(async () => {
        if (!currentRoomId) return;
        const { data: pData } = await supabase.from('chat_room_participants').select('profiles(id, full_name)').eq('room_id', currentRoomId);
        if (pData) setParticipants(pData.map(p => p.profiles));
        const { data: mData } = await supabase.from('chat_messages').select(`*, sender:profiles(id, full_name)`).eq('room_id', currentRoomId).order('created_at');
        setMessages(mData || []);
        setTimeout(() => scrollToBottom('instant'), 100);
    }, [currentRoomId, scrollToBottom]);

    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;
        fetchChatData();

        const channel = supabase.channel(`realtime_chat_room:${currentRoomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${currentRoomId}` },
                (payload) => {
                    const messagesContainer = chatContainerRef.current;
                    const isScrolledToBottom = messagesContainer
                        ? messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 100
                        : false;

                    const getSenderAndSetMessage = async () => {
                        if (String(payload.new.sender_id) === String(currentUserId)) return;
                        const sender = participants.find(p => String(p.id) === String(payload.new.sender_id)) || { full_name: '알 수 없음' };
                        const newMessage = { ...payload.new, sender };
                        setMessages(prev => [...prev, newMessage]);
                        if (isScrolledToBottom) {
                            setTimeout(() => scrollToBottom('smooth'), 100);
                        }
                    };
                    getSenderAndSetMessage();
                })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants', filter: `room_id=eq.${currentRoomId}` },
                (payload) => {
                    console.log('참여자 변경 감지! 채팅방 데이터를 새로고침합니다.', payload);
                    fetchChatData();
                })
            .subscribe();

        channelRef.current = channel;
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [currentRoomId, currentUserId, fetchChatData, participants, scrollToBottom]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId || !currentRoomId) return;
        const messageContent = newMessage.trim();
        const tempId = `temp_${Date.now()}`;

        const optimisticMessage = {
            id: tempId,
            room_id: currentRoomId,
            sender_id: currentUserId,
            content: messageContent,
            created_at: new Date().toISOString(),
            isOptimistic: true,
            sender: { full_name: currentEmployee.full_name }
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setTimeout(() => scrollToBottom('smooth'), 100);

        const { data, error } = await supabase.from('chat_messages').insert({ room_id: currentRoomId, sender_id: currentUserId, content: messageContent }).select(`*, sender:profiles(id, full_name)`).single();

        if (error) {
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setNewMessage(messageContent);
            alert("메시지 전송 실패: " + error.message);
        } else {
            setMessages(prev => prev.map(msg => (msg.id === tempId ? { ...data, isOptimistic: false } : msg)));
        }
    };
    
    const handleSaveRoomName = async () => { /* ... */ };
    const handleFileChange = async (event) => { /* ... */ };
    const triggerFileInput = () => { fileInputRef.current?.click(); };

    return (
        <div className={styles.chatWindow}>
            <header className={styles.chatHeader}>
                {isEditingRoomName ? (
                    <div className="flex items-center flex-1 mr-2">
                        <input
                            type="text"
                            value={editedRoomName}
                            onChange={(e) => setEditedRoomName(e.target.value)}
                            className="text-lg font-bold p-1 border rounded w-full"
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveRoomName()}
                            autoFocus
                        />
                        <button onClick={handleSaveRoomName} className="ml-2 text-green-600 hover:text-green-800 font-semibold text-sm">저장</button>
                        <button onClick={() => { setIsEditingRoomName(false); setEditedRoomName(serverChatRoom.name); }} className="ml-2 text-gray-500 hover:text-gray-700 text-sm">취소</button>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center min-w-0">
                        <h3 className="text-xl font-bold truncate">{serverChatRoom.name}</h3>
                        {isRoomCreator && (
                            <button onClick={() => setIsEditingRoomName(true)} className="ml-2 text-gray-400 hover:text-gray-600 p-1 rounded-full">
                                <EditIcon />
                            </button>
                        )}
                        <p className="text-sm text-gray-500 truncate ml-4 hidden sm:block">{participants.map(p => p?.full_name).filter(Boolean).join(', ')}</p>
                    </div>
                )}
                
                {!serverChatRoom.is_direct_message && (
                    <button onClick={() => setInviteModalOpen(true)} className="ml-4 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700">초대하기</button>
                )}
            </header>

            <div ref={chatContainerRef} className={styles.messagesContainer}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`${styles.messageBubble} ${String(msg.sender_id) === String(currentUserId) ? styles.sent : styles.received}`}>
                        {String(msg.sender_id) !== String(currentUserId) && (<div className={styles.senderName}>{msg.sender?.full_name || '상대방'}</div>)}
                        <p className={styles.messageContent}>{msg.content}</p>
                        <span className={styles.messageTimestamp}>
                            {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            {msg.isOptimistic && <span className={styles.optimisticIndicator}>(전송중)</span>}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className={styles.messageForm}>
                <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={triggerFileInput} className={styles.attachButton}>
                    <FileAttachIcon />
                </button>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요..." className={styles.messageInput} autoFocus />
                <button type="submit" className={styles.sendButton} disabled={!newMessage.trim()}>
                    <SendIcon />
                </button>
            </form>
            {isInviteModalOpen && (<InvitationModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} chatRoom={serverChatRoom} currentParticipants={participants} />)}
        </div>
    );
}