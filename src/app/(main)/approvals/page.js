'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

// --- '내 결재 현황' 위젯 컴포넌트 ---
function MyApprovalsWidget({ toReview, submitted, completed, referred }) {
    const [activeTab, setActiveTab] = useState('toReview');
    
    const getStatusChip = (status) => {
        const statusMap = { 'pending': { text: '진행중', style: 'bg-yellow-100 text-yellow-800' }, '진행중': { text: '진행중', style: 'bg-yellow-100 text-yellow-800' }, '승인': { text: '승인', style: 'bg-blue-100 text-blue-800' }, '반려': { text: '반려', style: 'bg-red-100 text-red-800' }};
        const currentStatus = statusMap[status] || { text: status, style: 'bg-gray-100 text-gray-800' };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${currentStatus.style}`}>{currentStatus.text}</span>;
    };

    const renderList = (list) => {
        if (!list || list.length === 0) return <p className="text-center text-gray-500 py-10">해당 문서가 없습니다.</p>;
        return ( 
            <ul className="space-y-2">
                {list.map(doc => (
                    <Link key={doc.id} href={`/approvals/${doc.id}`} className="block p-3 rounded-lg hover:bg-gray-100 border">
                        <div className="flex justify-between items-center">
                            <p className="font-medium text-gray-800 truncate">{doc.title}</p>
                            {getStatusChip(doc.status)}
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                            <span>상신자: {doc.creator_name || '정보 없음'}</span>
                            {/* ★★★ 여기가 시간까지 표시하도록 수정된 부분입니다 ★★★ */}
                            {doc.created_at && (
                                <span className="text-xs">
                                    {new Date(doc.created_at).toLocaleString('ko-KR', {
                                        year: 'numeric',
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            )}
                        </div>
                    </Link>
                ))}
            </ul> 
        );
    };

    return (
        <div>
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('toReview')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'toReview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>받은 결재 ({toReview.length})</button>
                    <button onClick={() => setActiveTab('submitted')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'submitted' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>상신한 결재 ({submitted.length})</button>
                    <button onClick={() => setActiveTab('completed')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>완료된 결재 ({completed.length})</button>
                    <button onClick={() => setActiveTab('referred')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'referred' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>참조할 결재 ({referred.length})</button>
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

export default function ApprovalsPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const [approvalsData, setApprovalsData] = useState({ toReview: [], submitted: [], completed: [], referred: [] });
    const [loadingApprovals, setLoadingApprovals] = useState(true);

    const fetchApprovalsData = useCallback(async (currentEmployee) => {
        if (!currentEmployee) { setLoadingApprovals(false); return; }
        setLoadingApprovals(true);
        try {
            const { data, error } = await supabase.rpc('get_my_approvals', { p_user_id: currentEmployee.id });
            if (error) {
                console.error("결재 현황 데이터 로드 오류:", error);
                setApprovalsData({ toReview: [], submitted: [], completed: [], referred: [] });
                return;
            }
            setApprovalsData({
                toReview: data.filter(doc => doc.category === 'to_review'),
                submitted: data.filter(doc => doc.category === 'submitted'),
                completed: data.filter(doc => doc.category === 'completed'),
                referred: data.filter(doc => doc.category === 'referred'),
            });
        } catch (error) {
            console.error("ApprovalsPage fetchData 오류:", error);
        } finally {
            setLoadingApprovals(false);
        }
    }, []);

    useEffect(() => {
        if (employee) fetchApprovalsData(employee);
    }, [employee, fetchApprovalsData]);

    const approvalForms = [
        { title: '휴가신청서', description: '연차, 반차 등 휴가 신청을 위한 서류입니다.', href: '/approvals/leave' },
        { title: '지출결의서', description: '비용 지출에 대한 결재를 요청합니다.', href: '/approvals/expense' },
        { title: '내부결재서', description: '내부 결재를 상신하기 위한 서류입니다.', href: '/approvals/internal' },
        { title: '업무 보고서', description: '일간/주간/월간 업무 보고를 위한 서류입니다.', href: '/approvals/work-report' },
        { title: '사직서', description: '퇴사 의사를 결재자에게 상신합니다.', href: '/approvals/resignation' },
        { title: '시말서', description: '사건 경위를 작성하여 결재자에게 상신합니다.', href: '/approvals/apology' },
    ];

    if (employeeLoading) {
        return <div className="p-8 text-center">페이지 로딩 중...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">전자 결재</h1>
            </header>
            
            <main className="space-y-8">
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">내 결재 현황</h2>
                    {loadingApprovals ? 
                        <p className="text-center py-10 text-gray-500">결재 문서를 불러오는 중...</p> : 
                        <MyApprovalsWidget 
                            toReview={approvalsData.toReview} 
                            submitted={approvalsData.submitted}
                            completed={approvalsData.completed}
                            referred={approvalsData.referred}
                        />
                    }
                </section>

                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 mt-8">결재 양식 선택</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {approvalForms.map((form) => (
                            <Link href={form.href} key={form.title} className="group bg-white p-6 rounded-xl border shadow-sm hover:border-blue-500 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{form.title}</h3>
                                    <p className="text-gray-600 text-sm mt-2">{form.description}</p>
                                </div>
                                <div className="flex justify-end items-center mt-4">
                                    <span className="text-sm font-medium text-blue-600 group-hover:underline">작성하기</span>
                                    <ArrowRightIcon className="w-4 h-4 ml-1 text-blue-600 transition-transform duration-300 group-hover:translate-x-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}