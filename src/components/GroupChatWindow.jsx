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
import { pinMessage, unpinMessage } from '@/actions/chatActions';
import {
    Send, Paperclip, LogOut, Download, X, Edit3,
    Users, ShieldCheck, Lock, MessageCircle,
    Image as ImageIcon, FileText, ChevronLeft,
    Search, ChevronUp, ChevronDown, Link as LinkIcon,
    MoreVertical, Reply, Copy, CornerUpRight, Trash2, Pin, PinOff
} from 'lucide-react';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// ── 메시지 액션 메뉴 (카카오톡 스타일) ─────────────────────────
function MessageActionMenu({ msg, isMine, isCreator, isPinned, anchorRect, onClose, onReply, onCopy, onForward, onDelete, onPin }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [onClose]);

    // 버블 위 or 아래 배치
    const spaceAbove = anchorRect ? anchorRect.top : 200;
    const menuTop = spaceAbove > 120
        ? anchorRect.top - 68
        : anchorRect.bottom + 8;
    const menuLeft = Math.max(8, Math.min(anchorRect ? anchorRect.left : 0, window.innerWidth - 260));

    const actions = [
        { icon: Reply,              label: '답장',        onClick: onReply,   danger: false },
        { icon: Copy,               label: '복사',        onClick: onCopy,    danger: false, hide: msg.message_type !== 'text' },
        { icon: CornerUpRight,      label: '전달',        onClick: onForward, danger: false },
        { icon: isPinned ? PinOff : Pin, label: isPinned ? '고정해제' : '고정', onClick: onPin, danger: false, hide: !isCreator },
        { icon: Trash2,             label: '삭제',        onClick: onDelete,  danger: true,  hide: !isMine },
    ].filter(a => !a.hide);

    return (
        <div className="fixed inset-0 z-[200]" onClick={onClose}>
            <div
                ref={menuRef}
                style={{ position: 'fixed', top: menuTop, left: menuLeft }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-100 flex overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {actions.map(a => (
                    <button
                        key={a.label}
                        onClick={() => { a.onClick(); onClose(); }}
                        className={`flex flex-col items-center gap-1.5 px-5 py-3 transition-colors hover:bg-slate-50
                            ${a.danger ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-600'}`}
                    >
                        <a.icon size={17} strokeWidth={2} />
                        <span className="text-[10px] font-bold whitespace-nowrap">{a.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── 전달하기 모달 ────────────────────────────────────────────────
function ForwardModal({ msg, currentUserId, onClose }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(null);

    useEffect(() => {
        supabase.rpc('get_chat_rooms_with_last_message').then(({ data }) => {
            setRooms(data || []);
            setLoading(false);
        });
    }, []);

    const forward = async (roomId) => {
        setSending(roomId);
        const content = msg.message_type === 'text'
            ? msg.content
            : msg.message_type === 'image' ? msg.content : msg.content;
        await supabase.from('chat_messages').insert({
            room_id: roomId,
            sender_id: currentUserId,
            content,
            message_type: msg.message_type,
        });
        toast.success('메시지를 전달했습니다.');
        setSending(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-72 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[14px] font-black text-slate-800">전달할 채팅방 선택</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                    {loading ? (
                        <p className="text-center text-[12px] text-slate-400 py-6">불러오는 중...</p>
                    ) : rooms.map(room => {
                        const initials = room.name?.split(/[,\s]+/).map(n => n.charAt(0)).slice(0, 2).join('') || '?';
                        return (
                            <button
                                key={room.id}
                                onClick={() => forward(room.id)}
                                disabled={!!sending}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-black text-slate-600 shrink-0">
                                    {sending === room.id ? '...' : initials}
                                </div>
                                <p className="text-[13px] font-bold text-slate-700 truncate">{room.name}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
const previewCache = new Map();

// ── 링크 미리보기 ────────────────────────────────────────────
const downloadFile = async (url, name) => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = name;
        a.click();
        URL.revokeObjectURL(blobUrl);
    } catch {
        window.open(url, '_blank');
    }
};

const URLPreview = ({ url }) => {
    const [preview, setPreview] = useState(previewCache.get(url) || null);

    useEffect(() => {
        if (previewCache.has(url)) return;
        const ctrl = new AbortController();
        fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
            .then(r => r.json())
            .then(data => { previewCache.set(url, data); setPreview(data); })
            .catch(() => {});
        return () => ctrl.abort();
    }, [url]);

    if (!preview?.title) return null;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer"
            className="mt-2 block bg-white/80 border border-black/5 rounded-xl overflow-hidden hover:bg-white/90 transition-colors">
            {preview.image && (
                <img src={preview.image} alt="" className="w-full h-24 object-cover"
                    onError={e => { e.target.style.display='none'; }} />
            )}
            <div className="px-3 py-2">
                <p className="text-[11px] font-black text-[#1A1A1A] truncate">{preview.title}</p>
                {preview.description && (
                    <p className="text-[10px] text-[#888] mt-0.5 line-clamp-1">{preview.description}</p>
                )}
                <p className="text-[10px] text-[#999] mt-0.5 flex items-center gap-1">
                    <LinkIcon size={8} />{url.replace(/^https?:\/\//, '').split('/')[0]}
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
    return <>
        {parts.map((p, i) =>
            p.toLowerCase() === query.toLowerCase()
                ? <mark key={i} className="bg-yellow-300 text-yellow-900 rounded px-0.5">{p}</mark>
                : p
        )}
    </>;
};

// ── MessageContent ────────────────────────────────────────────
const MessageContent = ({ msg, allMessages, searchQuery = '' }) => {
    const replied = msg.replied_to_message_id
        ? allMessages.find(m => m.id === msg.replied_to_message_id) : null;

    const RepliedPreview = () => {
        if (!replied) return null;
        let content = replied.content;
        if (replied.message_type === 'image') content = '📷 사진';
        if (replied.message_type === 'file') {
            try { content = `📁 ${JSON.parse(replied.content).name}`; } catch { content = '📁 파일'; }
        }
        return (
            <div className="bg-black/10 px-2.5 py-1.5 rounded-lg mb-2 text-[11px] border-l-2 border-current opacity-60">
                <p className="font-black mb-0.5">{replied.sender?.full_name}에게 답장</p>
                <p className="truncate">{content}</p>
            </div>
        );
    };

    switch (msg.message_type) {
        case 'image':
            return (
                <div className="space-y-1">
                    <RepliedPreview />
                    <div className="overflow-hidden rounded-xl cursor-pointer"
                        onClick={() => window.open(msg.content, '_blank')}>
                        <Image src={msg.content} alt="이미지" width={200} height={200}
                            unoptimized className="object-cover hover:opacity-90 transition-opacity" />
                    </div>
                </div>
            );
        case 'file':
            try {
                const fi = JSON.parse(msg.content);
                return (
                    <div className="space-y-1">
                        <RepliedPreview />
                        <button onClick={() => downloadFile(fi.url, fi.name)}
                            className="flex items-center gap-2.5 p-2 bg-black/10 rounded-xl hover:bg-black/15 transition-colors w-full text-left">
                            <div className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center shrink-0">
                                <FileText size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-black truncate">{fi.name}</p>
                                <p className="text-[10px] opacity-60">다운로드</p>
                            </div>
                            <Download size={13} className="opacity-50 shrink-0" />
                        </button>
                    </div>
                );
            } catch { return <p className="text-xs opacity-60">파일 오류</p>; }
        default: {
            const urls = msg.content.match(URL_REGEX) || [];
            return (
                <div>
                    <RepliedPreview />
                    <p className="text-[13.5px] leading-[1.5] whitespace-pre-wrap">
                        <HighlightText text={msg.content} query={searchQuery} />
                    </p>
                    {urls.map((url, i) => <URLPreview key={i} url={url} />)}
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
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E5EA] shrink-0">
                <button onClick={onClose}
                    className="w-8 h-8 rounded-full hover:bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93]">
                    <ChevronLeft size={18} />
                </button>
                <h3 className="text-[14px] font-bold text-[#1C1C1E]">공유 미디어</h3>
            </div>
            <div className="flex border-b border-[#E5E5EA] shrink-0">
                {[['photo', `사진 ${photos.length}`], ['file', `파일 ${files.length}`]].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex-1 py-3 text-[12px] font-bold transition-colors
                            ${tab === key ? 'text-[#0A84FF] border-b-2 border-[#0A84FF]' : 'text-[#8E8E93]'}`}>
                        {label}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto">
                {tab === 'photo' ? (
                    photos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-0.5">
                            {photos.map(msg => (
                                <div key={msg.id} className="aspect-square overflow-hidden cursor-pointer bg-[#F2F3F5]"
                                    onClick={() => window.open(msg.content, '_blank')}>
                                    <img src={msg.content} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    ) : <div className="flex flex-col items-center justify-center h-40 text-[#CCC]">
                        <ImageIcon size={28} className="mb-2 opacity-30" />
                        <p className="text-xs">공유된 사진이 없습니다</p>
                    </div>
                ) : (
                    files.length > 0 ? (
                        <div className="p-3 space-y-2">
                            {files.map(msg => {
                                try {
                                    const fi = JSON.parse(msg.content);
                                    const ext = fi.name?.split('.').pop()?.toUpperCase() || 'FILE';
                                    return (
                                        <button key={msg.id} onClick={() => downloadFile(fi.url, fi.name)}
                                            className="flex items-center gap-3 p-3 bg-[#F9F9F9] rounded-xl hover:bg-[#F2F3F5] transition-colors group w-full text-left">
                                            <div className="w-10 h-10 bg-[#E8E8E8] rounded-xl flex items-center justify-center shrink-0">
                                                <span className="text-[9px] font-black text-[#555]">{ext}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12px] font-black text-[#1A1A1A] truncate">{fi.name}</p>
                                                <p className="text-[10px] text-[#AAA] mt-0.5">
                                                    {new Date(msg.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                                                    &nbsp;·&nbsp;{msg.sender?.full_name}
                                                </p>
                                            </div>
                                            <Download size={14} className="text-[#AAA] group-hover:text-[#555] transition-colors shrink-0" />
                                        </button>
                                    );
                                } catch { return null; }
                            })}
                        </div>
                    ) : <div className="flex flex-col items-center justify-center h-40 text-[#CCC]">
                        <FileText size={28} className="mb-2 opacity-30" />
                        <p className="text-xs">공유된 파일이 없습니다</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── 타이핑 인디케이터 ────────────────────────────────────────
const TypingIndicator = ({ users }) => {
    if (!users.length) return null;
    return (
        <div className="flex items-end gap-2 mb-3 px-4">
            <div className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] text-xs font-black shrink-0">
                {users[0]?.charAt(0)}
            </div>
            <div className="bg-[#F2F2F7] rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-[#8E8E93] rounded-full animate-bounce"
                            style={{ animationDelay: `${d}ms` }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────
const AVATAR_COLORS = ['#64748B','#475569','#6366F1','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6'];
const getAvatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export default function GroupChatWindow({
    currentUser, chatRoom, initialMessages, initialParticipants,
    isPanel = false, isPopup = false
}) {
    const router = useRouter();
    const { employee, loading: employeeLoading } = useEmployee();
    const currentUserId = currentUser?.id || employee?.id;

    const [messages, setMessages]         = useState(initialMessages || []);
    const [newMessage, setNewMessage]     = useState('');
    const [participants, setParticipants] = useState(initialParticipants || []);
    const [bubbleColor, setBubbleColor]   = useState('#0A84FF');
    const [isManageModalOpen, setManageModalOpen]   = useState(false);
    const [msgMenu, setMsgMenu]                     = useState(null); // { msg, isMine, rect }
    const [forwardMsg, setForwardMsg]               = useState(null);
    const [pinnedMessage, setPinnedMessage]         = useState(chatRoom?.pinned_message ?? null);
    const isRoomCreator = String(chatRoom?.created_by) === String(currentUserId);
    const [isEditingRoomName, setIsEditingRoomName] = useState(false);
    const [editedRoomName, setEditedRoomName]       = useState(chatRoom?.name);
    const [isUploading, setIsUploading]   = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [replyingTo, setReplyingTo]     = useState(null);
    const [showGallery, setShowGallery]   = useState(false);
    const [newMsgCount, setNewMsgCount]   = useState(0);
    const [typingUsers, setTypingUsers]   = useState([]);
    const [isDragging, setIsDragging]     = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery]   = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchIdx, setSearchIdx]       = useState(0);

    const messagesEndRef     = useRef(null);
    const fileInputRef       = useRef(null);
    const messageInputRef    = useRef(null);
    const channelRef         = useRef(null);
    const presenceChannelRef = useRef(null);
    const typingTimeoutRef   = useRef(null);
    const isWindowFocused    = useRef(true);
    const messageRefs        = useRef({});
    const isInitialScroll    = useRef(true);
    const currentRoomId      = chatRoom?.id;

    const getSupabaseClient = useCallback(() => createClientComponentClient({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }), []);

    const scrollToBottom = useCallback((instant = false) => {
        if (instant) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        } else {
            setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 50);
        }
    }, []);

    const fetchUnreadCounts = useCallback(async () => {
        if (!currentRoomId || !currentUserId) return;
        const { data } = await supabase.rpc('get_unread_counts_for_my_messages', { p_room_id: currentRoomId });
        if (data) setUnreadCounts(data.reduce((acc, i) => { acc[i.message_id] = i.unread_count; return acc; }, {}));
    }, [currentRoomId, currentUserId]);

    // 말풍선 색상 초기화 + 실시간 반영
    useEffect(() => {
        const saved = localStorage.getItem('chatBubbleColor');
        if (saved) setBubbleColor(saved);
        const handleColorChange = (e) => setBubbleColor(e.detail);
        window.addEventListener('chatBubbleColorChanged', handleColorChange);
        return () => window.removeEventListener('chatBubbleColorChanged', handleColorChange);
    }, []);

    // 팝업 탭 제목
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

    useEffect(() => {
        if (isInitialScroll.current) {
            scrollToBottom(true); // 첫 진입: 애니메이션 없이 즉시 이동
            isInitialScroll.current = false;
        } else {
            scrollToBottom(false); // 새 메시지: smooth
        }
    }, [messages, scrollToBottom]);

    // 메시지 구독
    useEffect(() => {
        if (!currentRoomId || !currentUserId) return;
        const markAsRead = async () => {
            await supabase.from('chat_room_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('room_id', currentRoomId).eq('user_id', currentUserId);
        };
        markAsRead();
        fetchUnreadCounts();

        const ch = supabase.channel(`room-${currentRoomId}`)
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
            }, (p) => setMessages(prev => prev.filter(m => m.id !== p.old.id)))
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
        channelRef.current = ch;
        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, [currentRoomId, currentUserId, fetchUnreadCounts, isPopup]);

    // 타이핑 인디케이터
    useEffect(() => {
        if (!currentRoomId || !currentUserId || !employee) return;
        const pCh = supabase.channel(`presence-${currentRoomId}`, {
            config: { presence: { key: currentUserId } }
        });
        pCh.on('presence', { event: 'sync' }, () => {
            const state = pCh.presenceState();
            setTypingUsers(
                Object.values(state).flat()
                    .filter(p => p.isTyping && String(p.userId) !== String(currentUserId))
                    .map(p => p.userName)
            );
        }).subscribe(async (status) => {
            if (status === 'SUBSCRIBED')
                await pCh.track({ userId: currentUserId, userName: employee.full_name, isTyping: false });
        });
        presenceChannelRef.current = pCh;
        return () => {
            clearTimeout(typingTimeoutRef.current);
            if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
        };
    }, [currentRoomId, currentUserId, employee]);

    // 메시지 검색
    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); setSearchIdx(0); return; }
        const results = messages
            .filter(m => m.message_type === 'text' && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(m => m.id);
        setSearchResults(results);
        setSearchIdx(0);
        if (results.length > 0)
            setTimeout(() => messageRefs.current[results[0]]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }, [searchQuery, messages]);

    const navigateSearch = (dir) => {
        if (!searchResults.length) return;
        const next = (searchIdx + dir + searchResults.length) % searchResults.length;
        setSearchIdx(next);
        messageRefs.current[searchResults[next]]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // 파일 업로드
    const uploadFiles = useCallback(async (files, repliedToId = null) => {
        if (!files?.length || !currentUserId || !currentRoomId || employeeLoading) return;
        setIsUploading(true);
        const toastId = toast.loading(`${files.length}개 전송 중...`);
        await Promise.all(Array.from(files).map(async (file) => {
            const name = file.name.normalize('NFC');
            const tempId = `${Date.now()}-${name}`;
            setMessages(prev => [...prev, { id: tempId, content: '전송 중...', message_type: 'text', created_at: new Date().toISOString(), sender: employee }]);
            try {
                const ext = name.split('.').pop() ?? '';
                const path = `${currentUserId}/${crypto.randomUUID()}.${ext}`;
                const sb = getSupabaseClient();
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
        const id = replyingTo?.id ?? null; setReplyingTo(null);
        await uploadFiles(e.target.files, id);
        e.target.value = '';
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId || !currentRoomId || employeeLoading) return;
        const content = newMessage.trim();
        const repliedToId = replyingTo?.id ?? null;
        setNewMessage(''); setReplyingTo(null);
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

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (!presenceChannelRef.current || !employee) return;
        presenceChannelRef.current.track({ userId: currentUserId, userName: employee.full_name, isTyping: e.target.value.length > 0 });
        clearTimeout(typingTimeoutRef.current);
        if (e.target.value.length > 0) {
            typingTimeoutRef.current = setTimeout(() => {
                presenceChannelRef.current?.track({ userId: currentUserId, userName: employee.full_name, isTyping: false });
            }, 2500);
        }
    };

    const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); };
    const handleDrop      = async (e) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            const id = replyingTo?.id ?? null; setReplyingTo(null);
            await uploadFiles(e.dataTransfer.files, id);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        const { error } = await supabase.from('chat_messages').delete().eq('id', msgId);
        if (!error) setMessages(prev => prev.filter(m => m.id !== msgId));
        else toast.error('삭제에 실패했습니다.');
    };

    const handlePinMessage = async (msg) => {
        const isAlreadyPinned = pinnedMessage?.id === msg.id;
        if (isAlreadyPinned) {
            const result = await unpinMessage(currentRoomId);
            if (!result?.error) setPinnedMessage(null);
            else toast.error(result.error);
        } else {
            let preview = msg.content;
            if (msg.message_type === 'image') preview = '📷 사진';
            if (msg.message_type === 'file') { try { preview = `📁 ${JSON.parse(msg.content).name}`; } catch { preview = '📁 파일'; } }
            const data = { id: msg.id, content: preview, sender_name: msg.sender?.full_name || '', message_type: msg.message_type };
            const result = await pinMessage(currentRoomId, data);
            if (!result?.error) setPinnedMessage(data);
            else toast.error(result.error);
        }
    };

    const handleCopyMessage = (content) => {
        navigator.clipboard.writeText(content).then(() => toast.success('복사했습니다.')).catch(() => toast.error('복사 실패'));
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
            if (!error) { if (isPopup) router.push('/chat-popup'); else { router.push('/chatrooms'); router.refresh(); } }
        }
    };

    if (!currentUser || !chatRoom || employeeLoading) return (
        <div className="h-full flex flex-col items-center justify-center bg-white">
            <Lock size={36} className="text-[#C7C7CC] animate-pulse" />
            <p className="text-[#8E8E93] font-medium text-sm mt-3">불러오는 중...</p>
        </div>
    );

    // ── 카카오톡 스타일 메시지 렌더링 ────────────────────────
    const renderMessages = () => {
        let lastDate    = null;
        let lastSender  = null;
        let lastMinute  = null;

        return messages.map((msg, idx) => {
            if (!msg.created_at) return null;

            const dateStr  = new Date(msg.created_at).toDateString();
            const isMine   = String(msg.sender_id) === String(currentUserId);
            const unread   = unreadCounts[msg.id] || 0;
            const isHighlighted = searchResults[searchIdx] === msg.id;

            const msgDate   = new Date(msg.created_at);
            const msgMinute = `${msgDate.getHours()}-${msgDate.getMinutes()}`;
            const nextMsg   = messages[idx + 1];
            const nextMinute = nextMsg
                ? `${new Date(nextMsg.created_at).getHours()}-${new Date(nextMsg.created_at).getMinutes()}`
                : null;

            // ✅ 카카오톡 메시지 그룹핑 로직
            const isFirstInGroup = msg.sender_id !== lastSender || dateStr !== lastDate;
            const isLastInGroup  = !nextMsg || nextMsg.sender_id !== msg.sender_id || msgMinute !== nextMinute;
            const showTime       = isLastInGroup; // 마지막 메시지에만 시간 표시

            const dateSep = dateStr !== lastDate ? (
                <div key={`sep-${dateStr}`} className="flex items-center justify-center my-5">
                    <span className="text-[11px] text-[#8E8E93] bg-[#F2F2F7] px-4 py-1.5 rounded-full font-medium">
                        {new Date(msg.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                    </span>
                </div>
            ) : null;

            lastDate   = dateStr;
            lastSender = msg.sender_id;
            lastMinute = msgMinute;

            return (
                <div key={msg.id} ref={el => { messageRefs.current[msg.id] = el; }}>
                    {dateSep}

                    {/* ✅ 카카오톡 레이아웃: 내 메시지(우) / 상대 메시지(좌) */}
                    <div className={`flex items-end gap-2 mb-0.5 px-3
                        ${isMine ? 'flex-row-reverse' : 'flex-row'}
                        ${isHighlighted ? 'bg-yellow-100/50 rounded-xl' : ''}`}>

                        {/* ✅ 상대방 프로필 원 (카카오톡처럼 첫 메시지에만) */}
                        {!isMine && (
                            <div className="w-9 shrink-0 self-start mt-1">
                                {isFirstInGroup ? (
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-black"
                                        style={{ backgroundColor: getAvatarColor(msg.sender?.full_name || '') }}>
                                        {msg.sender?.full_name?.charAt(0)}
                                    </div>
                                ) : (
                                    <div className="w-9 h-9" /> // 빈 공간 (정렬용)
                                )}
                            </div>
                        )}

                        <div className={`flex flex-col max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
                            {/* ✅ 이름 (상대방 첫 메시지에만) */}
                            {!isMine && isFirstInGroup && (
                                <p className="text-[11px] font-semibold text-[#8E8E93] mb-1 ml-1">
                                    {msg.sender?.full_name}
                                </p>
                            )}

                            <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* 버블 */}
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMsgMenu({ msg, isMine, rect: e.currentTarget.getBoundingClientRect() });
                                    }}
                                    style={isMine ? { backgroundColor: bubbleColor } : undefined}
                                    className={`px-3.5 py-2.5 cursor-pointer transition-opacity hover:opacity-85 select-none
                                        ${isMine
                                            ? 'text-white rounded-2xl rounded-br-sm'
                                            : 'bg-[#F2F2F7] text-[#1C1C1E] rounded-2xl rounded-tl-sm'
                                        }`}>
                                    <MessageContent msg={msg} allMessages={messages} searchQuery={searchQuery} />
                                </div>

                                {/* ✅ 시간 + 읽음 수 (카카오톡처럼 버블 옆 하단) */}
                                {showTime && (
                                    <div className={`flex flex-col gap-0.5 pb-0.5 shrink-0 ${isMine ? 'items-end' : 'items-start'}`}>
                                        {isMine && unread > 0 && (
                                            <span className="text-[10px] font-semibold text-[#0A84FF]">{unread}</span>
                                        )}
                                        <span className="text-[10px] text-[#8E8E93] whitespace-nowrap">
                                            {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    };

    // ── 패널/팝업 모드 ──────────────────────────────────────
    if (isPanel) {
        return (
            <div className="flex flex-col h-full overflow-hidden bg-white">

                {/* ✅ 카카오톡 스타일 헤더 */}
                <header className="shrink-0 bg-white border-b border-[#E8E8E8]">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0 text-center">
                            {isEditingRoomName ? (
                                <input type="text" value={editedRoomName}
                                    onChange={(e) => setEditedRoomName(e.target.value)}
                                    onBlur={handleSaveRoomName}
                                    className="text-[15px] font-black text-[#1A1A1A] bg-transparent border-b border-[#AAA] outline-none text-center w-full"
                                    autoFocus />
                            ) : (
                                <div className="flex items-center justify-center gap-1">
                                    <h2 className="text-[15px] font-black text-[#1A1A1A] truncate">{chatRoom.name}</h2>
                                    <span className="text-[12px] text-[#AAA] font-medium">{participants.length}</span>
                                    {chatRoom.created_by === currentUserId && (
                                        <button onClick={() => setIsEditingRoomName(true)} className="text-[#AAA] hover:text-[#555] ml-0.5">
                                            <Edit3 size={11} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* 우측 액션 */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => { setIsSearchOpen(s => !s); setSearchQuery(''); setSearchResults([]); }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                    ${isSearchOpen ? 'bg-[#0A84FF] text-white' : 'hover:bg-[#F2F2F7] text-[#8E8E93]'}`}>
                                <Search size={16} />
                            </button>
                            <button onClick={() => setShowGallery(true)}
                                className="w-8 h-8 rounded-full hover:bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] transition-colors">
                                <ImageIcon size={16} />
                            </button>
                            {!chatRoom.is_direct_message && (
                                <button onClick={() => setManageModalOpen(true)}
                                    className="w-8 h-8 rounded-full hover:bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] transition-colors">
                                    <Users size={16} />
                                </button>
                            )}
                            <button onClick={handleLeaveRoom}
                                className="w-8 h-8 rounded-full hover:bg-[#FFF0F0] flex items-center justify-center text-[#C7C7CC] hover:text-[#EF4444] transition-colors">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>

                    {/* 검색 바 */}
                    {isSearchOpen && (
                        <div className="flex items-center gap-2 px-4 pb-3">
                            <div className="flex-1 flex items-center gap-2 bg-[#F2F3F5] rounded-xl px-3 py-2">
                                <Search size={13} className="text-[#AAA] shrink-0" />
                                <input type="text" value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="메시지 검색..."
                                    className="flex-1 bg-transparent text-[12px] text-[#1A1A1A] placeholder:text-[#AAA] outline-none"
                                    autoFocus />
                                {searchQuery && (
                                    <span className="text-[10px] text-[#888] font-bold shrink-0">
                                        {searchResults.length > 0 ? `${searchIdx + 1}/${searchResults.length}` : '없음'}
                                    </span>
                                )}
                                {searchQuery && (
                                    <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                                        <X size={12} className="text-[#AAA]" />
                                    </button>
                                )}
                            </div>
                            {searchResults.length > 1 && (
                                <div className="flex gap-1">
                                    <button onClick={() => navigateSearch(-1)}
                                        className="w-7 h-7 rounded-lg bg-[#F2F3F5] hover:bg-[#E8E8E8] flex items-center justify-center text-[#555]">
                                        <ChevronUp size={14} />
                                    </button>
                                    <button onClick={() => navigateSearch(1)}
                                        className="w-7 h-7 rounded-lg bg-[#F2F3F5] hover:bg-[#E8E8E8] flex items-center justify-center text-[#555]">
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </header>

                {/* 고정 메시지 배너 */}
                {pinnedMessage && (
                    <div className="shrink-0 flex items-center gap-2.5 px-4 py-2.5 bg-[#F0F8FF] border-b border-[#DBEAFE] shadow-[inset_3px_0_0_#0A84FF]">
                        <Pin size={11} className="text-[#0A84FF] shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-[#0A84FF] uppercase tracking-wider mb-0.5">고정 메시지</p>
                            <p className="text-[12px] font-medium text-[#1C1C1E] truncate">{pinnedMessage.content}</p>
                        </div>
                        {isRoomCreator && (
                            <button
                                onClick={() => handlePinMessage({ id: pinnedMessage.id, sender: { full_name: pinnedMessage.sender_name }, content: pinnedMessage.content, message_type: pinnedMessage.message_type })}
                                className="text-[#C7C7CC] hover:text-[#8E8E93] shrink-0"
                                title="고정 해제"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                )}

                {/* 메시지 영역 */}
                <div className="flex-1 relative overflow-hidden">
                    {showGallery && <GalleryPanel messages={messages} onClose={() => setShowGallery(false)} />}

                    <div className="h-full overflow-y-auto py-3 bg-white relative"
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                        {isDragging && (
                            <div className="absolute inset-2 bg-blue-50/95 border-2 border-dashed border-blue-400 z-10 flex flex-col items-center justify-center rounded-2xl pointer-events-none">
                                <Paperclip size={28} className="text-blue-500 mb-2" />
                                <p className="text-[13px] font-black text-blue-600">파일을 여기에 놓으세요</p>
                            </div>
                        )}
                        {renderMessages()}
                        <TypingIndicator users={typingUsers} />
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <footer className="bg-white border-t border-[#E5E5EA] shrink-0 px-3 py-2">
                    {replyingTo && (
                        <div className="flex items-center justify-between px-3 py-2 mb-2 bg-[#F2F2F7] rounded-xl border border-[#E5E5EA]">
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-[#0A84FF] mb-0.5">↩ {replyingTo.sender?.full_name}</p>
                                <p className="text-[11px] text-[#8E8E93] truncate">{replyingTo.content}</p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="text-[#C7C7CC] hover:text-[#EF4444] ml-2 shrink-0">
                                <X size={13} />
                            </button>
                        </div>
                    )}
                    <div className="flex items-end gap-2">
                        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" multiple />
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                            className="w-9 h-9 rounded-full hover:bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] transition-colors shrink-0">
                            <Paperclip size={20} />
                        </button>
                        <div className="flex-1 bg-[#F2F2F7] rounded-2xl px-3.5 py-2.5 min-h-[40px] flex items-center">
                            <input ref={messageInputRef} type="text" value={newMessage}
                                onChange={handleInputChange}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSendMessage(e); } }}
                                placeholder="메시지를 입력하세요"
                                className="flex-1 bg-transparent text-[13.5px] text-[#1C1C1E] placeholder:text-[#C7C7CC] outline-none" />
                        </div>
                        <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || isUploading}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0
                                ${newMessage.trim() ? 'bg-[#0A84FF] text-white' : 'bg-[#F2F2F7] text-[#C7C7CC]'}`}>
                            <Send size={16} className={newMessage.trim() ? "translate-x-px -translate-y-px" : ""} />
                        </button>
                    </div>
                </footer>

                {isManageModalOpen && (
                    <ManageParticipantsModal isOpen={isManageModalOpen}
                        onClose={(c) => { setManageModalOpen(false); if (c) router.refresh(); }}
                        room={chatRoom} participants={participants} currentUser={currentUser} />
                )}

                {msgMenu && (
                    <MessageActionMenu
                        msg={msgMenu.msg}
                        isMine={msgMenu.isMine}
                        isCreator={isRoomCreator}
                        isPinned={pinnedMessage?.id === msgMenu.msg.id}
                        anchorRect={msgMenu.rect}
                        onClose={() => setMsgMenu(null)}
                        onReply={() => setReplyingTo(msgMenu.msg)}
                        onCopy={() => handleCopyMessage(msgMenu.msg.content)}
                        onForward={() => setForwardMsg(msgMenu.msg)}
                        onDelete={() => handleDeleteMessage(msgMenu.msg.id)}
                        onPin={() => handlePinMessage(msgMenu.msg)}
                    />
                )}

                {forwardMsg && (
                    <ForwardModal
                        msg={forwardMsg}
                        currentUserId={currentUserId}
                        onClose={() => setForwardMsg(null)}
                    />
                )}
            </div>
        );
    }

    // ── 풀페이지 모드 (기존 유지) ────────────────────────────
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
                    <div className="flex-1 overflow-y-auto py-6 bg-[#F2F3F5] relative"
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
                    <footer className="bg-white border-t border-[#E8E8E8] shrink-0 px-4 py-3">
                        {replyingTo && (
                            <div className="flex items-center justify-between px-3 py-2 mb-2 bg-[#F9F9F9] rounded-xl border border-[#E8E8E8]">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-[#1e293b] mb-0.5">↩ {replyingTo.sender?.full_name}</p>
                                    <p className="text-[11px] text-[#888] truncate">{replyingTo.content}</p>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="text-[#CCC] hover:text-[#EF4444] ml-2"><X size={13} /></button>
                            </div>
                        )}
                        <div className="flex items-end gap-2">
                            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" multiple />
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                className="w-9 h-9 rounded-full hover:bg-[#F2F3F5] flex items-center justify-center text-[#888]">
                                <Paperclip size={20} />
                            </button>
                            <div className="flex-1 bg-[#F2F3F5] rounded-2xl px-3.5 py-2.5 flex items-center">
                                <input ref={messageInputRef} type="text" value={newMessage} onChange={handleInputChange}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSendMessage(e); } }}
                                    placeholder="메시지를 입력하세요"
                                    className="flex-1 bg-transparent text-[13.5px] text-[#1A1A1A] placeholder:text-[#AAA] outline-none" />
                            </div>
                            <button onClick={handleSendMessage} disabled={!newMessage.trim() || isUploading}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all
                                    ${newMessage.trim() ? 'bg-[#1e293b] text-white' : 'bg-[#F2F3F5] text-[#CCC]'}`}>
                                <Send size={16} />
                            </button>
                        </div>
                    </footer>
                </div>
            </main>
            {isManageModalOpen && (
                <ManageParticipantsModal isOpen={isManageModalOpen}
                    onClose={(c) => { setManageModalOpen(false); if (c) router.refresh(); }}
                    room={chatRoom} participants={participants} currentUser={currentUser} />
            )}
        </div>
    );
}