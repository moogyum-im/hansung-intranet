// 파일 경로: src/app/(main)/dashboard/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardCalendar from './DashboardCalendar';
// --- [추가] 푸시 알림 구독 훅을 가져옵니다. ---
import { usePushNotifications } from '@/hooks/usePushNotifications';

// --- 아이콘 컴포넌트 (기존과 동일) ---
const ApprovalIcon = () => (<svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const ChatIcon = () => (<svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>);

// --- 위젯 컴포넌트들 (기존과 동일) ---
const Widget = ({ title, children, className }) => (
    <div className={`bg-white rounded-xl shadow-sm border flex flex-col ${className}`}>
        <h3 className="font-bold text-gray-800 text-base px-5 py-3 border-b">{title}</h3>
        <div className="p-4 flex-1 overflow-y-auto" style={{ maxHeight: '250px' }}>
            {children}
        </div>
    </div>
);

function MyApprovalsWidget({ employee }) {
    const [approvalsData, setApprovalsData] = useState({ toReview: [], submitted: [] });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (employee) {
            const fetchData = async () => {
                setLoading(true);
                const { data, error } = await supabase.rpc('get_my_approvals', { p_user_id: employee.id });
                if (error) console.error("결재 현황 로딩 실패:", error);
                else setApprovalsData({ toReview: data.filter(doc => doc.category === 'to_review'), submitted: data.filter(doc => doc.category === 'submitted') });
                setLoading(false);
            };
            fetchData();
        }
    }, [employee]);
    const [activeTab, setActiveTab] = useState('toReview');
    const renderList = (list) => {
        if (!list || list.length === 0) return <p className="text-center text-gray-500 py-4 text-sm">해당 문서가 없습니다.</p>;
        return <ul className="space-y-2">{list.map(doc => (<Link key={doc.id} href={`/approvals/${doc.id}`} className="block p-2 rounded-lg hover:bg-gray-50"><div className="flex justify-between items-center"><p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p></div><p className="text-xs text-gray-500 mt-0.5">상신자: {doc.creator_name || '정보 없음'}</p></Link>))}</ul>;
    };
    return (
        <Widget title="내 결재 현황" className="h-full">
            {loading ? <p className="text-sm text-gray-500">로딩 중...</p> : (
                <>
                    <div className="border-b border-gray-200 mb-3"><nav className="-mb-px flex space-x-4 text-sm">
                        <button onClick={() => setActiveTab('toReview')} className={`py-2 px-1 border-b-2 ${activeTab === 'toReview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>받은 결재 ({approvalsData.toReview.length})</button>
                        <button onClick={() => setActiveTab('submitted')} className={`py-2 px-1 border-b-2 ${activeTab === 'submitted' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>상신한 결재 ({approvalsData.submitted.length})</button>
                    </nav></div>
                    <div>
                        {activeTab === 'toReview' && renderList(approvalsData.toReview)}
                        {activeTab === 'submitted' && renderList(approvalsData.submitted)}
                    </div>
                </>
            )}
        </Widget>
    );
}

function NotificationWidget() {
    const { employee } = useEmployee();
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    useEffect(() => {
        if (employee) {
            const fetchNotifications = async () => {
                const { data } = await supabase.from('notifications').select('*').eq('recipient_id', employee.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5);
                setNotifications(data || []);
            };
            fetchNotifications();
        }
    }, [employee]);
    const handleNotificationClick = async (notification) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        if (notification.link) router.push(notification.link);
    };
    return (
        <Widget title={`확인할 내용 (${notifications.length})`}>
            {notifications.length > 0 ? (
                <div className="space-y-2">{notifications.map(noti => (
                    <div key={noti.id} onClick={() => handleNotificationClick(noti)} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <div className="flex items-start gap-2.5">
                            {noti.type === 'new_message' ? <ChatIcon /> : <ApprovalIcon />}
                            <div className="flex-grow"><p className="text-sm text-gray-700">{noti.content}</p></div>
                        </div>
                    </div>
                ))}</div>
            ) : (
                <div className="text-center text-gray-400 text-sm flex-1 flex flex-col justify-center items-center h-full"><svg className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p>확인할 내용이 없습니다.</p></div>
            )}
        </Widget>
    );
}

export default function DashboardPage() {
    const { employee: currentUser, loading: employeeLoading } = useEmployee();
    const [notices, setNotices] = useState([]);
    // --- [추가] 푸시 알림 훅을 사용합니다. ---
    const { subscribeToPush } = usePushNotifications();

    useEffect(() => {
        const fetchNotices = async () => {
            const { data } = await supabase.from('notices').select(`id, title, created_at`).order('created_at', { ascending: false }).limit(5);
            setNotices(data || []);
        };
        fetchNotices();
        
        // --- [추가] 페이지가 로드되고 사용자 정보가 있을 때 푸시 구독을 시도합니다. ---
        if (currentUser) {
            console.log('사용자 정보 확인됨, 푸시 구독 시도...');
            subscribeToPush();
        }

    }, [currentUser, subscribeToPush]); // currentUser가 변경될 때도 실행되도록 의존성 배열에 추가
    
    if (employeeLoading) return <div className="h-full flex items-center justify-center"><p>대시보드 정보를 불러오는 중...</p></div>;

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-gray-50 min-h-full">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">안녕하세요, {currentUser?.full_name || '사용자'}님! 👋</h1>
                <p className="text-gray-500 text-sm mt-1">오늘도 힘찬 하루 보내세요.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <NotificationWidget />
                    <MyApprovalsWidget employee={currentUser} />
                </div>
                <div className="space-y-6">
                    <Widget title="최신 공지사항">
                        {notices.length > 0 ? (
                            <ul className="space-y-1">{notices.map(notice => (
                                <li key={notice.id}><Link href={`/notices/${notice.id}`} className="p-2 -m-2 rounded-lg flex justify-between items-center hover:bg-gray-50"><p className="font-medium text-sm text-gray-700 truncate flex-1">{notice.title}</p><p className="text-xs text-gray-400 shrink-0 ml-2">{new Date(notice.created_at).toLocaleDateString()}</p></Link></li>
                            ))}</ul>
                        ) : <p className="text-center text-gray-400 text-sm py-8">등록된 공지가 없습니다.</p>}
                    </Widget>
                    <Widget title="최근 프로젝트">
                         <div className="text-center text-gray-400 text-sm flex-1 flex flex-col justify-center items-center h-full">
                            <p>참여중인 프로젝트가 없습니다.</p>
                        </div>
                    </Widget>
                </div>
                <div className="space-y-6">
                    <DashboardCalendar />
                </div>
            </div>
        </div>
    );
}