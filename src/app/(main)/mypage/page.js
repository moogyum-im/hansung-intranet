// src/app/(main)/mypage/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import MyAttendanceWidget from '@/components/MyAttendanceWidget';
import LeaveCalendar from './LeaveCalendar';
import ClientSideOnlyWrapper from '@/components/ClientSideOnlyWrapper';

// --- 재사용 컴포넌트들 ---

// 연차 현황 위젯 (이전 수정된 부분과 동일)
function MyLeaveWidget({ employee }) {
    if (!employee) return <div className="bg-white p-5 rounded-xl border shadow-sm h-full flex items-center justify-center animate-pulse"><p className="text-gray-500">연차 정보 로딩...</p></div>;
    
    const total = employee.total_leaves ?? 15;
    const remaining = employee.remaining_leave_days ?? 0;
    const used = total - remaining;

    const usedPercentage = total > 0 ? (used / total) * 100 : 0;
    
    return (
        <div className="bg-white p-5 rounded-xl border shadow-sm h-full">
            <h2 className="text-lg font-bold text-gray-800 mb-4">나의 연차 현황</h2>
            <div className="text-center mb-4">
                <p className="text-sm text-gray-500">남은 연차</p>
                <p className="text-4xl font-bold text-blue-600 my-1">{remaining}<span className="text-lg ml-1">일</span></p>
                <p className="text-xs text-gray-400">(총 {total}일 중 {used}일 사용)</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${usedPercentage}%` }}></div></div>
        </div>
    );
}

// 내 결재 현황 위젯 (수정됨: '완료된 결재' 텍스트 변경 및 '참조할 결재' 탭/프롭 추가)
function MyApprovalsWidget({ toReview, submitted, completed, referred }) { // 'referred' 프롭 추가
    const [activeTab, setActiveTab] = useState('toReview'); 

    const getStatusChip = (status) => {
        const styles = {
            '진행중': 'bg-green-100 text-green-800', '대기': 'bg-yellow-100 text-yellow-800',
            '승인': 'bg-blue-100 text-blue-800', '반려': 'bg-red-100 text-red-800',
        };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
    };

    const renderList = (list) => {
        if (list.length === 0) {
            return <p className="text-center text-gray-500 py-10">해당 문서가 없습니다.</p>;
        }
        return (
            <ul className="space-y-2">
                {list.map(doc => (
                    <Link key={doc.id} href={`/approvals/${doc.id}`} className="block p-3 rounded-lg hover:bg-gray-100 border">
                        <div className="flex justify-between items-center">
                            <p className="font-medium text-gray-800 truncate">{doc.title}</p>
                            {/* Display correct status chip based on tab context */}
                            {/* Received Approvals, Completed Approvals는 approver_status를 우선 사용 */}
                            {activeTab === 'received' && doc.approver_status ? getStatusChip(doc.approver_status) :
                             activeTab === 'completed' && doc.approver_status ? getStatusChip(doc.approver_status) :
                             getStatusChip(doc.status)} {/* 그 외 (상신한 결재, 참조할 결재)는 문서 자체의 status 사용 */}
                        </div>
                         <p className="text-sm text-gray-500 mt-1">상신자: {doc.author?.full_name || doc.author_full_name || '정보 없음'}</p>
                    </Link>
                ))}
            </ul>
        );
    }
    
    return (
        <div>
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('toReview')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'toReview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        받은 결재 ({toReview.length})
                    </button>
                    <button onClick={() => setActiveTab('submitted')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'submitted' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        상신한 결재 ({submitted.length})
                    </button>
                    <button onClick={() => setActiveTab('completed')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        완료된 결재 ({completed.length}) {/* '완료문서' -> '완료된 결재'로 텍스트 변경 */}
                    </button>
                    <button onClick={() => setActiveTab('referred')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'referred' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        참조할 결재 ({referred.length}) {/* '참조할 결재' 탭 추가 */}
                    </button>
                </nav>
            </div>
            <div className="overflow-y-auto max-h-64 pr-2">
              {activeTab === 'toReview' && renderList(toReview)}
              {activeTab === 'submitted' && renderList(submitted)}
              {activeTab === 'completed' && renderList(completed)}
              {activeTab === 'referred' && renderList(referred)} {/* '참조할 결재' 콘텐츠 렌더링 */}
            </div>
        </div>
    );
}

// 업무 보고 위젯 (기존과 동일)
function BusinessReportsWidget({ myReports, receivedReports }) {
    const [activeTab, setActiveTab] = useState('received');

    const renderList = (list, type) => {
        if (list.length === 0) {
            return <p className="text-center text-gray-500 py-10">해당 업무 보고가 없습니다.</p>;
        }
        return (
            <ul className="space-y-3">
                {list.map(log => (
                    <Link href={`/approvals/${log.id}`} key={log.id} className="block p-3 rounded-lg hover:bg-gray-100 cursor-pointer border">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-gray-800 truncate">{log.title}</p>
                            <span className="text-sm text-gray-500 whitespace-nowrap">
                                {type === 'my' ? (log.recipient_name || '수신자 미지정') : log.author_name}
                            </span>
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
                    <button onClick={() => setActiveTab('received')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'received' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        보고받은 업무 ({receivedReports.length})
                    </button>
                     <button onClick={() => setActiveTab('my')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'my' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        보고한 업무 ({myReports.length})
                    </button>
                </nav>
            </div>
            <div className="overflow-y-auto max-h-80 pr-2">
                {activeTab === 'received' ? renderList(receivedReports, 'received') : renderList(myReports, 'my')}
            </div>
        </div>
    );
}


// --- 메인 페이지 컴포넌트 ---
export default function MyPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const [mySubmittedApprovals, setMySubmittedApprovals] = useState([]);
    const [approvalsToReview, setApprovalsToReview] = useState([]);
    const [completedApprovals, setCompletedApprovals] = useState([]);
    const [referredApprovals, setReferredApprovals] = useState([]); // '참조할 결재' 상태 추가
    const [myWorkReports, setMyWorkReports] = useState([]);
    const [receivedWorkLogs, setReceivedWorkLogs] = useState([]);
    const [loadingSubData, setLoadingSubData] = useState(true);

    const fetchData = useCallback(async (currentEmployee) => {
        if (!currentEmployee) return;
        setLoadingSubData(true);

        const { data: form } = await supabase.from('approval_forms').select('id').eq('title', '업무 보고서').single();
        const workReportFormId = form?.id;

        const fetchMySubmitted = async () => {
            let query = supabase.from('approval_documents').select('id, title, status, author:profiles(full_name)').eq('author_id', currentEmployee.id).in('status', ['대기', '진행중']);
            if (workReportFormId) {
                query = query.not('form_id', 'eq', workReportFormId);
            }
            const { data } = await query.order('created_at', { ascending: false });
            return data || [];
        };

        const fetchToReview = async () => {
            const { data: approverEntries } = await supabase.from('approval_document_approvers').select('document_id').eq('approver_id', currentEmployee.id).eq('status', '대기');
            if (!approverEntries || approverEntries.length === 0) return [];
            const docIds = approverEntries.map(e => e.document_id);
            const { data } = await supabase.from('approval_documents').select('id, title, status, author:profiles(full_name)').in('id', docIds);
            return data || [];
        };
        
        const fetchCompleted = async () => {
            // 본인이 작성했거나 본인이 결재선에 있었던 문서 중 '승인' 또는 '반려' 상태인 문서
            const uniqueCompletedDocs = new Map(); // Map을 사용하여 ID 기반으로 중복 제거

            // 1. 본인이 작성한 문서 중 완료된 것 (상신한 결재의 완료된 상태)
            const { data: authoredCompletedDocs } = await supabase
                .from('approval_documents')
                .select('id, title, status, created_at, author:profiles(full_name)')
                .eq('author_id', currentEmployee.id)
                .in('status', ['승인', '반려']);
            
            authoredCompletedDocs?.forEach(doc => {
                uniqueCompletedDocs.set(doc.id, { ...doc, approver_status: doc.status }); // 문서 자체의 상태를 approver_status로 설정
            });

            // 2. 본인이 결재한 문서 중 완료된 것 (받은 결재의 완료된 상태)
            const { data: processedApprovals } = await supabase
                .from('approval_document_approvers')
                .select('document_id, status') // 문서 ID와 처리 상태만 선택
                .eq('approver_id', currentEmployee.id)
                .in('status', ['승인', '반려']);
            
            if (processedApprovals && processedApprovals.length > 0) {
                const docIds = processedApprovals.map(entry => entry.document_id);
                // 해당 문서 ID들의 상세 정보를 다시 가져옴
                const { data: approvedDocs } = await supabase
                    .from('approval_documents')
                    .select('id, title, status, created_at, author:profiles(full_name)')
                    .in('id', docIds);
                
                approvedDocs?.forEach(doc => {
                    const approverStatus = processedApprovals.find(e => e.document_id === doc.id)?.status;
                    uniqueCompletedDocs.set(doc.id, { ...doc, approver_status: approverStatus }); // Map에 저장 또는 업데이트
                });
            }

            // Map의 값들을 배열로 변환하고 최신순으로 정렬
            return Array.from(uniqueCompletedDocs.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        };


        const fetchMyReports = async () => {
            if (!workReportFormId) return [];
            const { data } = await supabase.from('approval_documents').select('id, title, created_at, form_fields').eq('author_id', currentEmployee.id).eq('form_id', workReportFormId);
            return (data || []).map(report => ({
                ...report,
                recipient_name: report.form_fields?.수신자 || report.form_fields?.recipient || '지정 안됨'
            }));
        };

        const fetchReceivedReports = async () => {
            const { data } = await supabase.rpc('get_work_reports_for_user', { user_id_param: currentEmployee.id });
            return data || [];
        };
        
        // ★★★ 참조할 결재 데이터 가져오기 (RPC 호출) ★★★
        const fetchReferredApprovals = async () => {
            const { data, error } = await supabase.rpc('get_my_referred_documents', { p_employee_id: currentEmployee.id });
            if (error) {
                console.error('참조할 결재 로드 오류:', error);
                return [];
            }
            // get_my_referred_documents 함수에서 author_full_name을 반환하므로,
            // MyApprovalsWidget의 Link 컴포넌트에서 doc.author_full_name으로 접근 가능
            return data || [];
        };

        const [submitted, toReview, completed, referred, myReports, receivedReports] = await Promise.all([
            fetchMySubmitted(),
            fetchToReview(),
            fetchCompleted(),
            fetchReferredApprovals(), // 참조할 결재 데이터 호출
            fetchMyReports(),
            fetchReceivedReports()
        ]);

        setMySubmittedApprovals(submitted);
        setApprovalsToReview(toReview);
        setCompletedApprovals(completed);
        setReferredApprovals(referred); // '참조할 결재' 상태 업데이트
        setMyWorkReports(myReports);
        setReceivedWorkLogs(receivedReports);
        
        setLoadingSubData(false);
    }, []);

    useEffect(() => {
        if (employee) { fetchData(employee); }
    }, [employee, fetchData]);

    if (employeeLoading) return <div className="p-8 text-center">마이페이지 로딩 중...</div>;

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
                        {loadingSubData ? (
                            <p className="text-center text-gray-500 py-10">로딩 중...</p>
                        ) : (
                            <MyApprovalsWidget 
                                toReview={approvalsToReview} 
                                submitted={mySubmittedApprovals} 
                                completed={completedApprovals} 
                                referred={referredApprovals} // '참조할 결재' 데이터 전달
                            />
                        )}
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