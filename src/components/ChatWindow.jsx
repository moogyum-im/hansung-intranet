// src/components/GroupChatWindow.jsx
"use client";

import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { supabase } from '../lib/supabase/client';
import styles from './ChatWindow.module.css'; // ★★★ 새로 만든 CSS 파일을 import 합니다 ★★★
import { useEmployee } from '../contexts/EmployeeContext';
import InvitationModal from './ManageParticipantsModal';

export default function GroupChatWindow({ chatRoom }) {
    const { currentEmployee } = useContext(EmployeeContext);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [participants, setParticipants] = useState([]);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const channelRef = useRef(null);
    
    const currentRoomId = chatRoom?.id;
    const currentUserId = currentEmployee?.id;

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const fetchChatData = useCallback(async () => {
        if (!currentRoomId) return;
        const { data: pData } = await supabase.from('room_participants').select('profiles(id, name: full_name)').eq('room_id', currentRoomId);
        if(pData) setParticipants(pData.map(p => p.profiles));
        const { data: mData } = await supabase.from('chat_messages').select(`*, sender:profiles(id, name: full_name)`).eq('room_id', currentRoomId).order('created_at');
        setMessages(mData || []);
    }, [currentRoomId]);

    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;
        fetchChatData();
        
        if (channelRef.current) return;
        const channel = supabase.channel(`realtime_chat_room:${currentRoomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${currentRoomId}`}, async (payload) => {
                const senderId = payload.new.sender_id;
                if (senderId === currentUserId) return;
                let sender = participants.find(p => p.id === senderId);
                if (!sender) {
                    const { data: senderProfile } = await supabase.from('profiles').select('full_name').eq('id', senderId).single();
                    sender = { name: senderProfile?.full_name || '알 수 없음' };
                }
                setMessages(prev => [...prev, { ...payload.new, sender }]);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_participants', filter: `room_id=eq.${currentRoomId}`}, (payload) => {
                fetchChatData();
            })
            .subscribe();
        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [currentRoomId, currentUserId, fetchChatData, participants]);

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const contentToSave = newMessage.trim();
        setNewMessage('');
        
        const tempId = `temp_${Date.now()}`;
        const optimisticMessage = { id: tempId, room_id: currentRoomId, sender_id: currentUserId, content: contentToSave, created_at: new Date().toISOString(), isOptimistic: true, sender: { name: currentEmployee.name } };
        setMessages(prev => [...prev, optimisticMessage]);

        const { data, error } = await supabase.from('chat_messages').insert({ room_id: currentRoomId, sender_id: currentUserId, content: contentToSave }).select(`*, sender:profiles(id, name: full_name)`).single();
        if (error) {
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setNewMessage(contentToSave);
            alert("메시지 전송 실패: " + error.message);
        } else {
            setMessages(prev => prev.map(msg => (msg.id === tempId ? { ...data, isOptimistic: false } : msg)));
        }
    };
    
    if (!currentEmployee || !chatRoom) return <div className={styles.loading}>채팅방 정보를 불러오는 중입니다...</div>;

    return (
        // ★★★ 이제 모든 className이 새로운 스타일을 가리킵니다! ★★★
        <div className={styles.chatWindow}>
             <header className={styles.chatHeader}>
                <div className="flex-1">
                    <h3 className="font-bold">{chatRoom.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{participants.map(p => p?.name).filter(Boolean).join(', ')}</p>
                </div>
                <button onClick={() => setInviteModalOpen(true)} className="ml-4 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700">초대하기</button>
            </header>
            <div className={styles.messagesContainer}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`${styles.messageBubble} ${String(msg.sender_id) === String(currentUserId) ? styles.sent : styles.received}`}>
                        {String(msg.sender_id) !== String(currentUserId) && (<div className={styles.senderName}>{msg.sender?.name || '상대방'}</div>)}
                        <p className={styles.messageContent}>{msg.content}</p>
                        <span className={styles.messageTimestamp}>{new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className={styles.messageForm}>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요..." className={styles.messageInput} autoFocus />
                <button type="submit" className={styles.sendButton} disabled={!newMessage.trim()}>전송</button>
            </form>
            {isInviteModalOpen && (<InvitationModal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} chatRoomId={currentRoomId} currentParticipants={participants} />)}
        </div>
    );
}