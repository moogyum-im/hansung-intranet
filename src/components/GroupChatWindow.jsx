// src/components/GroupChatWindow.jsx
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
    Send, Paperclip, LogOut, Download, X, Edit3,
    Users, ShieldCheck, Lock, MessageCircle,
    Image as ImageIcon, FileText, ChevronLeft,
    Search, ChevronUp, ChevronDown, Link as LinkIcon
} from 'lucide-react';

// ── URL 정규식 ────────────────────────────────────────────────
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// ── 링크 미리보기 캐시 (모듈 레벨 — 세션 동안 유지) ──────────
const previewCache = new Map();

// ── URLPreview 컴포넌트 ───────────────────────────────────────
const URLPreview = ({ url, isMine }) => {
    const [preview, setPreview] = useState(previewCache.get(url) || null);
    const [loading, setLoading] = useState(!previewCache.has(url));

    useEffect(() => {
        if (previewCache.has(url)) return;
        const ctrl = new AbortController();
        fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
            .then(r => r.json())
            .then(data => { previewCache.set(url, data); setPreview(data); setLoading(false); })
            .catch(() => setLoading(false));
        return () => ctrl.abort();
    }, [url]);

    if (loading || !preview?.title) return null;

    return (
        <a href={url} target="_blank" rel="noopener noreferrer"
            className={`mt-2 block rounded-xl overflow-hidden border transition-opacity hover:opacity-90
                ${isMine ? 'border-white/20 bg-white/10' : 'border-slate-200 bg-white'}`}>
            {preview.image && (
                <img src={preview.image} alt="" className="w-full h-24 object-cover"
                    onError={e => { e.target.style.display = 'none'; }} />
            )}
            <div className="p-2.5">
                <p className={`text-[11px] font-black truncate ${isMine ? 'text-white/90' : 'text-slate-800'}`}>
                    {preview.title}
                </p>
                {preview.description && (
                    <p className={`text-[10px] mt-0.5 line-clamp-2 ${isMine ? 'text-white/60' : 'text-slate-500'}`}>
                        {preview.description}
                    </p>
                )}
                <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? 'text-white/50' : 'text-blue-500'}`}>
                    <LinkIcon size={9} />
                    {url.replace(/^https?:\/\//, '').split('/')[0]}
                </p>
            </div>
        </a>
    );
};

// ── 텍스트 하이라이트 ────────────────────────────────────────
const HighlightText = ({ text, query }) => {
    if (!query?.trim()) return <>{text}</>;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} className="bg-yellow-300 text-yellow-900 rounded px-0.5 not-italic">{part}</mark>
                    : part
            )}
        </>
    );
};

// ── MessageContent ────────────────────────────────────────────
const MessageContent = ({ msg, allMessages, searchQuery = '', isMine = false }) => {
    const replied = msg.replied_to_message_id
        ? allMessages.find(m => m.id === msg.replied_to_message_id)
        : null;

    const RepliedPreview = () => {
        if (!replied) return null;
        let content = replied.content;
        if (replied.message_type === 'image') content = '📷 사진';
        if (replied.message_type === 'file') {
            try { content = `📁 ${JSON.parse(replied.content).name}`; } catch { content = '📁 파일'; }
        }
        return (
            <div className="bg-black/10 px-2.5 py-1.5 rounded-lg mb-2 text-[11px] border-l-2 border-white/40">
                <p className="font-black opacity-80 mb-0.5">{replied.sender?.full_name}님에게 답장</p>
                <p className="truncate opacity-60">{content}</p>
            </div>
        );
    };

    switch (msg.message_type) {
        case 'image':
            return (
                <div className="space-y-1.5">
                    <RepliedPreview />
                    <div className="overflow-hidden rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.content, '_blank')}>
                        <Image src={msg.content} alt="이미지" width={220} height={220}
                            unoptimized className="object-cover" />
                    </div>
                </div>
            );
        case 'file':
            try {
                const fi = JSON.parse(msg.content);
                return (
                    <div className="space-y-1.5">
                        <RepliedPreview />
                        <a href={fi.url} download={fi.name} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2.5 p-2.5 bg-white/15 rounded-xl hover:bg-white/25 transition-colors">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                                <FileText size={15} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-black truncate">{fi.name}</p>
                                <p className="text-[10px] opacity-60">다운로드</p>
                            </div>
                            <Download size={13} className="opacity-60 shrink-0" />
                        </a>
                    </div>
                );
            } catch { return <p className="text-xs opacity-60">파일 오류</p>; }
        default: {
            const urls = msg.content.match(URL_REGEX) || [];
            return (
                <div className="space-y-1">
                    <RepliedPreview />
                    <p className="text-[13.5px] font-semibold leading-relaxed whitespace-pre-wrap">
                        <HighlightText text={msg.content} query={searchQuery} />
                    </p>
                    {/* ✅ 링크 미리보기 */}
                    {urls.map((url, i) => <URLPreview key={i} url={url} isMine={isMine} />)}
                </div>
            );
        }
    }
};

// ── 갤러리 패널 ──────────────────────────────────────────────
const GalleryPanel = ({ messages, onClose }) => {
    const [tab, setTab] = useState('photo');
    const photos = messages.filter(m => m.message_type === 'image');
    const files  = messages.filter(m => m.message_type === 'file');

    return (
        <div className="absolute inset-0 bg-white z-20 flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
                <button onClick={onClose}
                    className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                    <ChevronLeft size={18} />
                </button>
                <h3 className="text-[14px] font-black text-slate-800">공유 미디어</h3>
            </div>
            <div className="flex border-b border-slate-100 shrink-0">
                {[['photo', `사진 ${photos.length}`], ['file', `파일 ${files.length}`]].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex-1 py-2.5 text-[12px] font-black transition-colors
                            ${tab === key ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                        {label}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto">
                {tab === 'photo' ? (
                    photos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-0.5 p-0.5">
                            {photos.map(msg => (
                                <div key={msg.id} className="aspect-square overflow-hidden cursor-pointer bg-slate-100"
                                    onClick={() => window.open(msg.content, '_blank')}>
                                    <img src={msg.content} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <ImageIcon size={28} className="mb-2 opacity-30" />
                            <p className="text-xs font-medium">공유된 사진이 없습니다</p>
                        </div>
                    )
                ) : (
                    files.length > 0 ? (
                        <div className="p-3 space-y-2">
                            {files.map(msg => {
                                try {
                                    const fi = JSON.parse(msg.content);
                                    const ext = fi.name?.split('.').pop()?.toUpperCase() || 'FILE';
                                    return (
                                        <a key={msg.id} href={fi.url} download={fi.name}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
                                            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center shrink-0">
                                                <span className="text-[9px] font-black text-slate-600">{ext}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12px] font-black text-slate-800 truncate">{fi.name}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {new Date(msg.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                                                    &nbsp;·&nbsp;{msg.sender?.full_name}
                                                </p>
                                            </div>
                                            <Download size={14} className="text-slate-400 group-hover:text-slate-700 shrink-0 transition-colors" />
                                        </a>
                                    );
                                } catch { return null; }
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <FileText size={28} className="mb-2 opacity-30" />
                            <p className="text-xs font-medium">공유된 파일이 없습니다</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

// ── 타이핑 인디케이터 ────────────────────────────────────────
const TypingIndicator = ({ users }) => {
    if (users.length === 0) return null;
    return (
        <div className="flex items-center gap-2 mt-1 mb-2">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm flex items-center gap-2">
                <div className="flex gap-0.5 items-end h-3">
                    {[0, 150, 300].map(delay => (
                        <span key={delay}
                            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}ms` }} />
                    ))}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                    {users.length === 1 ? `${users[0]}님이 입력 중` : `${users.slice(0, 2).join(', ')}님이 입력 중`}
                </span>
            </div>
        </div>
    );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function GroupChatWindow({
    currentUser, chatRoom, initialMessages, initialParticipants,
    isPanel = false, isPopup = false
}) {
    const router = useRouter();
    const { employee, loading: employeeLoading } = useEmployee();
    const currentUserId = currentUser?.id || employee?.id;

    // 기본 상태
    const [messages, setMessages]         = useState(initialMessages || []);
    const [newMessage, setNewMessage]     = useState('');
    const [participants, setParticipants] = useState(initialParticipants || []);
    const [isManageModalOpen, setManageModalOpen]   = useState(false);
    const [isEditingRoomName, setIsEditingRoomName] = useState(false);
    const [editedRoomName, setEditedRoomName]       = useState(chatRoom?.name);
    const [isUploading, setIsUploading]   = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [replyingTo, setReplyingTo]     = useState(null);
    const [showGallery, setShowGallery]   = useState(false);
    const [newMsgCount, setNewMsgCount]   = useState(0);

    // ✅ 새 기능 상태
    const [typingUsers, setTypingUsers]     = useState([]);        // 타이핑 인디케이터
    const [isDragging, setIsDragging]       = useState(false);     // 드래그 앤 드롭
    const [isSearchOpen, setIsSearchOpen]   = useState(false);     // 메시지 검색
    const [searchQuery, setSearchQuery]     = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchIdx, setSearchIdx]         = useState(0);

    // Refs
    const messagesEndRef     = useRef(null);
    const fileInputRef       = useRef(null);
    const messageInputRef    = useRef(null);
    const channelRef         = useRef(null);
    const presenceChannelRef = useRef(null);
    const typingTimeoutRef   = useRef(null);
    const isWindowFocused    = useRef(true);
    const messageRefs        = useRef({});
    const currentRoomId      = chatRoom?.id;

    const getSupabaseClient = useCallback(() => createClientComponentClient({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }), []);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    }, []);

    const fetchUnreadCounts = useCallback(async () => {
        if (!currentRoomId || !currentUserId) return;
        const { data } = await supabase.rpc('get_unread_counts_for_my_messages', { p_room_id: currentRoomId });
        if (data) setUnreadCounts(data.reduce((acc, i) => { acc[i.message_id] = i.unread_count; return acc; }, {}));
    }, [currentRoomId, currentUserId]);

    // 팝업 탭 제목 관리
    useEffect(() => {
        if (!isPopup || !chatRoom?.name) return;
        document.title = chatRoom.name;
        const onFocus = () => { isWindowFocused.current = true; setNewMsgCount(0); document.title = chatRoom.name; };
        const onBlur  = () => { isWindowFocused.current = false; };
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);
        return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('blur', onBlur); };
    }, [isPopup, chatRoom?.name]);

    useEffect(() => {
        if (isPopup && newMsgCount > 0) document.title = `(${newMsgCount}) ${chatRoom?.name}`;
    }, [isPopup, newMsgCount, chatRoom?.name]);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    // 메시지 실시간 구독
    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;
        const markAsRead = async () => {
            await supabase.from('chat_room_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('room_id', currentRoomId).eq('user_id', currentUserId);
        };
        markAsRead();
        fetchUnreadCounts();

        const channel = supabase.channel(`room-${currentRoomId}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'chat_messages',
                filter: `room_id=eq.${currentRoomId}`
            }, async (payload) => {
                if (payload.new.sender_id === currentUserId) return;
                const { data: msg } = await supabase
                    .from('chat_messages').select('*, sender:profiles(id, full_name, avatar_url)')
                    .eq('id', payload.new.id).single();
                if (msg) {
                    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
                    await markAsRead();
                    if (isPopup && !isWindowFocused.current) setNewMsgCount(c => c + 1);
                }
            })
            .on('postgres_changes', {
                event: 'DELETE', schema: 'public', table: 'chat_messages',
                filter: `room_id=eq.${currentRoomId}`
            }, (payload) => {
                setMessages(prev => prev.filter(m => m.id !== payload.old.id));
            })
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'chat_room_participants',
                filter: `room_id=eq.${currentRoomId}`
            }, async () => {
                const { data: pData } = await supabase
                    .from('chat_room_participants').select('profiles(id, full_name, position)')
                    .eq('room_id', currentRoomId);
                if (pData) { setParticipants(pData.map(p => p.profiles)); fetchUnreadCounts(); }
            })
            .subscribe();
        channelRef.current = channel;
        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, [currentRoomId, currentUserId, fetchUnreadCounts, isPopup]);

    // ✅ 타이핑 인디케이터 — Supabase Presence
    useEffect(() => {
        if (!currentRoomId || !currentUserId || !employee) return;

        const presenceCh = supabase.channel(`presence-${currentRoomId}`, {
            config: { presence: { key: currentUserId } }
        });

        presenceCh
            .on('presence', { event: 'sync' }, () => {
                const state = presenceCh.presenceState();
                const typing = Object.values(state)
                    .flat()
                    .filter(p => p.isTyping && String(p.userId) !== String(currentUserId))
                    .map(p => p.userName);
                setTypingUsers(typing);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceCh.track({ userId: currentUserId, userName: employee.full_name, isTyping: false });
                }
            });

        presenceChannelRef.current = presenceCh;
        return () => {
            clearTimeout(typingTimeoutRef.current);
            if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
        };
    }, [currentRoomId, currentUserId, employee]);

    // ✅ 메시지 검색 — 결과 인덱싱 및 스크롤
    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); setSearchIdx(0); return; }
        const results = messages
            .filter(m => m.message_type === 'text' && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(m => m.id);
        setSearchResults(results);
        setSearchIdx(0);
        if (results.length > 0) {
            setTimeout(() => messageRefs.current[results[0]]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
    }, [searchQuery, messages]);

    const navigateSearch = (dir) => {
        if (!searchResults.length) return;
        const next = (searchIdx + dir + searchResults.length) % searchResults.length;
        setSearchIdx(next);
        messageRefs.current[searchResults[next]]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // ✅ 파일 업로드 공통 함수
    const uploadFiles = useCallback(async (files, repliedToId = null) => {
        if (!files?.length || !currentUserId || !currentRoomId || employeeLoading) return;
        setIsUploading(true);
        const toastId = toast.loading(`${files.length}개 파일 전송 중...`);
        await Promise.all(Array.from(files).map(async (file) => {
            const name = file.name.normalize('NFC');
            const tempId = `${Date.now()}-${name}`;
            setMessages(prev => [...prev, { id: tempId, content: '전송 중...', message_type: 'text', created_at: new Date().toISOString(), sender: employee }]);
            try {
                const ext  = name.split('.').pop() ?? '';
                const path = `${currentUserId}/${crypto.randomUUID()}.${ext}`;
                const sb   = getSupabaseClient();
                const { error: upErr } = await sb.storage.from('chat-files').upload(path, file);
                if (upErr) throw upErr;
                const { data: urlData } = sb.storage.from('chat-files').getPublicUrl(path);
                const msgType = ['jpg','jpeg','png','gif','webp'].includes(ext.toLowerCase()) ? 'image' : 'file';
                const content = msgType === 'image' ? urlData.publicUrl : JSON.stringify({ name, url: urlData.publicUrl });
                const { data: ins } = await sb.from('chat_messages')
                    .insert({ room_id: currentRoomId, sender_id: currentUserId, content, message_type: msgType, replied_to_message_id: repliedToId })
                    .select('*, sender:profiles(id, full_name, avatar_url)').single();
                if (ins) setMessages(prev => prev.map(m => m.id === tempId ? ins : m));
            } catch { setMessages(prev => prev.filter(m => m.id !== tempId)); }
        }));
        fetchUnreadCounts();
        toast.success('전송 완료', { id: toastId });
        setIsUploading(false);
    }, [currentUserId, currentRoomId, employeeLoading, employee, getSupabaseClient, fetchUnreadCounts]);

    const handleFileChange = async (e) => {
        const id = replyingTo?.id ?? null;
        setReplyingTo(null);
        await uploadFiles(e.target.files, id);
        e.target.value = '';
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId || !currentRoomId || employeeLoading) return;
        const content = newMessage.trim();
        const repliedToId = replyingTo?.id ?? null;
        setNewMessage(''); setReplyingTo(null);
        // 타이핑 종료
        clearTimeout(typingTimeoutRef.current);
        presenceChannelRef.current?.track({ userId: currentUserId, userName: employee?.full_name, isTyping: false });

        const tempId = Date.now().toString();
        const data = { room_id: currentRoomId, sender_id: currentUserId, content, message_type: 'text', replied_to_message_id: repliedToId };
        setMessages(prev => [...prev, { id: tempId, ...data, created_at: new Date().toISOString(), sender: employee }]);
        scrollToBottom();
        const sb = getSupabaseClient();
        const { data: inserted, error } = await sb.from('chat_messages').insert(data)
            .select('*, sender:profiles(id, full_name, avatar_url)').single();
        if (error) { setMessages(prev => prev.filter(m => m.id !== tempId)); setNewMessage(content); }
        else if (inserted) { setMessages(prev => prev.map(m => m.id === tempId ? inserted : m)); fetchUnreadCounts(); }
    };

    // ✅ 타이핑 브로드캐스트
    const handleInputChange = (e) => {
        const value = e.target.value;
        setNewMessage(value);
        if (!presenceChannelRef.current || !employee) return;
        presenceChannelRef.current.track({ userId: currentUserId, userName: employee.full_name, isTyping: value.length > 0 });
        clearTimeout(typingTimeoutRef.current);
        if (value.length > 0) {
            typingTimeoutRef.current = setTimeout(() => {
                presenceChannelRef.current?.track({ userId: currentUserId, userName: employee.full_name, isTyping: false });
            }, 2500);
        }
    };

    // ✅ 드래그 앤 드롭
    const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); };
    const handleDrop      = async (e) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            const id = replyingTo?.id ?? null;
            setReplyingTo(null);
            await uploadFiles(e.dataTransfer.files, id);
        }
    };

    const handleSaveRoomName = async () => {
        if (!editedRoomName.trim() || editedRoomName === chatRoom.name) { setIsEditingRoomName(false); return; }
        const { error } = await supabase.from('chat_rooms').update({ name: editedRoomName.trim() }).eq('id', currentRoomId);
        if (!error) { setEditedRoomName(editedRoomName.trim()); setIsEditingRoomName(false); if (isPopup) document.title = editedRoomName.trim(); }
    };

    const handleLeaveRoom = async () => {
        if (!currentUserId || !currentRoomId) return;
        if (window.confirm('채팅방을 나가시겠습니까?')) {
            const { error } = await supabase.from('chat_room_participants')
                .delete().eq('user_id', currentUserId).eq('room_id', currentRoomId);
            if (!error) {
                if (isPopup) window.close();
                else { router.push('/chatrooms'); router.refresh(); }
            }
        }
    };

    if (!currentUser || !chatRoom || employeeLoading) return (
        <div className="h-full flex flex-col items-center justify-center bg-[#1e293b]">
            <Lock size={40} className="text-blue-400 animate-bounce" />
            <p className="text-white font-black text-sm tracking-widest mt-4">Loading...</p>
        </div>
    );

    const renderMessages = () => {
        let lastDate = null;
        let lastSenderId = null;
        return messages.map((msg) => {
            if (!msg.created_at) return null;
            const dateStr = new Date(msg.created_at).toDateString();
            const dateSep = dateStr !== lastDate ? (
                <div key={`sep-${dateStr}`} className="flex items-center gap-3 my-6">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-3 py-1 rounded-full shadow-sm">
                        {new Date(msg.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>
            ) : null;
            lastDate = dateStr;

            const isMine       = String(msg.sender_id) === String(currentUserId);
            const unread       = unreadCounts[msg.id] || 0;
            const isHighlighted = searchResults[searchIdx] === msg.id;
            const showName     = !isMine && msg.sender_id !== lastSenderId;
            lastSenderId = msg.sender_id;

            return (
                <div key={msg.id} ref={el => { messageRefs.current[msg.id] = el; }}>
                    {dateSep}
                    <div
                        onClick={() => setReplyingTo(msg)}
                        className={`flex flex-col mb-1.5 cursor-pointer px-1 py-0.5 rounded-xl transition-colors
                            ${isHighlighted ? 'bg-yellow-50' : ''} ${isMine ? 'items-end' : 'items-start'}`}
                    >
                        {/* ✅ 아바타 제거 — 이름만 표시 (연속 메시지는 이름 숨김) */}
                        {showName && (
                            <p className="text-[11px] font-black text-slate-500 mb-1 ml-0.5">{msg.sender?.full_name}</p>
                        )}
                        <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                            <div className={`px-3.5 py-2.5 rounded-2xl max-w-[72%]
                                ${isMine
                                    ? 'bg-[#1e293b] text-white rounded-br-sm'
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm shadow-sm'}`}>
                                <MessageContent msg={msg} allMessages={messages} searchQuery={searchQuery} isMine={isMine} />
                            </div>
                            <div className={`flex flex-col gap-0.5 pb-0.5 shrink-0 ${isMine ? 'items-end' : 'items-start'}`}>
                                {isMine && unread > 0 && (
                                    <span className="text-[9px] font-black text-blue-500">{unread}</span>
                                )}
                                <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                                    {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: false })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    };

    // ── 공통 입력 푸터 ─────────────────────────────────────
    const InputFooter = ({ compact = false }) => (
        <footer className={`bg-white border-t border-slate-100 shrink-0 ${compact ? 'p-3' : 'p-6'}`}>
            {replyingTo && (
                <div className="flex items-center justify-between px-3 py-2 mb-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-blue-600 mb-0.5">↩ {replyingTo.sender?.full_name}에게 답장</p>
                        <p className="text-[11px] text-slate-500 truncate">{replyingTo.content}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-red-500 ml-2 shrink-0 p-1">
                        <X size={13} />
                    </button>
                </div>
            )}
            <form onSubmit={handleSendMessage}
                className={`flex items-center gap-2 bg-slate-100 rounded-2xl ${compact ? 'px-3 py-2' : 'p-2'}`}>
                <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" multiple />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1 shrink-0">
                    <Paperclip size={compact ? 18 : 22} />
                </button>
                <input ref={messageInputRef} type="text" value={newMessage}
                    onChange={handleInputChange}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 outline-none font-medium" />
                <button type="submit" disabled={!newMessage.trim() || isUploading}
                    className={`rounded-xl flex items-center justify-center transition-all shrink-0
                        ${compact ? 'w-8 h-8' : 'w-10 h-10'}
                        ${newMessage.trim() ? 'bg-[#1e293b] text-white hover:bg-slate-700' : 'text-slate-400'}`}>
                    <Send size={compact ? 15 : 17} className={newMessage.trim() ? "translate-x-px -translate-y-px" : ""} />
                </button>
            </form>
        </footer>
    );

    // ── 패널/팝업 모드 ──────────────────────────────────────
    if (isPanel) {
        return (
            <div className="flex flex-col h-full bg-white overflow-hidden">

                {/* 헤더 */}
                <header className="shrink-0 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-black text-sm shrink-0">
                            {chatRoom.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            {isEditingRoomName ? (
                                <input type="text" value={editedRoomName}
                                    onChange={(e) => setEditedRoomName(e.target.value)}
                                    onBlur={handleSaveRoomName}
                                    className="text-[14px] font-black text-slate-900 bg-transparent border-b border-slate-300 outline-none w-full" autoFocus />
                            ) : (
                                <div className="flex items-center gap-1">
                                    <h2 className="text-[14px] font-black text-slate-900 truncate">{chatRoom.name}</h2>
                                    {chatRoom.created_by === currentUserId && (
                                        <button onClick={() => setIsEditingRoomName(true)} className="text-slate-400 hover:text-slate-600">
                                            <Edit3 size={12} />
                                        </button>
                                    )}
                                </div>
                            )}
                            <p className="text-[11px] text-slate-400 font-medium">{participants.length}명</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                            {/* ✅ 검색 토글 */}
                            <button onClick={() => { setIsSearchOpen(s => !s); setSearchQuery(''); setSearchResults([]); }}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                                    ${isSearchOpen ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-500'}`}>
                                <Search size={15} />
                            </button>
                            <button onClick={() => setShowGallery(true)}
                                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                                <ImageIcon size={15} />
                            </button>
                            {!chatRoom.is_direct_message && (
                                <button onClick={() => setManageModalOpen(true)}
                                    className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                                    <Users size={15} />
                                </button>
                            )}
                            <button onClick={handleLeaveRoom}
                                className="w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                                <LogOut size={15} />
                            </button>
                        </div>
                    </div>

                    {/* ✅ 검색 바 */}
                    {isSearchOpen && (
                        <div className="flex items-center gap-2 px-4 pb-3">
                            <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                                <Search size={13} className="text-slate-400 shrink-0" />
                                <input type="text" value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="메시지 검색..."
                                    className="flex-1 bg-transparent text-[12px] text-slate-700 placeholder:text-slate-400 outline-none font-medium"
                                    autoFocus />
                                {searchQuery && (
                                    <span className="text-[10px] text-slate-400 font-bold shrink-0">
                                        {searchResults.length > 0 ? `${searchIdx + 1} / ${searchResults.length}` : '없음'}
                                    </span>
                                )}
                                {searchQuery && (
                                    <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                                        className="text-slate-400 hover:text-slate-600 shrink-0">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            {searchResults.length > 1 && (
                                <div className="flex gap-1">
                                    <button onClick={() => navigateSearch(-1)}
                                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                                        <ChevronUp size={14} />
                                    </button>
                                    <button onClick={() => navigateSearch(1)}
                                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </header>

                {/* 메시지 + 갤러리 영역 */}
                <div className="flex-1 relative overflow-hidden">
                    {showGallery && <GalleryPanel messages={messages} onClose={() => setShowGallery(false)} />}

                    {/* ✅ 드래그 앤 드롭 */}
                    <div className="h-full overflow-y-auto px-4 py-4 bg-[#f0f2f5] relative"
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                        {isDragging && (
                            <div className="absolute inset-2 bg-blue-50/95 border-2 border-dashed border-blue-400 z-10 flex flex-col items-center justify-center rounded-2xl pointer-events-none">
                                <Paperclip size={30} className="text-blue-500 mb-2" />
                                <p className="text-[14px] font-black text-blue-600">파일을 여기에 놓으세요</p>
                                <p className="text-[11px] text-blue-400 mt-1">이미지, 문서 등 모든 파일 지원</p>
                            </div>
                        )}
                        {renderMessages()}
                        {/* ✅ 타이핑 인디케이터 */}
                        <TypingIndicator users={typingUsers} />
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <InputFooter compact />

                {isManageModalOpen && (
                    <ManageParticipantsModal isOpen={isManageModalOpen}
                        onClose={(changed) => { setManageModalOpen(false); if (changed) router.refresh(); }}
                        room={chatRoom} participants={participants} currentUser={currentUser} />
                )}
            </div>
        );
    }

    // ── 풀페이지 모드 ───────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden">
            <header className="relative bg-[#1e293b] pt-10 pb-20 px-8 overflow-hidden shrink-0 shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                    <MessageCircle size={180} className="text-white" />
                </div>
                <div className="max-w-6xl mx-auto relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-5 min-w-0">
                        <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-white/10 text-blue-400">
                            <Users size={28} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                                <ShieldCheck size={12} />
                                <span className="text-[10px] font-black tracking-[0.2em] uppercase">HANSUNG Secure Channel</span>
                            </div>
                            {isEditingRoomName ? (
                                <input type="text" value={editedRoomName}
                                    onChange={(e) => setEditedRoomName(e.target.value)}
                                    onBlur={handleSaveRoomName}
                                    className="bg-transparent text-2xl font-black text-white border-b-2 border-blue-500 outline-none w-full" autoFocus />
                            ) : (
                                <h1 className="text-2xl font-black text-white tracking-tight truncate flex items-center gap-3">
                                    {chatRoom.name}
                                    {chatRoom.created_by === currentUserId && (
                                        <button onClick={() => setIsEditingRoomName(true)} className="p-1 hover:text-blue-400 text-white/30">
                                            <Edit3 size={16} />
                                        </button>
                                    )}
                                </h1>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!chatRoom.is_direct_message && (
                            <button onClick={() => setManageModalOpen(true)}
                                className="hidden sm:flex bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl font-black text-xs shadow-lg items-center gap-2">
                                <Users size={16} /> 참여자 관리
                            </button>
                        )}
                        <button onClick={handleLeaveRoom}
                            className="w-11 h-11 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 rounded-2xl flex items-center justify-center border border-white/10">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto px-6 -mt-10 relative z-20 overflow-hidden flex flex-col mb-4">
                <div className="flex-1 bg-white rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden flex flex-col relative">
                    {showGallery && <GalleryPanel messages={messages} onClose={() => setShowGallery(false)} />}
                    <div className="flex-1 overflow-y-auto px-8 py-10 bg-slate-50/30 relative"
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                        {isDragging && (
                            <div className="absolute inset-2 bg-blue-50/95 border-2 border-dashed border-blue-400 z-10 flex flex-col items-center justify-center rounded-[2.5rem] pointer-events-none">
                                <Paperclip size={32} className="text-blue-500 mb-2" />
                                <p className="text-[14px] font-black text-blue-600">파일을 여기에 놓으세요</p>
                            </div>
                        )}
                        {renderMessages()}
                        <TypingIndicator users={typingUsers} />
                        <div ref={messagesEndRef} />
                    </div>
                    <InputFooter />
                </div>
            </main>

            {isManageModalOpen && (
                <ManageParticipantsModal isOpen={isManageModalOpen}
                    onClose={(changed) => { setManageModalOpen(false); if (changed) router.refresh(); }}
                    room={chatRoom} participants={participants} currentUser={currentUser} />
            )}
        </div>
    );
}