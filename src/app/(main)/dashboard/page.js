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
  CheckCircle2
} from 'lucide-react';

// --- 현장 관리 스타일 위젯 프레임 ---
const PremiumWidget = ({ title, icon: Icon, children, className, badge }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden ${className}`}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
                <div className="text-slate-500">
                    <Icon size={18} />
                </div>
                <h3 className="font-bold text-slate-700 text-[14px] tracking-tight">{title}</h3>
            </div>
            {badge > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {badge}
                </span>
            )}
        </div>
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-white">
            {children}
        </div>
    </div>
);

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

function NotificationWidget() {
    const { employee } = useEmployee();
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (employee) {
            const fetchNotifications = async () => {
                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('recipient_id', employee.id)
                    .eq('is_read', false)
                    .order('created_at', { ascending: false })
                    .limit(5);
                setNotifications(data || []);
            };
            fetchNotifications();
        }
    }, [employee]);

    // 상대 시간 계산 함수
    const getRelativeTime = (dateString) => {
        if (!dateString) return '';
        return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko });
    };

    return (
        <PremiumWidget title="알림 센터" icon={Bell} badge={notifications.length} className="h-[320px]">
            {notifications.length > 0 ? (
                <div className="space-y-1">
                    {notifications.map(noti => (
                        <div key={noti.id} onClick={async () => {
                            await supabase.from('notifications').update({ is_read: true }).eq('id', noti.id);
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

export default function DashboardPage() {
    const { employee: currentUser, loading: employeeLoading } = useEmployee();
    const [notices, setNotices] = useState([]);
    
    useEffect(() => {
        const fetchNotices = async () => {
            const { data } = await supabase.from('notices').select(`id, title, created_at`).order('created_at', { ascending: false }).limit(5);
            setNotices(data || []);
        };
        fetchNotices();
    }, []);
    
    if (employeeLoading) return (
        <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="bg-[#f1f5f9] min-h-screen pb-12">
            {/* 상단 헤더 - 현장 관리 탭 스타일 (네이비 톤) */}
            <header className="bg-[#1e293b] pt-10 pb-24 px-6 sm:px-12 border-b border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <Trophy size={28} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-blue-400 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded">Management System</span>
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
                        <PremiumWidget title="전사 공지사항" icon={Megaphone} className="h-[320px]">
                            {notices.length > 0 ? (
                                <ul className="divide-y divide-slate-50">
                                    {notices.map(notice => (
                                        <li key={notice.id}>
                                            <Link href={`/notices/${notice.id}`} className="group p-3 block hover:bg-slate-50 transition-all rounded-lg">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-bold text-[13px] text-slate-700 truncate flex-1 group-hover:text-blue-600">{notice.title}</p>
                                                    <span className="text-[10px] text-slate-400 font-medium ml-4">{new Date(notice.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 truncate">관리자로부터 발송된 전사 공지사항입니다.</p>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : <div className="text-center py-20 text-slate-300 text-[11px] font-bold">등록된 공지가 없습니다.</div>}
                        </PremiumWidget>

                        <PremiumWidget title="진행 중인 업무" icon={ClipboardList} className="h-[320px]">
                             <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <Layers size={32} strokeWidth={1.5} />
                                <p className="text-[11px] font-medium mt-2">할당된 업무가 없습니다.</p>
                            </div>
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