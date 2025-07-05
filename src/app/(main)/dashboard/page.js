// 파일 경로: src/app/(main)/dashboard/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import MyAttendanceWidget from '@/components/MyAttendanceWidget';
import LeaveCalendar from '@/app/(main)/mypage/LeaveCalendar';
import ClientSideOnlyWrapper from '@/components/ClientSideOnlyWrapper';

// --- 아이콘 컴포넌트들 ---
const ApprovalIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const NoticeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>);
const SiteIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 4h1m4-4h1m-1 4h1" /></svg>);

// --- 재사용 UI 컴포넌트들 ---
const Widget = ({ title, link, children }) => (
    <div className="bg-white rounded-lg shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-center px-5 py-4 border-b">
            <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
            {link && <Link href={link} className="text-sm font-medium text-blue-600 hover:underline">더보기</Link>}
        </div>
        <div className="p-5 flex-1">
            {children}
        </div>
    </div>
);

const KpiCard = ({ title, value, unit, icon, href }) => (
    <Link href={href} className="block h-full">
        <div className="bg-white rounded-lg shadow-sm p-5 flex items-center h-full hover:shadow-md transition-shadow">
            <div className="p-3.5 rounded-full bg-gray-100 flex-shrink-0">{icon}</div>
            <div className="ml-4 flex-grow">
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value ?? '...'} <span className="text-base font-medium text-gray-600">{unit}</span></p>
            </div>
        </div>
    </Link>
);

export default function DashboardPage() {
    const { employee: currentUser, loading: employeeLoading } = useEmployee();
    const [pendingApprovalsCount, setPendingApprovalsCount] = useState(null);
    const [notices, setNotices] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = useCallback(async () => {
        if (!currentUser?.id) return;
        setLoadingData(true);
        const [approvalRes, noticeRes] = await Promise.all([
            supabase.from('approval_document_approvers').select('document_id', { count: 'exact', head: true }).eq('approver_id', currentUser.id).eq('status', '대기'),
            supabase.from('notices').select(`id, title, created_at, author:author_id(full_name)`).order('created_at', { ascending: false }).limit(5),
        ]);
        setPendingApprovalsCount(approvalRes.count ?? 0);
        setNotices(noticeRes.data || []);
        setLoadingData(false);
    }, [currentUser?.id]);

    useEffect(() => {
        if (currentUser) { fetchData(); }
    }, [currentUser, fetchData]);
    
    if (employeeLoading) return <div className="h-full flex items-center justify-center"><p>대시보드 정보를 불러오는 중...</p></div>;

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-full">
            <header>
                <h1 className="text-3xl font-bold text-gray-900">안녕하세요, {currentUser?.full_name || '사용자'}님! 👋</h1>
                <p className="text-gray-500 mt-1">오늘도 힘찬 하루 보내세요.</p>
            </header>
            
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <KpiCard title="처리할 결재" value={pendingApprovalsCount} unit="건" icon={<ApprovalIcon />} href="/approvals" />
                </div>
                <div className="lg:col-span-2">
                    <MyAttendanceWidget currentUser={currentUser} />
                </div>
            </section>
            
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Widget title="최신 공지사항" link="/notices">
                        {loadingData ? <p className="text-center py-10">로딩중...</p> : notices.length > 0 ? (
                            <ul className="space-y-3">{notices.map(notice => (
                                <li key={notice.id} className="hover:bg-gray-50 p-2 -m-2 rounded-lg">
                                    <Link href={`/notices/${notice.id}`} className="flex justify-between items-center gap-4">
                                        <p className="font-semibold text-gray-700 truncate flex-1">{notice.title}</p>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm text-gray-600">{notice.author?.full_name || '익명'}</p>
                                            <p className="text-xs text-gray-400">{new Date(notice.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </Link>
                                </li>
                            ))}</ul>
                        ) : <p className="text-center py-10">등록된 공지사항이 없습니다.</p>}
                    </Widget>
                </div>
                
                <div className="lg:col-span-1">
                    <Widget title="나의 휴가/일정">
                        <ClientSideOnlyWrapper>
                            {currentUser && <LeaveCalendar currentUser={currentUser} isWidget={true} />}
                        </ClientSideOnlyWrapper>
                    </Widget>
                </div>
            </section>
        </div>
    );
}