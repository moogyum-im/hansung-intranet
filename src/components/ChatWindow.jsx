"use client";

import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { supabase } from '../lib/supabase/client';
import styles from './ChatWindow.module.css'; // CSS 모듈 임포트 확인
import { EmployeeContext } from '../contexts/EmployeeContext';
import InvitationModal from './ManageParticipantsModal';
import { Send, UserPlus, Paperclip } from 'lucide-react';

export default function GroupChatWindow({ chatRoom }) {
    const { employee: currentEmployee } = useContext(EmployeeContext);
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
            .subscribe();
        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [currentRoomId, currentUserId, fetchChatData, participants]);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const contentToSave = newMessage.trim();
        setNewMessage('');
        
        const tempId = `temp_${Date.now()}`;
        const optimisticMessage = { 
            id: tempId, 
            room_id: currentRoomId, 
            sender_id: currentUserId, 
            content: contentToSave, 
            created_at: new Date().toISOString(), 
            isOptimistic: true, 
            sender: { name: currentEmployee.full_name } 
        };
        setMessages(prev => [...prev, optimisticMessage]);

        const { error } = await supabase.from('chat_messages').insert({ 
            room_id: currentRoomId, 
            sender_id: currentUserId, 
            content: contentToSave 
        });

        if (error) {
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setNewMessage(contentToSave);
            alert("전송 실패: " + error.message);
        } else {
            fetchChatData(); // 성공 시 데이터 갱신
        }
    };
    
    if (!currentEmployee || !chatRoom) return <div className={styles.loading}>연결 중...</div>;

    return (
        <div className={styles.chatWindow}>
            <header className={styles.chatHeader}>
                <div>
                    <h3>{chatRoom.name}</h3>
                    <p style={{fontSize: '0.7rem', opacity: 0.6}}>
                        {participants.length}명 참여 중
                    </p>
                </div>
                <button onClick={() => setInviteModalOpen(true)} className="invite-btn">
                    <UserPlus size={18} />
                </button>
            </header>

            <div className={styles.messagesContainer}>
                <div className={styles.messagesList}>
                    {messages.map((msg) => {
                        const isMine = String(msg.sender_id) === String(currentUserId);
                        return (
                            <div key={msg.id} className={`${styles.messageWrapper} ${isMine ? styles.sentWrapper : styles.receivedWrapper}`}>
                                {!isMine && <div className={styles.senderName}>{msg.sender?.name}</div>}
                                <div className={`${styles.messageBubble} ${isMine ? styles.sentBubble : styles.receivedBubble}`}>
                                    {msg.content}
                                </div>
                                <span className={styles.messageTimestamp}>
                                    {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <form onSubmit={handleSendMessage} className={styles.messageForm}>
                <button type="button" className="attach-btn"><Paperclip size={20} /></button>
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="메시지를 입력하세요..." 
                    className={styles.messageInput}
                />
                <button type="submit" className={styles.sendButton} disabled={!newMessage.trim()}>
                    <Send size={18} />
                </button>
            </form>

            {isInviteModalOpen && (
                <InvitationModal 
                    isOpen={isInviteModalOpen} 
                    onClose={() => setInviteModalOpen(false)} 
                    chatRoomId={currentRoomId} 
                    currentParticipants={participants} 
                />
            )}
        </div>
    );
}