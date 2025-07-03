// 파일 경로: src/app/(main)/approvals/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '../../../contexts/EmployeeContext';
import { supabase } from '../../../lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ApprovalItem from '../../../components/ApprovalItem';

export default function ApprovalsPage() {

    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('received');
    const [subTab, setSubTab] = useState('pending');
    
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isApprovalDetailModalOpen, setIsApprovalDetailModalOpen] = useState(false);
    const [selectedApproval, setSelectedApproval] = useState(null);

    const fetchDocuments = useCallback(async () => {
        if (!employee?.id) { setLoading(false); return; }
        setLoading(true);

        let finalData = [];
        let error;

        // "받은 결재" 탭
        if (activeTab === 'received') {
            // 1단계: 내가 결재자로 지정된 행들을 가져옵니다.
            const { data: approverRows, error: approverError } = await supabase
                .from('approval_document_approvers')
                .select('document_id, status')
                .eq('approver_id', employee.id);

            if (approverError) {
                error = approverError;
            } else if (approverRows && approverRows.length > 0) {
                // 2단계: 상태(대기/완료)에 따라 문서 ID를 필터링합니다.
                const targetStatus = subTab === 'pending' ? ['대기'] : ['승인', '반려'];
                const docIds = approverRows
                    .filter(row => targetStatus.includes(row.status))
                    .map(row => row.document_id);
                
                if (docIds.length > 0) {
                    // 3단계: 필터링된 ID로 실제 문서 정보를 가져옵니다.
                    const { data: docsData, error: docsError } = await supabase
                        .from('approval_documents')
                        .select('*, form:form_id(form_name), author:author_id(full_name)')
                        .in('id', docIds)
                        .order('created_at', { ascending: false });
                    
                    if (docsError) error = docsError;
                    else finalData = docsData;
                }
            }
        } 
        // "상신한 결재" 탭
        else {
            const targetStatus = subTab === 'pending' ? ['진행중'] : ['승인', '반려', '취소'];
            const { data, error: requestError } = await supabase
                .from('approval_documents')
                .select('*, form:form_id(form_name), author:author_id(full_name)')
                .eq('author_id', employee.id)
                .in('status', targetStatus)
                .order('created_at', { ascending: false });
            
            if (requestError) error = requestError;
            else finalData = data;
        }
        
        if (error) {
            console.error("결재 문서 목록 조회 실패:", error);
            setDocuments([]);
        } else {
            setDocuments(finalData || []);
        }
        setLoading(false);
    }, [employee?.id, activeTab, subTab, supabase]);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    // ... (handleApproveReject, handleCancelRequest, openApprovalDetailModal 함수는 변경 없음) ...
    // ... (로딩 및 로그인 체크 로직도 변경 없음) ...

    return (
        <div className="h-full overflow-y-auto p-6">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">전자 결재</h1>
                <Link href="/approvals/forms" className="text-sm font-medium text-gray-600 hover:text-green-600 p-2 rounded-md bg-gray-100 hover:bg-gray-200">
                    양식 관리
                </Link>
            </header>
            
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex border-b border-gray-200">
                        <button onClick={() => { setActiveTab('received'); setSubTab('pending'); }} className={`px-4 py-2 text-lg font-semibold ${activeTab === 'received' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
                            받은 결재
                        </button>
                        <button onClick={() => { setActiveTab('requested'); setSubTab('pending'); }} className={`px-4 py-2 text-lg font-semibold ${activeTab === 'requested' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
                            상신한 결재
                        </button>
                    </div>
                    <Link href="/approvals/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                        + 새 결재 작성
                    </Link>
                </div>
                
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => setSubTab('pending')} className={`px-3 py-1 text-sm rounded-full ${subTab === 'pending' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {activeTab === 'received' ? '대기' : '진행중'}
                    </button>
                    <button onClick={() => setSubTab('completed')} className={`px-3 py-1 text-sm rounded-full ${subTab === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        완료
                    </button>
                </div>

                <div className="space-y-4">
                    {loading ? <p className="text-center py-10">로딩 중...</p> : documents.length === 0 ? (
                        <p className="text-center py-10 text-gray-500">해당 문서가 없습니다.</p>
                    ) : (
                        documents.map(doc => (
                            <Link href={`/approvals/${doc.id}`} key={doc.id} className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-gray-800">{doc.title}</p>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        doc.status === '승인' ? 'bg-green-100 text-green-800' :
                                        doc.status === '반려' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {doc.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{doc.form.form_name} / 작성자: {doc.author.full_name}</p>
                            </Link>
                        ))
                    )}
                </div>
            </div>
            {/* 상세 모달은 이제 사용하지 않음 */}
        </div>
    );
}