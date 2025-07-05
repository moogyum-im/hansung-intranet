// 파일 경로: src/app/(main)/approvals/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function ApprovalCard({ approval }) {
    const getStatusStyle = (status) => {
        switch (status) {
            case '승인': return 'bg-blue-100 text-blue-800';
            case '반려': return 'bg-red-100 text-red-800';
            case '대기': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const displayStatus = approval.approver_status || approval.status;

    return (
        <Link href={`/approvals/${approval.id}`} className="block bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-gray-800">{approval.title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                        유형: {approval.type || '일반'} / 작성자: {approval.author_name || 'N/A'}
                    </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusStyle(displayStatus)}`}>
                    {displayStatus}
                </span>
            </div>
        </Link>
    );
}

export default function ApprovalsPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('received');
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchApprovals = useCallback(async () => {
        if (!employee) return;
        setLoading(true);

        let finalApprovals = [];
        let error = null;

        if (activeTab === 'received') {
            // "받은 결재" 조회 로직
            const { data: approverLinks, error: linkError } = await supabase
                .from('approval_document_approvers')
                .select('status, document_id')
                .eq('approver_id', employee.id)
                .eq('status', '대기');
            
            if (linkError) {
                error = linkError;
            } else if (approverLinks && approverLinks.length > 0) {
                const documentIds = approverLinks.map(link => link.document_id);
                
                // ★★★★★ 여기서 관계를 맺지 않고, 별도로 쿼리합니다. ★★★★★
                const { data: documents, error: docError } = await supabase
                    .from('approval_documents')
                    .select('*') // author 정보는 나중에 따로 붙입니다.
                    .in('id', documentIds);
                
                if (docError) {
                    error = docError;
                } else if (documents) {
                    // 작성자 정보를 가져오기 위한 author_id 목록
                    const authorIds = [...new Set(documents.map(doc => doc.author_id))];
                    const { data: authors } = await supabase.from('profiles').select('id, full_name').in('id', authorIds);
                    
                    // 결재 문서에 작성자 이름과 결재자 상태를 매핑
                    finalApprovals = documents.map(doc => {
                        const author = authors?.find(a => a.id === doc.author_id);
                        const link = approverLinks.find(l => l.document_id === doc.id);
                        return { 
                            ...doc, 
                            author_name: author?.full_name || '알 수 없음', 
                            approver_status: link?.status 
                        };
                    });
                }
            }
        } else {
            // "상신한 결재" 조회 로직 (기존 코드 그대로 사용)
            const { data, error: sentError } = await supabase
                .from('approval_documents')
                .select('*, author:author_id(full_name)')
                .eq('author_id', employee.id)
                .order('created_at', { ascending: false });

            if (sentError) {
                error = sentError;
            } else if (data) {
                // author 객체를 author_name으로 변환
                finalApprovals = data.map(doc => ({ ...doc, author_name: doc.author?.full_name }));
            }
        }

        if (error) {
            console.error(`🔴 ${activeTab} 결재 목록 로딩 실패:`, error);
            setApprovals([]);
        } else {
            setApprovals(finalApprovals);
        }
        setLoading(false);
    }, [employee, activeTab]);

    useEffect(() => {
        if (!employeeLoading && employee) {
            fetchApprovals();
        }
    }, [employeeLoading, employee, activeTab]);

    const TabButton = ({ tabName, label }) => ( <button onClick={() => setActiveTab(tabName)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tabName ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</button> );
    
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">전자 결재</h1>
                <div className="flex items-center gap-4">
                    <Link href="/approvals/forms" className="text-sm font-medium">양식 관리</Link>
                    <button onClick={() => router.push('/approvals/new')} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">+ 새 결재 작성</button>
                </div>
            </header>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center gap-2 border-b pb-4 mb-4">
                    <TabButton tabName="received" label="받은 결재" />
                    <TabButton tabName="sent" label="상신한 결재" />
                </div>
                {loading ? <p className="text-center py-10">목록을 불러오는 중...</p> : approvals.length === 0 ? <p className="text-center py-10 text-gray-500">{activeTab === 'received' ? '처리할 결재 문서가 없습니다.' : '상신한 결재 문서가 없습니다.'}</p> : <div className="space-y-3">{approvals.map(approval => <ApprovalCard key={approval.id} approval={approval} />)}</div>}
            </div>
        </div>
    );
}