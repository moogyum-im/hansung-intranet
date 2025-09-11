'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import MyAttendanceWidget from '@/components/MyAttendanceWidget';
import LeaveCalendar from './LeaveCalendar.jsx';
import ClientSideOnlyWrapper from '@/components/ClientSideOnlyWrapper';

function MyLeaveWidget({ employee }) {
    if (!employee || !employee.id) return <div className="bg-white p-5 rounded-xl border shadow-sm h-full flex items-center justify-center"><p className="text-gray-500">연차 정보 로딩...</p></div>;
    const total = employee.total_leave_days ?? 0;
    const remaining = employee.remaining_leave_days ?? 0;
    const used = total - remaining;
    const usedPercentage = (total > 0) ? (used / total) * 100 : 0;
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
                        {/* [핵심 수정] 날짜를 표시하는 코드를 추가합니다. */}
                        <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                            <span>상신자: {doc.creator_name || '정보 없음'}</span>
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

export default function MyPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const [approvalsData, setApprovalsData] = useState({ toReview: [], submitted: [], completed: [], referred: [] });
    const [loadingSubData, setLoadingSubData] = useState(true);

    const fetchData = useCallback(async (currentEmployee) => {
        if (!currentEmployee) { setLoadingSubData(false); return; }
        setLoadingSubData(true);
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
            console.error("MyPage fetchData 오류:", error);
        } finally {
            setLoadingSubData(false);
        }
    }, []);

    useEffect(() => {
        if (employee) fetchData(employee);
    }, [employee, fetchData]);

    if (employeeLoading) return <div className="p-8 text-center">마이페이지 로딩 중...</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-full">
            <header className="mb-8"><h1 className="text-2xl sm:text-3xl font-bold text-gray-900">내 정보 및 현황</h1></header>
            <main className="space-y-8">
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MyAttendanceWidget currentUser={employee} />
                    <MyLeaveWidget employee={employee} />
                    <ClientSideOnlyWrapper><LeaveCalendar currentUser={employee} /></ClientSideOnlyWrapper>
                </section>
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">내 결재 현황</h2>
                    {loadingSubData ? <p className="text-center py-10 text-gray-500">결재 문서를 불러오는 중...</p> : <MyApprovalsWidget 
                        toReview={approvalsData.toReview} 
                        submitted={approvalsData.submitted}
                        completed={approvalsData.completed}
                        referred={approvalsData.referred}
                    />}
                </section>
            </main>
        </div>
    );
}