// 파일 경로: src/app/(main)/dashboard/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '../../../contexts/EmployeeContext';
import { supabase } from 'lib/supabase/client'; // (../../../ 사라짐)
import Link from 'next/link';
import MyAttendanceWidget from '../../../components/MyAttendanceWidget';
import LeaveCalendar from '../mypage/LeaveCalendar'; 
import ClientSideOnlyWrapper from '@/components/ClientSideOnlyWrapper';

// ★★★ 아이콘, Widget, KpiCard 컴포넌트를 DashboardPage 함수 바깥으로 이동 ★★★

// 아이콘 컴포넌트들
const ApprovalIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-500"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>);
const NoticeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-500"><path d="M5.25 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM2.25 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63A13.977 13.977 0 0012 21.75a13.977 13.977 0 00-3.635-.773.75.75 0 01-.363-.63V19.125z" /></svg>);
const SiteIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-500"><path d="M19.5 21a3 3 0 003-3v-1.5a3 3 0 00-3-3h-1.5a3 3 0 00-3 3V18a3 3 0 003 3h1.5zM16.5 6.75a3 3 0 00-3-3h-1.5a3 3 0 00-3 3v1.5a3 3 0 003 3h1.5a3 3 0 003-3V6.75z" /><path d="M4.5 21a3 3 0 003-3v-1.5a3 3 0 00-3-3H3a3 3 0 00-3 3V18a3 3 0 003 3h1.5zM1.5 6.75a3 3 0 013-3h1.5a3 3 0 013 3v1.5a3 3 0 01-3 3H3a3 3 0 01-3-3V6.75z" /></svg>);

// 대시보드 위젯을 위한 공통 컨테이너
const Widget = ({ title, icon, children, link, linkText = "더보기" }) => (
    <div className="bg-white rounded-lg shadow flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
                {icon}
                <h3 className="font-bold text-lg text-gray-800">{title}</h3>
            </div>
            {link && <Link href={link} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">{linkText}</Link>}
        </div>
        <div className="p-4 flex-1">
            {children}
        </div>
    </div>
);

// KPI 카드 컴포넌트
const KpiCard = ({ title, value, icon, unit }) => (
    <div className="bg-white rounded-lg shadow p-4 flex items-center">
        <div className="p-3 rounded-full bg-green-100">{icon}</div>
        <div className="ml-4">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value} <span className="text-base font-medium">{unit}</span></p>
        </div>
    </div>
);


export default function DashboardPage() {
    
    const { employee: currentUser, loading: employeeLoading } = useEmployee();
    
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [notices, setNotices] = useState([]);
    const [mySites, setMySites] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = useCallback(async () => {
        if (!currentUser?.id) return;
        setLoadingData(true);

        const [approvalRes, noticeRes, siteRes] = await Promise.all([
            supabase.from('approval_document_approvers').select('document:document_id(*, author:author_id(full_name))', { count: 'exact' }).eq('approver_id', currentUser.id).eq('status', '대기'),
            supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(5),
            supabase.from('construction_sites').select('*').limit(5)
        ]);
        
        setPendingApprovals(approvalRes.data?.map(d => d.document).filter(Boolean) || []);
        setNotices(noticeRes.data || []);
        setMySites(siteRes.data || []);
        
        setLoadingData(false);
    }, [currentUser, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    if (employeeLoading) return <div className="h-full flex items-center justify-center"><p>대시보드 로딩 중...</p></div>;

    return (
        <div className="h-full overflow-y-auto p-6 bg-gray-50">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">안녕하세요, {currentUser?.full_name}님! 👋</h1>
                <p className="text-gray-500">오늘도 힘찬 하루 보내세요.</p>
            </header>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <KpiCard title="처리할 결재" value={pendingApprovals.length} unit="건" icon={<ApprovalIcon />} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <Widget title="최신 공지사항" icon={<NoticeIcon />} link="/notices">
                         {loadingData ? <p>로딩중...</p> : notices.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {notices.map(notice => (
                                    <li key={notice.id} className="py-3">
                                        <Link href={`/notices/${notice.id}`} className="hover:text-green-600 block">
                                            <p className="font-medium truncate">{notice.title}</p>
                                            <p className="text-sm text-gray-500">{new Date(notice.created_at).toLocaleDateString()}</p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-center text-gray-500 py-8">등록된 공지사항이 없습니다.</p>}
                    </Widget>
                    <Widget title="내 현장 목록" icon={<SiteIcon />} link="/sites">
                        {loadingData ? <p>로딩중...</p> : mySites.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {mySites.map(site => (
                                    <li key={site.id} className="py-3">
                                        <Link href={`/sites/${site.id}`} className="hover:text-green-600 block">
                                            <div className="flex justify-between items-center">
                                                <p className="font-medium">{site.name}</p>
                                                <span className="text-sm text-gray-500">{site.progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${site.progress}%` }}></div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-center text-gray-500 py-8">참여중인 현장이 없습니다.</p>}
                    </Widget>
                </div>

                <div className="xl:col-span-1 space-y-6">
                    <MyAttendanceWidget currentUser={currentUser} />
                    <ClientSideOnlyWrapper>
                        {currentUser && <LeaveCalendar currentUser={currentUser} />}
                    </ClientSideOnlyWrapper>
                </div>
            </div>
        </div>
    );
}