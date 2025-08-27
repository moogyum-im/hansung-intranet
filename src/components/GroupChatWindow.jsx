"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import ManageParticipantsModal from './ManageParticipantsModal';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// 아이콘 컴포넌트들 (생략)
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );
const FileAttachIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13.5" /></svg> );
const LeaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const DownloadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V3" /></svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> );

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
            <div className="bg-gray-200 p-2 rounded-md mb-2 text-xs text-gray-700 border-l-2 border-gray-500">
                <p className="font-semibold text-gray-800">{repliedToMessage.sender?.full_name || '...'}에게 답장</p>
                <p className="truncate">{repliedContent}</p>
            </div>
        );
    };
    switch (msg.message_type) {
        case 'image': 
            return ( <div> {renderRepliedMessage()} <Image src={msg.content} alt="전송된 이미지" width={250} height={250} unoptimized={true} className="rounded-lg object-cover cursor-pointer" onClick={() => window.open(msg.content, '_blank')} /> </div> );
        case 'file':
            try {
                const fileInfo = JSON.parse(msg.content);
                return ( <div> {renderRepliedMessage()} <a href={fileInfo.url} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-gray-100 rounded-lg hover:bg-gray-200 border max-w-xs"><DownloadIcon /><span className="truncate underline text-sm">{fileInfo.name}</span></a></div> );
            } catch (e) { return <p className="text-sm text-red-500">파일 정보를 표시할 수 없습니다.</p>; }
        default: 
            return ( <div> {renderRepliedMessage()} <p className="text-sm whitespace-pre-wrap">{msg.content}</p> </div> );
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
    const isRoomCreator = chatRoom?.created_by === currentUserId;

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
    }, [currentRoomId, currentUserId]);

    useEffect(() => { 
        scrollToBottom(); 
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;
        const markAsRead = async () => {
            const { error } = await supabase.from('chat_room_participants').update({ last_read_at: new Date().toISOString() }).eq('room_id', currentRoomId).eq('user_id', currentUserId);
            if (error) console.error("메시지 읽음 처리 실패:", error);
        };
        markAsRead();
        fetchUnreadCounts();
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        const channel = supabase.channel(`room-final-${currentRoomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${currentRoomId}` }, 
                async (payload) => {
                    if (payload.new.sender_id === currentUserId) {
                        return;
                    }

                    const { data: newMessageData, error: fetchError } = await supabase.from('chat_messages').select('*, sender:profiles(id, full_name, avatar_url)').eq('id', payload.new.id).single();
                    if (fetchError) {
                        console.error("새 메시지 상세 정보 로딩 실패:", fetchError);
                        return;
                    }
                    if (newMessageData) {
                        setMessages(prev => {
                            if (prev.some(msg => msg.id === newMessageData.id)) {
                                return prev;
                            }
                            return [...prev, newMessageData];
                        });
                        await markAsRead();
                    }
                }
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants', filter: `room_id=eq.${currentRoomId}` }, 
                async (payload) => {
                    const { data: pData, error: pError } = await supabase.from('chat_room_participants').select('profiles(id, full_name, position)').eq('room_id', currentRoomId);
                    if (pError) {
                        console.error("실시간 참여자 목록 업데이트 오류:", pError);
                        toast.error("참여자 목록 업데이트 실패.");
                    } else if (pData) {
                        setParticipants(pData.map(p => p.profiles));
                        fetchUnreadCounts();
                    }
                }
            )
            .subscribe();
        channelRef.current = channel;
        return () => { 
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [currentRoomId, currentUserId, fetchUnreadCounts]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId || !currentRoomId || employeeLoading) {
            toast.error("메시지 전송에 필요한 정보가 아직 로드되지 않았습니다.");
            return;
        }
        
        const content = newMessage.trim();
        const repliedToId = replyingTo ? replyingTo.id : null;

        setNewMessage('');
        setReplyingTo(null);
        if (messageInputRef.current) messageInputRef.current.focus();

        const tempMessageId = Date.now().toString();
        const messageData = {
            room_id: currentRoomId,
            sender_id: currentUserId,
            content: content,
            message_type: 'text',
            replied_to_message_id: repliedToId,
        };

        const tempMessage = {
            id: tempMessageId,
            ...messageData,
            created_at: new Date().toISOString(),
            sender: employee,
        };
        
        setMessages(prev => [...prev, tempMessage]);
        scrollToBottom();

        const localSupabase = getSupabaseClient();
        try {
            const { data: insertedMessage, error } = await localSupabase.from('chat_messages').insert(messageData).select('*, sender:profiles(id, full_name, avatar_url)').single();
            
            if (error) {
                console.error("★★★ 메시지 DB 삽입 실패 오류! ★★★", error); 
                toast.error(`메시지 전송에 실패했습니다: ${error.message}`); 
                setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
                setNewMessage(content);
            } else if (insertedMessage) {
                setMessages(prev => prev.map(msg => msg.id === tempMessageId ? insertedMessage : msg));
                fetchUnreadCounts();
            }
        } catch (e) {
            console.error("Supabase insert 호출 중 예외 발생:", e);
            toast.error(`메시지 전송 중 예외 발생: ${e.message || '알 수 없는 오류'}`);
            setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
            setNewMessage(content);
        }
    };
    
    // =================  afectada =================
    const handleFileChange = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !currentUserId || !currentRoomId || employeeLoading) {
            if (!files || files.length === 0) toast.error("파일이 선택되지 않았습니다.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading(`${files.length}개의 파일 업로드 중...`);
        const repliedToId = replyingTo ? replyingTo.id : null;
        setReplyingTo(null);
        if (messageInputRef.current) messageInputRef.current.focus();

        const uploadPromises = Array.from(files).map(async (file) => {
            const tempMessageId = `${Date.now()}-${file.name}`;
            
            const tempFileMessage = {
                id: tempMessageId,
                room_id: currentRoomId,
                sender_id: currentUserId,
                content: `"${file.name}" 파일 업로드 중...`,
                message_type: 'text',
                created_at: new Date().toISOString(),
                sender: employee,
                replied_to_message_id: repliedToId,
            };
            setMessages(prev => [...prev, tempFileMessage]);
            scrollToBottom();

            try {
                // [수정] 파일 저장 방식을 무작위 UUID 이름으로 변경하여 안정성 확보
                const fileExtension = file.name.split('.').pop() ?? '';
                const randomFileName = `${crypto.randomUUID()}.${fileExtension}`;
                const filePath = `${currentUserId}/${randomFileName}`;
                
                const localSupabase = getSupabaseClient();

                const { error: uploadError } = await localSupabase.storage.from('chat-files').upload(filePath, file);
                if (uploadError) throw uploadError;

                const { data: urlData } = localSupabase.storage.from('chat-files').getPublicUrl(filePath);
                if (!urlData || !urlData.publicUrl) throw new Error("파일 URL을 가져오는 데 실패했습니다.");

                const messageType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.name.split('.').pop()?.toLowerCase()) ? 'image' : 'file';
                // [수정] DB에 저장할 content에는 원본 파일 이름(file.name)을 사용합니다.
                const content = messageType === 'image' ? urlData.publicUrl : JSON.stringify({ name: file.name, url: urlData.publicUrl });
                
                const messageData = {
                    room_id: currentRoomId, 
                    sender_id: currentUserId, 
                    content: content, 
                    message_type: messageType, 
                    replied_to_message_id: repliedToId
                };
                
                const { data: insertedMessage, error: insertError } = await localSupabase.from('chat_messages').insert(messageData).select('*, sender:profiles(id, full_name, avatar_url)').single();
                if (insertError) {
                    await localSupabase.storage.from('chat-files').remove([filePath]);
                    throw insertError;
                }

                if (insertedMessage) {
                    setMessages(prev => prev.map(msg => msg.id === tempMessageId ? insertedMessage : msg));
                } else {
                    setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
                }
            } catch (error) {
                console.error(`"${file.name}" 업로드 실패:`, error);
                setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
                throw new Error(`"${file.name}" 업로드 실패`);
            }
        });

        try {
            await Promise.all(uploadPromises);
            fetchUnreadCounts();
            toast.success(`${files.length}개 파일 전송 완료!`, { id: toastId });
        } catch (error) {
            toast.error(`일부 파일 전송 실패.`, { id: toastId });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    // =============================================
    
    const handleSaveRoomName = async () => {
        if (!editedRoomName.trim() || editedRoomName === chatRoom.name) {
            setIsEditingRoomName(false);
            return;
        }
        const toastId = toast.loading('채팅방 이름을 변경 중입니다...');
        try {
            const { error } = await supabase
                .from('chat_rooms')
                .update({ name: editedRoomName.trim() })
                .eq('id', currentRoomId);
            if (error) throw error;
            setEditedRoomName(editedRoomName.trim());
            setIsEditingRoomName(false);
            toast.success('채팅방 이름이 변경되었습니다.', { id: toastId });
        } catch (error) {
            console.error("채팅방 이름 변경 실패:", error);
            toast.error(`이름 변경 실패: ${error.message}`, { id: toastId });
        }
    };

    const handleLeaveRoom = async () => {
        if (!currentUserId || !currentRoomId) {
            toast.error("채팅방 정보를 찾을 수 없습니다.");
            return;
        }
        if (window.confirm('정말로 이 채팅방을 나가시겠습니까?')) {
            const toastId = toast.loading('채팅방을 나가는 중...');
            try {
                const { error } = await supabase.from('chat_room_participants').delete().eq('user_id', currentUserId).eq('room_id', currentRoomId);
                if (error) throw error;
                const { count: remainingParticipantsCount, error: countError } = await supabase
                    .from('chat_room_participants')
                    .select('*', { count: 'exact' })
                    .eq('room_id', currentRoomId);
                if (countError) console.warn("남은 참여자 수 확인 실패:", countError);
                if (remainingParticipantsCount === 0) {
                    const { error: roomDeleteError } = await supabase
                        .from('chat_rooms')
                        .delete()
                        .eq('id', currentRoomId);
                    if (roomDeleteError) console.error("빈 채팅방 삭제 실패:", roomDeleteError);
                }
                toast.success('채팅방에서 나갔습니다.', { id: toastId });
                router.push('/chatrooms');
                router.refresh();
            } catch (error) {
                console.error('채팅방 나가기 실패:', error);
                toast.error(`오류가 발생했습니다: ${error.message}`);
            }
        }
    };

    const handleSetReply = (message) => {
        setReplyingTo(message);
        messageInputRef.current?.focus();
    };

    if (!currentUser || !chatRoom || employeeLoading) return <div className="p-8 text-center">채팅 정보를 불러오는 중...</div>;
    
    const renderMessagesWithDateSeparator = () => {
        let lastDate = null;
        const messageElements = [];

        messages.forEach((msg) => {
            if (!msg.created_at) return;

            const messageDateStr = new Date(msg.created_at).toDateString();

            if (messageDateStr !== lastDate) {
                lastDate = messageDateStr;
                const formattedDate = new Date(msg.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                });

                messageElements.push(
                    <div key={`date-separator-${lastDate}`} className="text-center my-4">
                        <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                            {formattedDate}
                        </span>
                    </div>
                );
            }

            const isSentByMe = String(msg.sender_id) === String(currentUserId);
            const unreadCount = unreadCounts[msg.id] || 0;

            messageElements.push(
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
                            <div className={`p-1 rounded-2xl ${isSentByMe ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-white text-gray-800 rounded-bl-lg border'}`}>
                                <div className="p-2"><MessageContent msg={msg} allMessages={messages} /></div>
                            </div>
                            <span className="text-xs text-gray-400 self-end flex-shrink-0">
                                {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false })}
                            </span>
                        </div>
                    </div>
                </div>
            );
        });
        return messageElements;
    };


    return (
        <div className="flex flex-col h-full bg-gray-100">
            <header className="flex items-center justify-between p-4 border-b bg-white flex-shrink-0">
                <div className="flex items-center min-w-0">
                    {typeof isEditingRoomName === 'boolean' && isEditingRoomName ? (
                        <input
                            type="text"
                            value={editedRoomName}
                            onChange={(e) => setEditedRoomName(e.target.value)}
                            onBlur={handleSaveRoomName}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRoomName(); }}
                            className="text-lg font-bold truncate border-b border-blue-500 focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <h3 className="text-lg font-bold truncate">{chatRoom.name}</h3>
                    )}
                    {chatRoom.created_by === currentUserId && !chatRoom.is_direct_message && (!isEditingRoomName || typeof isEditingRoomName !== 'boolean') && (
                        <button onClick={() => setIsEditingRoomName(true)} className="ml-2 p-1 text-gray-500 hover:text-gray-800 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
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
                    {renderMessagesWithDateSeparator()}
                </div>
                <div ref={messagesEndRef} />
            </div>

            <footer className="p-4 bg-white border-t flex-shrink-0">
                {replyingTo && (
                    <div className="p-2 mb-2 bg-gray-100 rounded-lg text-sm border-l-4 border-blue-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-blue-600">{replyingTo.sender?.full_name || '알 수 없음'}에게 답장</p>
                                <p className="text-gray-600 truncate">{replyingTo.message_type === 'text' ? replyingTo.content : (replyingTo.message_type === 'image' ? '사진' : '파일')}</p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-gray-200">
                                <CloseIcon />
                            </button>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" multiple />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || employeeLoading} className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50">
                        <FileAttachIcon />
                    </button>
                    <input ref={messageInputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요..." className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800" autoFocus />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400" disabled={!newMessage.trim() || isUploading || employeeLoading}>
                        <SendIcon />
                    </button>
                </form>
            </footer>
            {isManageModalOpen && (
                <ManageParticipantsModal 
                  isOpen={isManageModalOpen} 
                  onClose={(isChanged) => { 
                    setManageModalOpen(false); 
                    if(isChanged) router.refresh(); 
                  }} 
                  room={chatRoom} 
                  participants={participants} 
                  currentUser={currentUser}
                />
            )}
        </div>
    );
}