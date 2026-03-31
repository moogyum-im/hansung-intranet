'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardCalendar from './DashboardCalendar';
import PushSubscriptionButton from '@/components/PushSubscriptionButton'; 
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Bell, 
  FileCheck, 
  Megaphone, 
  Layers, 
  Trophy, 
  ShieldCheck,
  MessageSquare,
  ArrowUpRight,
  Calendar,
  ClipboardList,
  CheckCircle2,
  CheckCheck // 🚀 CheckAll에서 CheckCheck로 수정완료!
} from 'lucide-react';

// 🚀 현장 관리 스타일 위젯 프레임 (action 슬롯 추가로 확장성 확보)
const PremiumWidget = ({ title, icon: Icon, children, className, badge, action }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${className}`}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-2.5">
                <div className="text-slate-500">
                    <Icon size={18} />
                </div>
                <h3 className="font-bold text-slate-700 text-[14px] tracking-tight">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
                {badge > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {badge}
                    </span>
                )}
                {action && <div>{action}</div>}
            </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-white">
            {children}
        </div>
    </div>
);

// --- 1. 내 결재 현황 위젯 ---
function MyApprovalsWidget({ employee }) {
    const [approvalsData, setApprovalsData] = useState({ toReview: [], submitted: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('toReview');

    useEffect(() => {
        if (employee) {
            const fetchData = async () => {
                setLoading(true);
                const { data, error } = await supabase.rpc('get_my_approvals', { p_user_id: employee.id });
                if (error) console.error("결재 현황 로딩 실패:", error);
                else setApprovalsData({ 
                    toReview: data.filter(doc => doc.category === 'to_review'), 
                    submitted: data.filter(doc => doc.category === 'submitted') 
                });
                setLoading(false);
            };
            fetchData();
        }
    }, [employee]);

    const renderList = (list) => {
        if (!list || list.length === 0) return (
            <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                <CheckCircle2 size={32} strokeWidth={1.5} />
                <p className="text-[11px] font-medium mt-2">대기 중인 문서가 없습니다.</p>
            </div>
        );
        return (
            <div className="space-y-1">
                {list.map(doc => (
                    <Link key={doc.id} href={`/approvals/${doc.id}`} className="group flex items-center justify-between p-3 rounded-lg hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100">
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-slate-700 truncate group-hover:text-blue-600">{doc.title}</p>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                <span className="text-slate-500 font-semibold">{doc.creator_name}</span>
                                <span>|</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            </p>
                        </div>
                        <ArrowUpRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-transform" />
                    </Link>
                ))}
            </div>
        );
    };

    return (
        <PremiumWidget title="내 결재 현황" icon={FileCheck} badge={approvalsData[activeTab].length} className="h-[320px]">
            <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                <button 
                    onClick={() => setActiveTab('toReview')} 
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${activeTab === 'toReview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    미결재 문서
                </button>
                <button 
                    onClick={() => setActiveTab('submitted')} 
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${activeTab === 'submitted' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    기안한 문서
                </button>
            </div>
            {loading ? <div className="text-[11px] text-slate-400 py-10 text-center animate-pulse italic">조회 중...</div> : renderList(approvalsData[activeTab])}
        </PremiumWidget>
    );
}

// --- 2. 알림 센터 위젯 ---
function NotificationWidget() {
    const { employee } = useEmployee();
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = useCallback(async () => {
        if (!employee) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', employee.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(5);
        setNotifications(data || []);
    }, [employee]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    // 🚀 알림 전체 읽음 처리 기능
    const handleMarkAllAsRead = async () => {
        if (!employee || notifications.length === 0) return;
        await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', employee.id).eq('is_read', false);
        setNotifications([]);
    };

    const getRelativeTime = (dateString) => {
        if (!dateString) return '';
        return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko });
    };

    const actionButton = notifications.length > 0 ? (
        <button onClick={handleMarkAllAsRead} className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1">
            <CheckCheck size={12}/> 모두 읽음
        </button>
    ) : null;

    return (
        <PremiumWidget title="알림 센터" icon={Bell} badge={notifications.length} action={actionButton} className="h-[320px]">
            {notifications.length > 0 ? (
                <div className="space-y-1">
                    {notifications.map(noti => (
                        <div key={noti.id} onClick={async () => {
                            await supabase.from('notifications').update({ is_read: true }).eq('id', noti.id);
                            fetchNotifications();
                            if (noti.link) router.push(noti.link);
                        }} className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer group transition-all border border-transparent hover:border-slate-200">
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    {noti.type === 'new_message' ? <MessageSquare size={14} className="text-blue-500" /> : <FileCheck size={14} className="text-amber-500" />}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-[13px] text-slate-600 leading-snug font-medium group-hover:text-slate-900">{noti.content}</p>
                                    <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-tighter">
                                        {getRelativeTime(noti.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-300 h-full">
                    <ShieldCheck size={32} strokeWidth={1.5} />
                    <p className="text-[11px] font-medium mt-2">새로운 알림이 없습니다.</p>
                </div>
            )}
        </PremiumWidget>
    );
}

// --- 3. 대시보드 메인 페이지 ---
export default function DashboardPage() {
    const { employee: currentUser, loading: employeeLoading } = useEmployee();
    const [notices, setNotices] = useState([]);
    const [activeTasks, setActiveTasks] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // 🚀 실시간 시계 연동
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchNotices = async () => {
            const { data } = await supabase.from('notices').select(`id, title, created_at`).order('created_at', { ascending: false }).limit(5);
            setNotices(data || []);
        };
        fetchNotices();
    }, []);

    // 🚀 진행 중인 업무 (내가 기안한 문서 중 아직 완료되지 않은 것) 연동
    useEffect(() => {
        const fetchActiveTasks = async () => {
            if (!currentUser) return;
            const { data } = await supabase
                .from('approval_documents')
                .select('id, title, status, updated_at')
                .eq('requester_id', currentUser.id)
                .in('status', ['대기', '진행'])
                .order('updated_at', { ascending: false })
                .limit(5);
            setActiveTasks(data || []);
        };
        if (currentUser) fetchActiveTasks();
    }, [currentUser]);
    
    if (employeeLoading) return (
        <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    // 날짜 포맷 (예: 2026년 3월 31일 화요일 15:08:18)
    const formattedDate = new Intl.DateTimeFormat('ko-KR', { 
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
    }).format(currentTime);
    const formattedTime = new Intl.DateTimeFormat('ko-KR', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    }).format(currentTime);

    return (
        <div className="bg-[#f1f5f9] min-h-screen pb-12">
            {/* 상단 헤더 - 현장 관리 탭 스타일 (네이비 톤) */}
            <header className="bg-[#1e293b] pt-10 pb-24 px-6 sm:px-12 border-b border-white/5 relative overflow-hidden">
                {/* 배경 꾸밈 요소 */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <Trophy size={28} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-blue-400 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded">Management System</span>
                                <span className="text-[10px] text-slate-400 font-mono tracking-wider">{formattedDate} {formattedTime}</span>
                            </div>
                            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
                                {currentUser?.full_name} {currentUser?.position}님, 반갑습니다.
                            </h1>
                            <p className="text-slate-400 text-sm mt-1 font-medium">
                                한성 인트라넷 통합 관제 시스템입니다.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <PushSubscriptionButton />
                    </div>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto px-6 sm:px-12 -mt-12 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* 왼쪽 컬럼 */}
                    <div className="space-y-6">
                        <NotificationWidget />
                        <MyApprovalsWidget employee={currentUser} />
                    </div>

                    {/* 중앙 컬럼 */}
                    <div className="space-y-6">
                        {/* 🚀 공지사항 위젯 */}
                        <PremiumWidget 
                            title="전사 공지사항" 
                            icon={Megaphone} 
                            className="h-[320px]" 
                            action={<Link href="/notices" className="text-[10px] font-black text-blue-600 hover:underline">더보기</Link>}
                        >
                            {notices.length > 0 ? (
                                <ul className="divide-y divide-slate-50">
                                    {notices.map(notice => {
                                        // 3일 이내 작성된 글인지 확인
                                        const isNew = (new Date() - new Date(notice.created_at)) / (1000 * 60 * 60 * 24) < 3;
                                        return (
                                            <li key={notice.id}>
                                                <Link href={`/notices/${notice.id}`} className="group p-3 block hover:bg-slate-50 transition-all rounded-lg">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            {isNew && <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shrink-0">N</span>}
                                                            <p className="font-bold text-[13px] text-slate-700 truncate group-hover:text-blue-600">{notice.title}</p>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium ml-4 shrink-0">{new Date(notice.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 truncate pl-[26px]">관리자로부터 발송된 전사 공지사항입니다.</p>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <div className="text-center py-20 text-slate-300 text-[11px] font-bold">등록된 공지가 없습니다.</div>}
                        </PremiumWidget>

                        {/* 🚀 진행 중인 업무 위젯 (실데이터 연동) */}
                        <PremiumWidget 
                            title="진행 중인 업무" 
                            icon={ClipboardList} 
                            badge={activeTasks.length}
                            className="h-[320px]"
                        >
                             {activeTasks.length > 0 ? (
                                 <div className="space-y-1">
                                    {activeTasks.map(task => (
                                        <Link key={task.id} href={`/approvals/${task.id}`} className="group flex flex-col p-3 rounded-lg hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100">
                                            <div className="flex justify-between items-start">
                                                <p className="text-[13px] font-bold text-slate-700 truncate group-hover:text-blue-600 mb-1">{task.title}</p>
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ml-2 shrink-0 ${task.status === '대기' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {task.status}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                최근 업데이트: {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true, locale: ko })}
                                            </p>
                                        </Link>
                                    ))}
                                 </div>
                             ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <Layers size={32} strokeWidth={1.5} />
                                    <p className="text-[11px] font-medium mt-2">할당되거나 진행 중인 업무가 없습니다.</p>
                                </div>
                             )}
                        </PremiumWidget>
                    </div>

                    {/* 오른쪽 컬럼: 전사 캘린더 */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[664px] flex flex-col">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="text-slate-500">
                                    <Calendar size={18} />
                                </div>
                                <h3 className="font-bold text-slate-700 text-[14px]">전사 일정 및 공정표</h3>
                            </div>
                            <button className="text-[11px] font-bold text-blue-600 hover:underline">상세보기</button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <DashboardCalendar />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}