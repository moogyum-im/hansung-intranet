"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import ManageParticipantsModal from './ManageParticipantsModal';

// 아이콘 컴포넌트들
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );
const FileAttachIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13.5" /></svg> );
const LeaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const DownloadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V3" /></svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> );

// ★★★ 답장 내용을 표시하는 컴포넌트 ★★★
const MessageContent = ({ msg, allMessages }) => {
    // 답장 메시지인 경우, 현재 채팅 목록에서 원본 메시지를 찾습니다.
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
        // ★★★ 배경색과 글자색을 더 잘 보이도록 수정했습니다. ★★★
        <div className="bg-gray-200 p-2 rounded-md mb-2 text-xs text-gray-700 border-l-2 border-gray-500">
            <p className="font-semibold text-gray-800">{repliedToMessage.sender?.full_name || '...'}에게 답장</p>
            <p className="truncate">{repliedContent}</p>
        </div>
    );
};
    switch (msg.message_type) {
        case 'image': 
            return ( <div> {renderRepliedMessage()} <Image src={msg.content} alt="전송된 이미지" width={250} height={250} className="rounded-lg object-cover cursor-pointer" onClick={() => window.open(msg.content, '_blank')} /> </div> );
        case 'file':
            try {
                const fileInfo = JSON.parse(msg.content);
                return ( <div> {renderRepliedMessage()} <a href={fileInfo.url} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-gray-100 rounded-lg hover:bg-gray-200 border max-w-xs"><DownloadIcon /><span className="truncate underline text-sm">{fileInfo.name}</span></a></div> );
            } catch (e) { return <p className="text-sm text-red-500">파일 정보를 표시할 수 없습니다.</p>; }
        default: 
            return ( <div> {renderRepliedMessage()} <p className="text-sm whitespace-pre-wrap">{msg.content}</p> </div> );
    }
};

