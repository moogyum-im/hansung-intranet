// src/app/(main)/approvals/[id]/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';

import dynamic from 'next/dynamic';

// 각 문서 유형에 맞는 뷰 컴포넌트를 동적으로 불러옵니다.
const ResignationView = dynamic(() => import('./ResignationView'), { ssr: false });
const ApologyView = dynamic(() => import('./ApologyView'), { ssr: false });
const WorkReportView = dynamic(() => import('./WorkReportView'), { ssr: false });
const LeaveRequestView = dynamic(() => import('./LeaveRequestView'), { ssr: false }); 
const ExpenseReportView = dynamic(() => import('./ExpenseReportView'), { ssr: false }); 
const InternalApprovalView = dynamic(() => import('./InternalApprovalView'), { ssr: false });

export default function ApprovalDetailPage() {
    const { id: documentId } = useParams();
    const { employee, loading: employeeLoading } = useEmployee(); // 현재 로그인한 사용자 정보
    const [document, setDocument] = useState(null); // approval_documents 테이블의 정보 (상신자 정보 포함)
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [referrerHistory, setReferrerHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!documentId) return;

        console.log("Fetching document for ID:", documentId);

        const fetchAllDocumentData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. 메인 문서 정보 (approval_documents) 가져오기
                // ★★★ 여기는 기존처럼 '*'만 select 합니다. ★★★
                const { data: docDataOriginal, error: docError } = await supabase
                    .from('approval_documents')
                    .select('*') // 다른 문서 타입과의 호환성을 위해 '*' 유지
                    .eq('id', documentId)
                    .single();

                if (docError) {
                    console.error("Supabase approval_documents query error:", docError);
                    if (docError.code === 'PGRST116') { 
                        notFound();
                    }
                    throw new Error(docError.message || "문서 정보를 불러오는데 실패했습니다.");
                }
                if (!docDataOriginal) {
                    console.warn(`Document with ID ${documentId} not found in approval_documents.`);
                    notFound();
                }

                // ★★★ 2. 상신자 (requester) 정보 별도로 가져와서 docData에 추가합니다. ★★★
                let finalDocData = { ...docDataOriginal }; // 원본 docData 복사
                if (docDataOriginal.requester_id) {
                    const { data: requesterProfile, error: requesterError } = await supabase
                        .from('profiles')
                        .select('id, full_name, department, position')
                        .eq('id', docDataOriginal.requester_id)
                        .single();

                    if (requesterError) {
                        console.error("Supabase requester profile query error:", requesterError);
                        // 에러가 나더라도 문서 로딩은 계속 진행 (상신자 정보만 누락)
                        toast.error("상신자 정보를 불러오는데 실패했습니다.");
                    } else if (requesterProfile) {
                        finalDocData.employee = requesterProfile; // doc.employee 형태로 추가
                    }
                }
                setDocument(finalDocData); // 최종 가공된 문서 데이터 설정


                // 3. 결재선 정보 (approval_document_approvers) 가져오기
                const { data: approversData, error: approversError } = await supabase
                    .from('approval_document_approvers')
                    .select('*, approver:profiles!approver_id(id, full_name, department, position)') 
                    .eq('document_id', documentId)
                    .order('order', { ascending: true });

                if (approversError) {
                    console.error("Supabase approvers query error:", approversError);
                    throw new Error(approversError.message || "결재선 정보를 불러오는데 실패했습니다.");
                }
                setApprovalHistory(approversData || []);

                // 4. 참조인 정보 (approval_document_referrers) 가져오기
                const { data: referrersData, error: referrersError } = await supabase
                    .from('approval_document_referrers')
                    .select('*, referrer:profiles!referrer_id(id, full_name, department, position)') 
                    .eq('document_id', documentId);

                if (referrersError) {
                    console.error("Supabase referrers query error:", referrersError);
                    throw new Error(referrersError.message || "참조인 정보를 불러오는데 실패했습니다.");
                }
                setReferrerHistory(referrersData || []);

            } catch (err) {
                console.error("문서 로딩 에러:", err);
                setError(err.message);
                toast.error(`문서 로딩 실패: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchAllDocumentData();
    }, [documentId]);

    // 로딩 및 에러 상태 처리
    if (employeeLoading || loading) {
        return <div className="flex justify-center items-center h-screen">문서 로딩 중...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">에러: {error}</div>;
    }

    if (!document) {
        return <div className="flex justify-center items-center h-screen text-gray-500">문서를 찾을 수 없습니다.</div>;
    }

    const renderDocumentView = () => {
        const commonProps = { 
            doc: document, 
            employee: employee, // 현재 로그인한 사용자 정보 (useEmployee 훅에서 옴)
            approvalHistory: approvalHistory, 
            referrerHistory: referrerHistory 
        };

        switch (document.document_type) {
            case 'resignation':
                return <ResignationView {...commonProps} />;
            case 'apology':
                return <ApologyView {...commonProps} />;
            case 'work_report':
                return <WorkReportView {...commonProps} />;
            case 'leave_request': 
                return <LeaveRequestView {...commonProps} />;
            case '지출결의서': 
            case 'expense_report':
                return <ExpenseReportView {...commonProps} />;
            case 'internal_approval':
                return <InternalApprovalView {...commonProps} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-8">
                        <h1 className="text-3xl font-bold text-red-600 mb-4">지원하지 않는 문서 유형입니다.</h1>
                        <p className="text-lg text-gray-700">문서 유형: <span className="font-semibold">{document.document_type}</span></p>
                        <p className="mt-4 text-gray-600">관리자에게 문의해주세요.</p>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {renderDocumentView()}
        </div>
    );
}