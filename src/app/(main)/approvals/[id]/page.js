// 파일 경로: src/app/(main)/approvals/[id]/page.js
'use client'; 

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '../../../../contexts/EmployeeContext';
import { supabase } from '../../../../lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// 첨부파일 컴포넌트 (실제 프로젝트에 맞게 경로 확인 필요)
// import ApprovalAttachments from '@/components/ApprovalAttachments';

// 임시 ApprovalAttachments 컴포넌트
const ApprovalAttachments = ({ attachments }) => {
    if (!attachments || attachments.length === 0) {
        return null;
    }
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold border-b pb-3 mb-4">첨부 파일</h2>
            {/* 여기에 첨부파일 목록을 렌더링하는 로직이 들어갑니다. */}
            <p className="text-sm text-gray-500">첨부파일 기능은 구현 예정입니다.</p>
        </div>
    );
};

// 동적 필드를 타입에 맞게 렌더링하는 헬퍼 컴포넌트
const DynamicFieldRenderer = ({ field, data }) => {
    const value = data?.[field.name];

    if (value === null || typeof value === 'undefined' || value === '') {
        return <p className="p-3 bg-gray-100 rounded-md mt-1 text-gray-500">내용 없음</p>;
    }

    switch (field.type) {
        case 'daterange':
            if (typeof value === 'object' && value.start && value.end) {
                return <p className="p-3 bg-gray-100 rounded-md mt-1">{`${value.start} ~ ${value.end}`}</p>;
            }
            return <p className="p-3 bg-gray-100 rounded-md mt-1 text-red-500">잘못된 기간 형식</p>;
        
        case 'checkbox':
            return <p className="p-3 bg-gray-100 rounded-md mt-1">{value ? '예' : '아니오'}</p>;

        default:
            return <p className="p-3 bg-gray-100 rounded-md mt-1 whitespace-pre-wrap">{String(value)}</p>;
    }
}

export default function ApprovalDetailPage() {
    const params = useParams();
    const documentId = params.id;
 
    const router = useRouter();
    const { employee: currentUser } = useEmployee();

    const [document, setDocument] = useState(null);
    const [approvers, setApprovers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');

    const fetchData = useCallback(async () => {
        if (!documentId) return;
        setLoading(true);
        
        const { data: docData, error: docError } = await supabase
            .from('approval_documents')
            .select(`*, form: form_id ( title, fields ), author: author_id ( full_name, department )`)
            .eq('id', documentId)
            .single();

        if (docError || !docData) {
            console.error("결재 문서 조회 실패:", docError);
            setDocument(null);
            setLoading(false);
            return;
        }
        setDocument(docData);
        
        const { data: approversData, error: approversError } = await supabase
            .from('approval_document_approvers')
            .select(`*, approver: approver_id ( full_name, department )`)
            .eq('document_id', documentId)
            .order('step');

        if (approversError) console.error(approversError);
        else setApprovers(approversData || []);

        setLoading(false);
    }, [documentId]);

    useEffect(() => {
        if(currentUser) fetchData();
    }, [currentUser, fetchData]);

    const handleApprovalAction = async (status) => {
        if (!currentUser) return;
        const myApprovalStep = approvers.find(a => a.approver_id === currentUser.id && a.status === '대기');
        if (!myApprovalStep) {
            toast.error("결재할 차례가 아니거나 권한이 없습니다.");
            return;
        }

        try {
            const { error: updateError } = await supabase
                .from('approval_document_approvers')
                .update({ status, comment, approved_at: new Date() })
                .eq('id', myApprovalStep.id);

            if (updateError) throw updateError;
            
            const isFinalApprover = approvers.length === myApprovalStep.step;

            if (status === '승인' && isFinalApprover) {
                // 최종 승인일 경우 문서 상태를 '승인'으로 변경
                await supabase.from('approval_documents').update({ status: '승인' }).eq('id', documentId);
            } else if (status === '승인' && !isFinalApprover) {
                // 다음 결재자를 '대기' 상태로 변경
                const nextStep = myApprovalStep.step + 1;
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('document_id', documentId).eq('step', nextStep);
            } else if (status === '반려') {
                // 반려 시 즉시 문서 상태를 '반려'로 변경
                await supabase.from('approval_documents').update({ status: '반려' }).eq('id', documentId);
            }
            
            toast.success("결재가 처리되었습니다.");
            fetchData(); // 데이터 새로고침
            setComment('');
        } catch (error) {
            toast.error("결재 처리 중 오류가 발생했습니다: " + error.message);
        }
    };

    if (loading) return <div className="p-8 text-center">결재 문서를 불러오는 중입니다...</div>;
    if (!document) return <div className="p-8 text-center"><h2 className="text-2xl font-bold mb-2">문서를 찾을 수 없습니다.</h2><p className="text-gray-600">존재하지 않거나 접근 권한이 없는 문서입니다.</p></div>;

    const canApprove = approvers.some(a => a.approver_id === currentUser?.id && a.status === '대기');

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{document.form?.title || '일반 문서'}</span>
                        <Link href="/approvals" className="text-sm font-medium text-gray-600 hover:text-blue-600">← 목록으로 돌아가기</Link>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
                    <p className="text-sm text-gray-500 mt-2">작성자: {document.author?.full_name || 'N/A'} | 상신일: {new Date(document.created_at).toLocaleDateString()}</p>
                </header>

                <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                    <h2 className="text-xl font-bold border-b pb-3 mb-4">결재 내용</h2>
                    <dl className="space-y-4">
                        {(document.form?.fields || []).map(field => (
                            <div key={field.name} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                <dt className="text-sm font-medium text-gray-500 md:col-span-1">{field.name}</dt>
                                <dd className="md:col-span-3">
                                    <DynamicFieldRenderer field={field} data={document.form_data} />
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
                
                <ApprovalAttachments attachments={document.attachments} />

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-bold border-b pb-3 mb-4">결재선</h2>
                    <ol className="relative border-l-2 border-gray-200 ml-3">
                        {approvers.map(a => (
                            <li key={a.id} className="mb-8 ml-8">
                                <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3.5 ring-4 ring-white ${ a.status === '승인' ? 'bg-blue-500' : a.status === '반려' ? 'bg-red-500' : a.status === '대기' ? 'bg-yellow-400' : 'bg-gray-400' }`}></span>
                                <div className="p-4 bg-white border rounded-lg shadow-sm">
                                    <h3 className="font-semibold text-gray-900">{a.approver?.full_name} <span className="font-normal text-gray-500">({a.approver?.department})</span></h3>
                                    <time className="block mb-2 text-sm font-normal leading-none text-gray-500">
                                        {a.status} {a.approved_at && `(${new Date(a.approved_at).toLocaleString()})`}
                                    </time>
                                    {a.comment && <p className="p-2 mt-2 text-sm bg-gray-50 rounded-md">{a.comment}</p>}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {canApprove && (
                     <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h2 className="text-xl font-bold mb-4">결재 처리</h2>
                        <div>
                            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">결재 의견 (선택)</label>
                            <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-2 border rounded-md" rows={3}></textarea>
                        </div>
                        <div className="mt-4 flex justify-end gap-4">
                            <button onClick={() => handleApprovalAction('반려')} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">반려</button>
                            <button onClick={() => handleApprovalAction('승인')} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">승인</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}