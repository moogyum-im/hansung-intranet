'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';

import dynamic from 'next/dynamic';

// 뷰 컴포넌트 동적 로드
const ResignationView = dynamic(() => import('./ResignationView'), { ssr: false });
const ApologyView = dynamic(() => import('./ApologyView'), { ssr: false });
const WorkReportView = dynamic(() => import('./WorkReportView'), { ssr: false });
const LeaveRequestView = dynamic(() => import('./LeaveRequestView'), { ssr: false }); 
const ExpenseReportView = dynamic(() => import('./ExpenseReportView'), { ssr: false }); 
const InternalApprovalView = dynamic(() => import('./InternalApprovalView'), { ssr: false });
const BusinessTripView = dynamic(() => import('./BusinessTripView'), { ssr: false });
const ExpenseSettlementView = dynamic(() => import('./ExpenseSettlementView'), { ssr: false });

export default function ApprovalDetailPage() {
    const { id: documentId } = useParams();
    const { employee, loading: employeeLoading } = useEmployee(); 
    const [document, setDocument] = useState(null); 
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [referrerHistory, setReferrerHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllDocumentData = useCallback(async () => {
        if (!documentId) return;
        setLoading(true);
        setError(null);
        try {
            // 1. [수정] attachments 컬럼을 명시적으로 포함하여 메인 데이터 호출
            const { data: docDataOriginal, error: docError } = await supabase
                .from('approval_documents')
                .select('*, attachments, document_number') 
                .eq('id', documentId)
                .single();

            if (docError) {
                if (docError.code === 'PGRST116') notFound();
                throw new Error(docError.message || "문서 정보를 불러오는데 실패했습니다.");
            }
            
            // 2. [수정] 데이터 병합 로직 최적화 (attachments 유실 방지)
            let finalDocData = { ...docDataOriginal }; 

            if (docDataOriginal.requester_id) {
                const { data: requesterProfile, error: requesterError } = await supabase
                    .from('profiles')
                    .select('id, full_name, department, position')
                    .eq('id', docDataOriginal.requester_id)
                    .single();

                if (!requesterError && requesterProfile) {
                    // 원본 데이터 위에 프로필 정보만 얹음 (attachments는 그대로 유지됨)
                    finalDocData = {
                        ...finalDocData,
                        employee: requesterProfile,
                        requester_name: requesterProfile.full_name,
                        requester_department: requesterProfile.department,
                        requester_position: requesterProfile.position
                    };
                }
            }
            
            // 최종 확인 로그 (콘솔에서 attachments가 살아있는지 확인하세요)
            console.log("최종 전송 데이터 체크:", finalDocData.attachments);
            setDocument(finalDocData); 

            // 3. 결재선 정보
            const { data: approversData, error: approversError } = await supabase
                .from('approval_document_approvers')
                .select('*, approver:profiles!approver_id(id, full_name, department, position)') 
                .eq('document_id', documentId)
                .order('sequence', { ascending: true });

            if (approversError) throw new Error(approversError.message || "결재선 정보를 불러오는데 실패했습니다.");
            setApprovalHistory(approversData || []);

            // 4. 참조인 정보
            const { data: referrersData, error: referrersError } = await supabase
                .from('approval_document_referrers')
                .select('*, referrer:profiles!referrer_id(id, full_name, department, position)') 
                .eq('document_id', documentId);

            if (referrersError) throw new Error(referrersError.message || "참조인 정보를 불러오는데 실패했습니다.");
            setReferrerHistory(referrersData || []);

        } catch (err) {
            console.error("문서 로딩 에러:", err);
            setError(err.message);
            toast.error(`문서 로딩 실패: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        fetchAllDocumentData();
    }, [fetchAllDocumentData]);

    if (employeeLoading || loading) return <div className="flex justify-center items-center h-screen font-black text-slate-400 italic">HANSUNG ERP SYNCING...</div>;
    if (error) return <div className="flex justify-center items-center h-screen text-red-500 font-black uppercase">에러: {error}</div>;
    if (!document) return <div className="flex justify-center items-center h-screen text-gray-500 font-black">문서를 찾을 수 없습니다.</div>;

    const renderDocumentView = () => {
        const isReferrer = referrerHistory.some(ref => ref.referrer_id === employee?.id);

        const commonProps = { 
            doc: document, 
            approval: document,
            employee: employee, 
            approvalHistory: approvalHistory, 
            referrerHistory: referrerHistory,
            isReferrer: isReferrer,
            onUpdate: fetchAllDocumentData 
        };

        switch (document.document_type) {
            case 'resignation': return <ResignationView {...commonProps} />;
            case 'apology': return <ApologyView {...commonProps} />;
            case 'work_report': return <WorkReportView {...commonProps} />;
            case 'leave_request': return <LeaveRequestView {...commonProps} />;
            case '지출결의서': 
            case 'expense_report': return <ExpenseReportView {...commonProps} />;
            case 'internal_approval': return <InternalApprovalView {...commonProps} />;
            case 'business_trip': return <BusinessTripView {...commonProps} />;
            case 'expense_settlement': return <ExpenseSettlementView {...commonProps} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-screen font-black">
                        <h1 className="text-3xl font-black text-red-600 mb-4 uppercase">Unsupported Type</h1>
                        <p className="text-lg italic uppercase text-gray-700">Type: {document.document_type}</p>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 overflow-y-auto">
            {renderDocumentView()}
        </div>
    );
}