export default function GroupChatWindow({ serverChatRoom, serverInitialMessages, serverInitialParticipants }) {
    const router = useRouter();
    const { employee: currentEmployee } = useEmployee();
    const [messages, setMessages] = useState(serverInitialMessages || []);
    const [newMessage, setNewMessage] = useState('');
    const [isManageModalOpen, setManageModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});
    
    // ★★★ 1. 답장할 메시지를 저장할 상태 추가 ★★★
    const [replyingTo, setReplyingTo] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);
    
    const currentRoomId = serverChatRoom?.id;
    const currentUserId = currentEmployee?.id;

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const fetchUnreadCounts = useCallback(async () => {
        if (!currentRoomId) return;
        const { data, error } = await supabase.rpc('get_unread_counts_for_my_messages', { p_room_id: currentRoomId });
        if (error) {
            console.error("안 읽음 숫자 로딩 실패:", error);
            return;
        }
        if (data) {
            const countsMap = data.reduce((acc, item) => {
                acc[item.message_id] = item.unread_count;
                return acc;
            }, {});
            setUnreadCounts(countsMap);
        }
    }, [currentRoomId]);

    useEffect(() => { scrollToBottom(); }, [messages]);

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
                    const { data: newMessageData } = await supabase.from('chat_messages').select('*, sender:profiles(full_name, avatar_url)').eq('id', payload.new.id).single();
                    if (newMessageData) {
                        setMessages(prev => [...prev, newMessageData]);
                        if (newMessageData.sender_id === currentUserId) {
                            fetchUnreadCounts();
                        } else {
                            await markAsRead();
                        }
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_room_participants', filter: `room_id=eq.${currentRoomId}` }, 
                () => fetchUnreadCounts()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentRoomId, currentUserId, fetchUnreadCounts]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId) return;
        const content = newMessage.trim();
        
        const messageData = {
            room_id: currentRoomId,
            sender_id: currentUserId,
            content: content,
            message_type: 'text',
            // ★★★ 2. 답장하는 메시지 ID를 함께 저장 ★★★
            replied_to_message_id: replyingTo ? replyingTo.id : null,
        };
        
        // ★★★ 3. 메시지 전송 후 입력창과 답장 상태 초기화 ★★★
        setNewMessage('');
        setReplyingTo(null);

        const { error } = await supabase.from('chat_messages').insert(messageData);
        if (error) {
            toast.error("메시지 전송 실패: " + error.message);
            setNewMessage(content); // 실패 시 입력 내용 복구
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !currentUserId) {
            if (!file) toast.error("파일이 선택되지 않았습니다.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('파일 업로드 중...');
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${currentUserId}/${Date.now()}_${cleanFileName}`;

        try {
            const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, file);
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);
            const messageType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.name.split('.').pop().toLowerCase()) ? 'image' : 'file';
            const content = messageType === 'image' ? urlData.publicUrl : JSON.stringify({ name: file.name, url: urlData.publicUrl });

            await supabase.from('chat_messages').insert({ room_id: currentRoomId, sender_id: currentUserId, content: content, message_type: messageType, replied_to_message_id: replyingTo ? replyingTo.id : null });
            
            setReplyingTo(null); // 파일 전송 후에도 답장 상태 초기화
            toast.success("파일 전송 완료!", { id: toastId });
        } catch (error) {
            toast.error(`파일 전송 실패: ${error.message}`, { id: toastId });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    const handleLeaveRoom = async () => {
        if (!currentUserId || !currentRoomId) {
            toast.error("채팅방 정보를 찾을 수 없습니다.");
            return;
        }

        if (window.confirm('정말로 이 채팅방을 나가시겠습니까?')) {
            try {
                const { error } = await supabase.from('chat_room_participants').delete().eq('user_id', currentUserId).eq('room_id', currentRoomId);
                if (error) throw error;
                toast.success('채팅방에서 나갔습니다.');
                router.push('/chatrooms');
                router.refresh();
            } catch (error) {
                console.error('채팅방 나가기 실패:', error);
                toast.error(`오류가 발생했습니다: ${error.message}`);
            }
        }
    };

    // ★★★ 4. 답장할 메시지를 선택하는 함수 추가 ★★★
    const handleSetReply = (message) => {
        setReplyingTo(message);
        messageInputRef.current?.focus();
    };
    
    if (!currentEmployee || !serverChatRoom) return <div className="p-8 text-center">로딩 중...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <header className="flex items-center justify-between p-4 border-b bg-white flex-shrink-0">
                <h3 className="text-lg font-bold truncate">{serverChatRoom.name}</h3>
                <div className="flex items-center gap-2">
                    {!serverChatRoom.is_direct_message && ( <button onClick={() => setManageModalOpen(true)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300"> 참여자 관리 </button> )}
                    <button onClick={handleLeaveRoom} className="p-2 text-gray-500 hover:text-red-600 rounded-full"><LeaveIcon /></button>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                    {messages.map((msg) => {
                        const isSentByMe = String(msg.sender_id) === String(currentUserId);
                        const unreadCount = unreadCounts[msg.id] || 0;

                        return (
                            // ★★★ 5. 메시지 버블을 클릭하면 답장으로 선택되도록 onClick 추가 ★★★
                            <div key={msg.id} onClick={() => handleSetReply(msg)} className={`flex items-end gap-3 cursor-pointer ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                                {!isSentByMe && (
                                    <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 text-sm" title={msg.sender?.full_name}>
                                        {msg.sender?.full_name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <div className="flex flex-col gap-1 w-full max-w-md">
                                    {!isSentByMe && <p className="text-xs text-gray-500 ml-3">{msg.sender?.full_name}</p>}
                                    <div className={`flex items-end gap-2 ${isSentByMe ? 'flex-row-reverse' : ''}`}>
                                        {isSentByMe && unreadCount > 0 && (
                                            <span className="text-xs text-yellow-500 self-end mb-1 font-semibold">{unreadCount}</span>
                                        )}
                                        <div className={`p-1 rounded-2xl ${isSentByMe ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border'}`}>
                                            {/* ★★★ 6. 답장 내용을 표시하기 위해 allMessages 전달 ★★★ */}
                                            <div className="p-2"><MessageContent msg={msg} allMessages={messages} /></div>
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
                {/* ★★★ 7. 답장 미리보기 UI 추가 ★★★ */}
                {replyingTo && (
                    <div className="p-2 mb-2 bg-gray-100 rounded-lg text-sm border-l-4 border-blue-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-blue-600">{replyingTo.sender.full_name}에게 답장</p>
                                <p className="text-gray-600 truncate">{replyingTo.message_type === 'text' ? replyingTo.content : (replyingTo.message_type === 'image' ? '사진' : '파일')}</p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-gray-200">
                                <CloseIcon />
                            </button>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50">
                        <FileAttachIcon />
                    </button>
                    <input ref={messageInputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요..." className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" autoFocus />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400" disabled={!newMessage.trim() || isUploading}>
                        <SendIcon />
                    </button>
                </form>
            </footer>
            {isManageModalOpen && (
                <ManageParticipantsModal isOpen={isManageModalOpen} onClose={(isChanged) => { setManageModalOpen(false); if(isChanged) router.refresh(); }} chatRoom={serverChatRoom} initialParticipants={serverInitialParticipants} />
            )}
        </div>
    );
}