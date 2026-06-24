'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardCalendar from './DashboardCalendar';
import './DashboardCalendar.css';
import PushSubscriptionButton from '@/components/PushSubscriptionButton';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { openChatPopup } from '@/lib/chatPopup';
import {
    Bell,
    FileCheck,
    Megaphone,
    MessageSquare,
    ArrowUpRight,
    Calendar,
    CheckCircle2,
    Newspaper,
    Bot,
    Send,
    Loader,
    Settings,
    Zap,
    X,
    Check,
    Construction,
    Users2,
    UserCircle,
    MessagesSquare,
    Building2,
    TreePine,
    ClipboardList,
    FileSpreadsheet,
    TrendingUp,
    BarChart3,
    Gavel,
    FileText,
    PlaneTakeoff,
} from 'lucide-react';

// --- 스켈레톤 ---
const SkeletonList = ({ rows = 3 }) => (
    <div className="space-y-1.5">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="animate-pulse p-2.5 rounded-lg">
                <div className="h-3 bg-slate-100 rounded-full w-3/4 mb-1.5"></div>
                <div className="h-2 bg-slate-50 rounded-full w-1/2"></div>
            </div>
        ))}
    </div>
);

// --- 위젯 프레임 ---
const Widget = ({ title, icon: Icon, children, className, badge, action }) => (
    <div className={`bg-white rounded-2xl shadow-md flex flex-col overflow-hidden ${className}`}>
        <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                <Icon size={15} className="text-slate-400" />
                <h3 className="font-bold text-slate-600 text-[13px] tracking-tight">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
                {badge > 0 && (
                    <span className="bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {badge}
                    </span>
                )}
                {action && <div>{action}</div>}
            </div>
        </div>
        <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
            {children}
        </div>
    </div>
);

// --- 1. 내 결재 현황 ---
function MyApprovalsWidget({ approvalsData, loading }) {
    const [activeTab, setActiveTab] = useState('toReview');

    const renderList = (list) => {
        if (loading) return <SkeletonList rows={4} />;
        if (!list || list.length === 0) return (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <CheckCircle2 size={24} strokeWidth={1.5} />
                <p className="text-[11px] font-medium mt-1.5">대기 중인 문서가 없습니다.</p>
            </div>
        );
        return (
            <div className="space-y-0.5">
                {list.map(doc => (
                    <Link key={doc.id} href={`/approvals/${doc.id}`} className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 transition-all">
                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-slate-700 truncate group-hover:text-blue-600">{doc.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                <span className="font-semibold text-slate-500">{doc.creator_name}</span>
                                <span className="mx-1">·</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            </p>
                        </div>
                        <ArrowUpRight size={12} className="text-slate-300 group-hover:text-blue-400 shrink-0 ml-2" />
                    </Link>
                ))}
            </div>
        );
    };

    return (
        <Widget title="내 결재 현황" icon={FileCheck} badge={loading ? 0 : approvalsData[activeTab].length} className="h-[280px]">
            <div className="flex bg-slate-50 p-0.5 rounded-xl mb-2.5">
                <button
                    onClick={() => setActiveTab('toReview')}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'toReview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    미결재
                </button>
                <button
                    onClick={() => setActiveTab('submitted')}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'submitted' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    기안
                </button>
            </div>
            {renderList(approvalsData[activeTab])}
        </Widget>
    );
}

