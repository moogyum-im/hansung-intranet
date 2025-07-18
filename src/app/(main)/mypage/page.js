// 파일 경로: src/app/(main)/mypage/page.js

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import MyAttendanceWidget from '@/components/MyAttendanceWidget';
import LeaveCalendar from './LeaveCalendar.jsx';
import ClientSideOnlyWrapper from '@/components/ClientSideOnlyWrapper';

// --- 재사용 컴포넌트들 ---
function MyLeaveWidget({ employee }) {
    if (!employee || !employee.id) return <div className="bg-white p-5 rounded-xl border shadow-sm h-full flex items-center justify-center animate-pulse"><p className="text-gray-500">연차 정보 로딩...</p></div>;

    // ★★★ employee 객체에서 total_leave_days와 remaining_leave_days 값을 가져옴 ★★★
    // profiles 테이블의 실제 컬럼 이름인 'total_leave_days'를 사용합니다.
    const total = employee.total_leave_days ?? 0; // 'total_leaves' 대신 'total_leave_days' 사용
    const remaining = employee.remaining_leave_days ?? 0;
    
    // 사용된 연차 일수 계산 (used_leave_days 컬럼을 사용하거나 계산)
    // 1. 만약 used_leave_days 컬럼이 정확하다면 그 값을 사용:
    const used = employee.used_leave_days ?? (total - remaining); // used_leave_days가 없으면 계산

    // 2. 만약 total과 remaining으로만 계산할 거라면:
    // const used = total - remaining;

    // 사용된 연차 비율 계산 (총 연차가 0일 경우 0%로 설정)
    const usedPercentage = (total > 0 && !isNaN(used) && !isNaN(total)) ? (used / total) * 100 : 0;
    
    return (
        <div className="bg-white p-5 rounded-xl border shadow-sm h-full">
            <h2 className="text-lg font-bold text-gray-800 mb-4">나의 연차 현황</h2>
            <div className="text-center mb-4">
                <p className="text-sm text-gray-500">남은 연차</p>
                <p className="text-4xl font-bold text-blue-600 my-1">{remaining}<span className="text-lg ml-1">일</span></p>
                <p className="text-xs text-gray-400">(총 {total}일 중 {used}일 사용)</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, usedPercentage))}%` }}></div>
            </div>
        </div>
    );
}

function MyApprovalsWidget({ toReview, submitted, completed, referred }) {
    const [activeTab, setActiveTab] = useState('toReview'); 
    const getStatusChip = (status) => {
        const styles = {
            '진행중': 'bg-green-100 text-green-800', '대기': 'bg-yellow-100 text-yellow-800',
            '승인': 'bg-blue-100 text-blue-800', '반려': 'bg-red-100 text-red-800',
        };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
    };
    const renderList = (list) => {
        if (list.length === 0) return <p className="text-center text-gray-500 py-10">해당 문서가 없습니다.</p>;
        return (
            <ul className="space-y-2">
                {list.map(doc => (
                    <Link key={doc.id} href={`/approvals/${doc.id}`} className="block p-3 rounded-lg hover:bg-gray-100 border">
                        <div className="flex justify-between items-center">
                            <p className="font-medium text-gray-800 truncate">{doc.title}</p>
                            {activeTab === 'toReview' && doc.approver_status ? getStatusChip(doc.approver_status) : getStatusChip(doc.status)}
                        </div>
                         <p className="text-sm text-gray-500 mt-1">상신자: {doc.author?.full_name || '정보 없음'}</p>
                    </Link>
                ))}
            </ul>
        );
    };
    
    return (
        <div>
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('toReview')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'toReview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>받은 결재 ({toReview.length})</button>
                    <button onClick={() => setActiveTab('submitted')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'submitted' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>상신한 결재 ({submitted.length})</button>
                    <button onClick={() => setActiveTab('completed')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>완료된 결재 ({completed.length})</button>
                    <button onClick={() => setActiveTab('referred')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'referred' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>참조할 결재 ({referred.length})</button>
                </nav>
            </div>
            <div className="overflow-y-auto max-h-64 pr-2">
              {activeTab === 'toReview' && renderList(toReview)}
              {activeTab === 'submitted' && renderList(submitted)}
              {activeTab === 'completed' && renderList(completed)}
              {activeTab === 'referred' && renderList(referred)}
            </div>
        </div>
    );
}


function BusinessReportsWidget({ myReports, receivedReports }) {
    const [activeTab, setActiveTab] = useState('received');
    const renderList = (list, type) => {
        if (list.length === 0) return <p className="text-center text-gray-500 py-10">해당 업무 보고가 없습니다.</p>;
        return (
            <ul className="space-y-3">
                {list.map(log => (
                    <Link href={`/approvals/${log.id}`} key={log.id} className="block p-3 rounded-lg hover:bg-gray-100 cursor-pointer border">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-gray-800 truncate">{log.title}</p>
                            <span className="text-sm text-gray-500 whitespace-nowrap">{type === 'my' ? (log.recipient_name || '수신자 미지정') : log.author_name}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{new Date(log.created_at).toLocaleDateString()}</p>
                    </Link>
                ))}
            </ul>
        );
    };
    return (
        <div>
             <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('received')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'received' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>보고받은 업무 ({receivedReports.length})</button>
                    <button onClick={() => setActiveTab('my')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'my' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>보고한 업무 ({myReports.length})</button>
                </nav>
            </div>
            <div className="overflow-y-auto max-h-80 pr-2">{activeTab === 'received' ? renderList(receivedReports, 'received') : renderList(myReports, 'my')}</div>
        </div>
    );
}


// --- 메인 페이지 컴포넌트 ---
export default function MyPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const [mySubmittedApprovals, setMySubmittedApprovals] = useState([]);
    const [approvalsToReview, setApprovalsToReview] = useState([]);
    const [completedApprovals, setCompletedApprovals] = useState([]);
    const [referredApprovals, setReferredApprovals] = useState([]);
    const [myWorkReports, setMyWorkReports] = useState([]);
    const [receivedWorkLogs, setReceivedWorkLogs] = useState([]);
    const [loadingSubData, setLoadingSubData] = useState(true);

    const fetchData = useCallback(async (currentEmployee) => {
        if (!currentEmployee || !currentEmployee.id) {
            setLoadingSubData(false);
            return;
        }
        setLoadingSubData(true);

        try {
            const { data: form } = await supabase.from('approval_forms').select('id').eq('title', '업무 보고서').single();
            const workReportFormId = form?.id;

            const fetchMySubmitted = async () => {
                let query = supabase.from('approval_documents').select('id, title, status, created_at, author:profiles(full_name)').eq('author_id', currentEmployee.id).in('status', ['대기', '진행중']);
                if (workReportFormId) query = query.not('form_id', 'eq', workReportFormId);
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) console.error('상신한 결재 로드 오류:', error);
                return data || [];
            };

            const fetchToReview = async () => {
                const { data: approverEntries, error: entryError } = await supabase
                    .from('approval_document_approvers')
                    .select('document_id, status')
                    .eq('approver_id', currentEmployee.id)
                    .eq('status', '대기');

                if (entryError) {
                    console.error('받은 결재 항목 조회 오류:', entryError);
                    return [];
                }
                if (!approverEntries || approverEntries.length === 0) {
                    return [];
                }
                
                const docIds = approverEntries.map(e => e.document_id);
                const { data, error } = await supabase
                    .from('approval_documents')
                    .select('*, author:profiles(full_name)')
                    .in('id', docIds)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('받은 결재 문서 로드 오류:', error);
                    return [];
                }
                
                return data?.map(doc => {
                    const approverEntry = approverEntries.find(ae => ae.document_id === doc.id);
                    return { ...doc, approver_status: approverEntry?.status };
                }) || [];
            };
            
            const fetchCompleted = async () => {
                const { data, error } = await supabase.rpc('get_my_completed_approvals', { p_employee_id: currentEmployee.id });
                if (error) console.error('완료된 결재 로드 오류:', error);
                return data || [];
            };

            const fetchReferredApprovals = async () => {
                const { data, error } = await supabase.rpc('get_my_referred_documents', { p_employee_id: currentEmployee.id });
                if (error) console.error('참조할 결재 로드 오류:', error);
                return data || [];
            };

            const fetchMyReports = async () => {
                if (!workReportFormId) return [];
                const { data, error } = await supabase.from('approval_documents').select('id, title, created_at, form_fields').eq('author_id', currentEmployee.id).eq('form_id', workReportFormId);
                if (error) console.error('내 업무 보고서 로드 오류:', error);
                return (data || []).map(report => ({ ...report, recipient_name: report.form_fields?.수신자 || '지정 안됨' }));
            };

            const fetchReceivedReports = async () => {
                const { data, error } = await supabase.rpc('get_work_reports_for_user', { user_id_param: currentEmployee.id });
                if (error) console.error('받은 업무 보고서 로드 오류:', error);
                return data || [];
            };

            const [submitted, toReview, completed, referred, myReports, receivedReports] = await Promise.all([
                fetchMySubmitted(),
                fetchToReview(),
                fetchCompleted(),
                fetchReferredApprovals(),
                fetchMyReports(),
                fetchReceivedReports()
            ]);

            setMySubmittedApprovals(submitted);
            setApprovalsToReview(toReview);
            setCompletedApprovals(completed);
            setReferredApprovals(referred);
            setMyWorkReports(myReports);
            setReceivedWorkLogs(receivedReports);

        } catch (error) {
            console.error("MyPage fetchData: Uncaught error:", error);
        } finally {
            setLoadingSubData(false);
        }
    }, []);

    useEffect(() => {
        if (employee) fetchData(employee);
        else if (!employeeLoading) setLoadingSubData(false);
    }, [employee, employeeLoading, fetchData]);

    if (employeeLoading) return <div className="p-8 text-center">마이페이지 로딩 중...</div>;
    if (!employee || !employee.id) return <div className="p-8 text-center text-gray-600">직원 정보를 불러올 수 없습니다. 로그인 상태를 확인해주세요.</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-full">
            <header className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">내 정보 및 현황</h1>
                <p className="text-gray-600 mt-1.5">{employee?.full_name}님의 개인 정보를 관리하고 업무 현황을 확인합니다.</p>
            </header>
            
            <main className="space-y-8">
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1"><MyAttendanceWidget currentUser={employee} /></div>
                    <div className="lg:col-span-1"><MyLeaveWidget employee={employee} /></div>
                    <div className="lg:col-span-1"><ClientSideOnlyWrapper><LeaveCalendar currentUser={employee} /></ClientSideOnlyWrapper></div>
                </section>
                
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-5 rounded-xl border shadow-sm lg:col-span-2">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">내 결재 현황</h2>
                        {loadingSubData ? <p className="text-center text-gray-500 py-10">로딩 중...</p> : <MyApprovalsWidget toReview={approvalsToReview} submitted={mySubmittedApprovals} completed={completedApprovals} referred={referredApprovals} />}
                    </div>
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">업무 보고</h2>
                        {loadingSubData ? <p className="text-center text-gray-500 py-10">로딩 중...</p> : <BusinessReportsWidget myReports={myWorkReports} receivedReports={receivedWorkLogs} />}
                    </div>
                </section>
            </main>
        </div>
    );
}