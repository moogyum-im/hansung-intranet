'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- 재사용 컴포넌트: 결재 문서 목록 ---
const ApprovalList = ({ documents, type }) => {
    if (documents.length === 0) {
        return <p className="text-center text-gray-500 py-16">해당하는 결재 문서가 없습니다.</p>;
    }

    const getStatusChip = (status) => {
        const styles = {
            '대기': 'bg-yellow-100 text-yellow-800',
            '진행중': 'bg-green-100 text-green-800',
            '승인': 'bg-blue-100 text-blue-800',
            '반려': 'bg-red-100 text-red-800',
        };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
    };

    return (
        <div className="space-y-3">
            {documents.map(doc => (
                <Link key={doc.id} href={`/approvals/${doc.id}`} className="block p-4 rounded-lg border bg-white hover:bg-gray-50 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <p className="font-semibold text-gray-800">{doc.title}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {type === 'received' ? `상신자: ${doc.author?.full_name || '정보 없음'}` : `문서 종류: ${doc.type || '일반'}`}
                            </p>
                        </div>
                        <div className="flex flex-col items-end">
                            {getStatusChip(doc.status)}
                            <p className="text-xs text-gray-400 mt-2">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};


// --- 메인 페이지 컴포넌트 ---
export default function ApprovalsPage() {
    const router = useRouter();
    const { employee, loading: employeeLoading } = useEmployee();
    const [activeTab, setActiveTab] = useState('received');
    
    const [receivedDocs, setReceivedDocs] = useState([]);
    const [submittedDocs, setSubmittedDocs] = useState([]);
    const [completedDocs, setCompletedDocs] = useState([]);
    
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (currentEmployee) => {
        if (!currentEmployee) return;
        setLoading(true);

        const fetchReceived = async () => {
            const { data: approverEntries } = await supabase.from('approval_document_approvers').select('document_id').eq('approver_id', currentEmployee.id).eq('status', '대기');
            if (!approverEntries || approverEntries.length === 0) return [];
            const docIds = approverEntries.map(e => e.document_id);
            const { data } = await supabase.from('approval_documents').select('*, author:profiles(full_name)').in('id', docIds).order('created_at', { ascending: false });
            return data || [];
        };
        
        const fetchSubmitted = async () => {
            const { data } = await supabase.from('approval_documents').select('*').eq('author_id', currentEmployee.id).in('status', ['대기', '진행중']).order('created_at', { ascending: false });
            return data || [];
        };

        const fetchCompleted = async () => {
            const myIdSet = (await supabase.from('approval_documents').select('id').eq('author_id', currentEmployee.id)).data?.map(d => d.id) || [];
            const approvedIdSet = (await supabase.from('approval_document_approvers').select('document_id').eq('approver_id', currentEmployee.id)).data?.map(d => d.document_id) || [];
            const allRelatedIds = [...new Set([...myIdSet, ...approvedIdSet])];

            if (allRelatedIds.length === 0) return [];

            const { data } = await supabase.from('approval_documents').select('*, author:profiles(full_name)').in('id', allRelatedIds).in('status', ['승인', '반려']).order('created_at', { ascending: false });
            return data || [];
        };

        const [received, submitted, completed] = await Promise.all([
            fetchReceived(),
            fetchSubmitted(),
            fetchCompleted()
        ]);

        setReceivedDocs(received);
        setSubmittedDocs(submitted);
        setCompletedDocs(completed);
        setLoading(false);

    }, []);

    useEffect(() => {
        if (employee) {
            fetchData(employee);
        } else if (!employeeLoading) {
            setLoading(false);
        }
    }, [employee, employeeLoading, fetchData]);

    if (loading || employeeLoading) {
        return <div className="p-8 text-center">결재 문서를 불러오는 중...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-full">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">전자 결재</h1>
                <button onClick={() => router.push('/approvals/forms')} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                    + 새 결재 작성
                </button>
            </header>

            <main>
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button onClick={() => setActiveTab('received')} className={`py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'received' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            받은 결재
                        </button>
                        <button onClick={() => setActiveTab('submitted')} className={`py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'submitted' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            상신한 결재
                        </button>
                        <button onClick={() => setActiveTab('completed')} className={`py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            완료 문서
                        </button>
                    </nav>
                </div>

                <div>
                    {activeTab === 'received' && <ApprovalList documents={receivedDocs} type="received" />}
                    {activeTab === 'submitted' && <ApprovalList documents={submittedDocs} type="submitted" />}
                    {activeTab === 'completed' && <ApprovalList documents={completedDocs} type="completed" />}
                </div>
            </main>
        </div>
    );
}