// --- 2. 조경업 뉴스 (수동 스크롤, 고정 높이) ---
function LandscapeNewsTicker() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/landscape-news')
            .then(r => r.json())
            .then(d => setNews(d.news || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const formatDate = (pubDate) => {
        if (!pubDate) return '';
        try { return new Date(pubDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }); }
        catch { return ''; }
    };

    return (
        <div className="bg-[#1a2235]" style={{ height: '32px', overflow: 'hidden' }}>
            <div className="flex items-center h-full pl-16 lg:pl-4 pr-4 gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                    <Newspaper size={11} className="text-blue-400" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">조경 뉴스</span>
                </div>
                <div className="w-px h-3 bg-slate-700 shrink-0" />
                {loading ? (
                    <div className="h-2.5 w-40 bg-slate-700 rounded animate-pulse" />
                ) : news.length > 0 ? (
                    <div className="flex-1 overflow-hidden">
                        <div
                            className="flex gap-8 whitespace-nowrap"
                            style={{ animation: 'marquee 60s linear infinite' }}
                        >
                            {[...news, ...news].map((item, i) => (
                                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[11px] text-slate-400 hover:text-white transition-colors shrink-0 group">
                                    <span className="text-slate-600 text-[9px] shrink-0">{formatDate(item.pubDate)}</span>
                                    <span className="group-hover:text-blue-300">{item.title}</span>
                                    <span className="text-slate-700 mx-2">·</span>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// --- 3. AI 검색 위젯 ---
function AIWidget() {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem('ai-chat-history');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const chatRef = useRef(null);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [history]);

    useEffect(() => {
        try { localStorage.setItem('ai-chat-history', JSON.stringify(history.slice(-30))); }
        catch { /* 용량 초과 무시 */ }
    }, [history]);

    const EXAMPLES = [
        '내 미결재 서류 몇 건이야?',
        '총무팀 연락처 알려줘',
        '이번 달 평택 현장 작업 인원',
    ];

    const handleSubmit = async (q) => {
        const query = (q || question).trim();
        if (!query || loading) return;
        setLoading(true);
        setHistory(prev => [...prev, { role: 'user', content: query }]);
        setQuestion('');
        try {
            const res = await fetch('/api/ai-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: query }),
            });
            const data = await res.json();
            setHistory(prev => [...prev, { role: 'assistant', content: data.answer || data.error || '응답 없음' }]);
        } catch {
            setHistory(prev => [...prev, { role: 'assistant', content: '오류가 발생했습니다.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-md flex flex-col overflow-hidden" style={{ height: '100%' }}>
            <div className="px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-800 flex items-center justify-between shrink-0 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <Bot size={15} className="text-blue-300" />
                    <h3 className="font-black text-white text-[13px]">AI 데이터 검색</h3>
                </div>
            </div>

            {/* 준비중 안내 */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 bg-slate-50/40">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <Bot size={26} className="text-slate-300" />
                </div>
                <div>
                    <p className="text-[13px] font-black text-slate-500 mb-1.5">현재 사용 준비중입니다.</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">AI 검색 기능이 곧 제공될 예정입니다.</p>
                </div>
                <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-black rounded-full">
                    Coming Soon
                </span>
            </div>

            <div className="p-3 bg-white border-t border-slate-50 shrink-0">
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 cursor-not-allowed">
                    <input
                        type="text"
                        placeholder="현재 사용할 수 없습니다."
                        className="flex-1 text-[12px] bg-transparent outline-none text-slate-400 placeholder:text-slate-400 cursor-not-allowed"
                        disabled
                        readOnly
                    />
                    <button disabled className="w-6 h-6 bg-slate-300 text-white rounded-lg flex items-center justify-center cursor-not-allowed shrink-0">
                        <Send size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- 4. 나만의 바로가기 위젯 ---
const ALL_SHORTCUTS = [
    { id: 'notices',          name: '공지사항',        href: '/notices',                           icon: Megaphone },
    { id: 'approvals',        name: '전자 결재',        href: '/approvals',                         icon: FileCheck },
    { id: 'leave',            name: '휴가 신청서',      href: '/approvals/leave',                   icon: PlaneTakeoff },
    { id: 'organization',     name: '조직도',          href: '/organization',                      icon: Users2 },
    { id: 'sites',            name: '현장 관리',        href: '/sites',                             icon: Construction },
    { id: 'mypage',           name: '내 정보',          href: '/mypage',                            icon: UserCircle },
    { id: 'admin',            name: '경영 지원',        href: '/admin-portal',                      icon: Building2 },
    { id: 'tree-sales',       name: '조경수 DB',        href: '/database/tree-sales',               icon: TreePine },
    { id: 'exec-plans',       name: '공사 공정표',      href: '/database/execution-plans',          icon: ClipboardList },
    { id: 'exec-estimates',   name: '내역 관리',        href: '/database/execution-estimates',      icon: FileSpreadsheet },
    { id: 'profit',           name: '수익 실행',        href: '/database/profit-management',        icon: TrendingUp },
    { id: 'work-analysis',    name: '작업일보 분석',    href: '/database/work-analysis',            icon: BarChart3 },
    { id: 'bid-records',      name: '입찰 기록',        href: '/database/bid-records',              icon: Gavel },
];

const SHORTCUT_ICON_COLORS = [
    'text-blue-500',
    'text-violet-500',
    'text-emerald-500',
    'text-rose-500',
];

function QuickAccessWidget({ currentUser }) {
    const LS_KEY = `quick_shortcuts_${currentUser?.id}`;
    const [selectedIds, setSelectedIds] = useState(() => {
        if (typeof window === 'undefined') return ['notices', 'approvals', 'leave', 'mypage'];
        try {
            const saved = localStorage.getItem(`quick_shortcuts_${currentUser?.id}`);
            return saved ? JSON.parse(saved) : ['notices', 'approvals', 'leave', 'mypage'];
        } catch { return ['notices', 'approvals', 'leave', 'mypage']; }
    });
    const [settingOpen, setSettingOpen] = useState(false);
    const [draft, setDraft] = useState([]);

    const openSetting = () => { setDraft([...selectedIds]); setSettingOpen(true); };
    const toggleDraft = (id) => {
        setDraft(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
        );
    };
    const saveSetting = () => {
        setSelectedIds(draft);
        try { localStorage.setItem(LS_KEY, JSON.stringify(draft)); } catch {}
        setSettingOpen(false);
    };

    const shortcuts = selectedIds
        .map(id => ALL_SHORTCUTS.find(s => s.id === id))
        .filter(Boolean);

    return (
        <>
            {/* 설정 모달 */}
            {settingOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setSettingOpen(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-80 z-10 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-[14px] font-black text-slate-800">바로가기 설정</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">최대 4개 선택 ({draft.length}/4)</p>
                            </div>
                            <button onClick={() => setSettingOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                            {ALL_SHORTCUTS.map(s => {
                                const Icon = s.icon;
                                const selected = draft.includes(s.id);
                                const disabled = !selected && draft.length >= 4;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => !disabled && toggleDraft(s.id)}
                                        className={`flex items-center gap-2.5 p-3 rounded-xl text-left text-[12px] font-bold border-2 transition-all
                                            ${selected ? 'bg-blue-50 border-blue-500 text-blue-700' : disabled ? 'bg-slate-50 border-transparent text-slate-300 cursor-not-allowed' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}
                                    >
                                        <Icon size={14} className={selected ? 'text-blue-500' : disabled ? 'text-slate-300' : 'text-slate-400'} />
                                        <span className="flex-1 truncate">{s.name}</span>
                                        {selected && <Check size={12} className="text-blue-500 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-4 pb-4 flex gap-2">
                            <button onClick={() => setSettingOpen(false)} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">취소</button>
                            <button onClick={saveSetting} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors">저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 바로가기 카드 */}
            <div className="bg-white rounded-2xl shadow-md p-4 mt-4">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-400" />
                        <h3 className="font-bold text-slate-600 text-[13px]">나만의 바로가기</h3>
                    </div>
                    <button onClick={openSetting} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                        <Settings size={13} />
                    </button>
                </div>
                <div className="flex gap-2">
                    {shortcuts.length === 0 ? (
                        <button onClick={openSetting} className="flex-1 py-5 border-2 border-dashed border-slate-200 rounded-xl text-[11px] font-bold text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all flex flex-col items-center gap-1.5">
                            <Settings size={15} />
                            바로가기 추가
                        </button>
                    ) : shortcuts.map((s, idx) => {
                        const Icon = s.icon;
                        return (
                            <Link
                                key={s.id}
                                href={s.href}
                                className="flex-1 flex flex-col items-center gap-2 py-3 px-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 active:scale-95 transition-all"
                            >
                                <div className={`w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100`}>
                                    <Icon size={15} className={SHORTCUT_ICON_COLORS[idx % 4]} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 truncate w-full text-center leading-tight">{s.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// --- 5. 대시보드 메인 ---
export default function DashboardPage() {
    const { employee: currentUser, loading: employeeLoading } = useEmployee();
    const [currentTime, setCurrentTime] = useState(new Date());

    const [notices, setNotices] = useState([]);
    const [noticesLoading, setNoticesLoading] = useState(true);
    const [approvalsData, setApprovalsData] = useState({ toReview: [], submitted: [] });
    const [approvalsLoading, setApprovalsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchNotices = async () => {
            setNoticesLoading(true);
            const { data } = await supabase
                .from('notices')
                .select('id, title, created_at')
                .order('created_at', { ascending: false })
                .limit(6);
            setNotices(data || []);
            setNoticesLoading(false);
        };
        fetchNotices();
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        const fetchStats = async () => {
            setStatsLoading(true);
            setApprovalsLoading(true);
            const [{ data: approvals }, { count: unread }] = await Promise.all([
                supabase.rpc('get_my_approvals', { p_user_id: currentUser.id }),
                supabase.from('notifications').select('*', { count: 'exact', head: true })
                    .eq('recipient_id', currentUser.id).eq('is_read', false),
            ]);
            setApprovalsData({
                toReview: approvals?.filter(d => d.category === 'to_review' && d.my_approval_status !== '미결') ?? [],
                submitted: approvals?.filter(d => d.category === 'submitted') ?? [],
            });
            setUnreadCount(unread ?? 0);
            setApprovalsLoading(false);
            setStatsLoading(false);
        };
        fetchStats();
    }, [currentUser]);

    if (employeeLoading) return (
        <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const formattedTime = new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(currentTime);
    const formattedDate = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    }).format(currentTime);

    return (
        <div className="bg-[#f0f2f5] min-h-screen pb-12">
            {/* 뉴스 티커 */}
            <LandscapeNewsTicker />

            {/* 헤더 */}
            <header className="bg-[#1e293b] pt-6 pb-16 px-4 sm:px-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none" />
                <div className="relative z-10 pl-16 lg:pl-0">
                    <div className="flex items-center justify-between gap-4">
                        {/* 인사말 */}
                        <div>
                            <p className="text-[11px] text-slate-500 font-medium mb-1">{formattedDate}</p>
                            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                                {currentUser?.full_name} {currentUser?.position}님, 안녕하세요.
                            </h1>
                        </div>

                        {/* 오른쪽: 통계 카드 + 푸시 */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            {/* 미결재 카드 */}
                            <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl px-4 py-2.5 flex items-center gap-3">
                                <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
                                    <FileCheck size={15} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-white leading-none">
                                        {statsLoading ? '—' : approvalsData.toReview.length}
                                    </p>
                                    <p className="text-[10px] text-amber-300/80 mt-0.5">미결재</p>
                                </div>
                            </div>
                            {/* 알림 카드 */}
                            <div className="bg-rose-500/20 border border-rose-500/30 rounded-2xl px-4 py-2.5 flex items-center gap-3">
                                <div className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center">
                                    <Bell size={15} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-white leading-none">
                                        {statsLoading ? '—' : unreadCount}
                                    </p>
                                    <p className="text-[10px] text-rose-300/80 mt-0.5">알림</p>
                                </div>
                            </div>
                            {/* 시간 */}
                            <span className="text-[11px] font-mono text-slate-500 hidden md:block">{formattedTime}</span>
                            {/* 푸시 버튼 */}
                            <PushSubscriptionButton />
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-3 sm:px-6 lg:px-8 -mt-8 relative z-20">
                {/* 모바일 캘린더 */}
                <div className="block lg:hidden mb-4">
                    <div className="bg-white rounded-2xl shadow-md p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar size={14} className="text-slate-400" />
                            <h3 className="font-bold text-slate-600 text-[12px]">캘린더</h3>
                        </div>
                        <DashboardCalendar />
                    </div>
                </div>

                {/* 3컬럼 그리드 (화면 꽉 채움) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* 왼쪽: 캘린더 + 바로가기 */}
                    <div className="hidden lg:flex flex-col gap-0">
                        <div className="bg-white rounded-2xl shadow-md p-4">
                            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-50">
                                <Calendar size={14} className="text-slate-400" />
                                <h3 className="font-bold text-slate-600 text-[13px]">캘린더</h3>
                            </div>
                            <DashboardCalendar />
                        </div>
                        <QuickAccessWidget currentUser={currentUser} />
                    </div>

                    {/* 가운데: 공지사항 + 결재현황 */}
                    <div className="flex flex-col gap-4">
                        {/* 공지사항 */}
                        <Widget
                            title="전사 공지사항"
                            icon={Megaphone}
                            className="h-[260px]"
                            action={<Link href="/notices" className="text-[10px] font-bold text-blue-500 hover:underline">더보기</Link>}
                        >
                            {noticesLoading ? <SkeletonList rows={5} /> : notices.length > 0 ? (
                                <ul className="space-y-0.5">
                                    {notices.map(notice => {
                                        const isNew = (new Date() - new Date(notice.created_at)) / (1000 * 60 * 60 * 24) < 3;
                                        return (
                                            <li key={notice.id}>
                                                <Link href={`/notices/${notice.id}`} className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all">
                                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                        {isNew && <span className="bg-rose-500 text-white text-[8px] font-black px-1 py-0.5 rounded shrink-0">N</span>}
                                                        <p className="text-[12px] font-semibold text-slate-600 truncate group-hover:text-blue-600">{notice.title}</p>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 ml-3 shrink-0">
                                                        {new Date(notice.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                                                    </span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <div className="flex items-center justify-center h-full text-slate-300 text-[11px]">등록된 공지가 없습니다.</div>}
                        </Widget>

                        <MyApprovalsWidget approvalsData={approvalsData} loading={approvalsLoading} />
                    </div>

                    {/* 오른쪽: AI */}
                    <div className="h-[560px]">
                        <AIWidget />
                    </div>
                </div>
            </main>
        </div>
    );
}
