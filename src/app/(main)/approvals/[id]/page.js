// 파일 경로: src/app/(main)/approvals/[id]/page.js
'use client'; 

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ApprovalAttachments from '@/components/ApprovalAttachments';

export default function ApprovalDetailPage({ params }) {
    const { id: documentId } = params;
    const supabase = createClient();
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
            .select('*, form:form_id(form_name, form_fields), author:author_id(full_name)')
            .eq('id', documentId)
            .single();

        if (docError || !docData) {
            console.error(docError); setDocument(null);
            setLoading(false); return;
        }
        setDocument(docData);
        
        const { data: approversData, error: approversError } = await supabase
            .from('approval_document_approvers')
            .select('*, approver:approver_id(full_name, department)')
            .eq('document_id', documentId)
            .order('step');

        if (approversError) console.error(approversError);
        else setApprovers(approversData || []);

        setLoading(false);
    }, [documentId, supabase]);

    useEffect(() => {
        if(currentUser) {
            fetchData();
        }
    }, [currentUser, fetchData]);

    const handleApprovalAction = async (status) => {
        const myApprovalStep = approvers.find(a => a.approver_id === currentUser.id && a.status === '대기');
        if (!myApprovalStep) { alert("결재할 차례가 아니거나 권한이 없습니다."); return; }

        try {
            const { error: updateError } = await supabase
                .from('approval_document_approvers')
                .update({ status, comment, approved_at: new Date().toISOString() })
                .eq('id', myApprovalStep.id);
            if (updateError) throw updateError;
            
            const nextStep = approvers.find(a => a.step === myApprovalStep.step + 1);
            if (status === '승인' && !nextStep) {
                await supabase.from('approval_documents').update({ status: '승인', completed_at: new Date().toISOString() }).eq('id', documentId);
            } else if (status === '반려') {
                await supabase.from('approval_documents').update({ status: '반려', completed_at: new Date().toISOString() }).eq('id', documentId);
            }
            
            alert("결재가 처리되었습니다.");
            fetchData();
        } catch (error) {
            alert("결재 처리 중 오류가 발생했습니다: " + error.message);
        }
    };

    if (loading) return <div className="p-6 h-full flex items-center justify-center"><p>결재 문서를 불러오는 중입니다...</p></div>;
    if (!document) return <div className="p-6 h-full flex flex-col items-center justify-center text-center"><h2 className="text-2xl font-bold mb-2">문서를 찾을 수 없습니다.</h2><p>존재하지 않거나 접근 권한이 없는 문서입니다.</p></div>;

    const canApprove = approvers.some(a => a.approver_id === currentUser.id && a.status === '대기');

    return (
        <div className="h-full overflow-y-auto p-6 bg-gray-50">
            <div className="max-w-4xl mx-auto">
                {/* ★★★ "돌아가기" 버튼을 페이지 제목과 함께 헤더 안에 배치 ★★★ */}
                <header className="mb-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900">{document.form.form_name}</h1>
                        <Link href="/approvals" className="text-sm font-medium text-gray-600 hover:text-green-600 p-2 rounded-md bg-gray-100 hover:bg-gray-200">
                            ← 결재함으로 돌아가기
                        </Link>
                    </div>
                    <p className="text-xl text-gray-700 mt-2">{document.title}</p>
                    <p className="text-sm text-gray-500 mt-1">작성자: {document.author.full_name} | 상신일: {new Date(document.created_at).toLocaleDateString()}</p>
                </header>

                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow space-y-4">
                        <h2 className="text-lg font-semibold border-b pb-2 mb-4">결재 내용</h2>
                        <dl className="space-y-4">
                            {document.form.form_fields?.map(field => (
                                <div key={field.label} className="grid grid-cols-4 gap-4 items-center">
                                    <dt className="text-sm font-medium text-gray-500 col-span-1">{field.label}</dt>
                                    <dd className="text-sm text-gray-900 col-span-3 whitespace-pre-wrap">{document.form_data[field.label] || '-'}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                    
                    <ApprovalAttachments attachments={document.attachments} />

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold border-b pb-2 mb-4">결재선</h2>
                        <ol className="relative border-l border-gray-200 ml-2">
                            {approvers.map(a => (
                                <li key={a.id} className="mb-6 ml-6">
                                    <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3.5 ring-4 ring-white ${
                                        a.status === '승인' ? 'bg-green-500' :
                                        a.status === '반려' ? 'bg-red-500' : 'bg-gray-300'
                                    }`}>
                                    </span>
                                    <h3 className="font-semibold text-gray-900">{a.approver.full_name} <span className="font-normal text-gray-500">({a.approver.department})</span></h3>
                                    <p className="text-sm text-gray-500">
                                        {a.status}
                                        {a.approved_at && ` (${new Date(a.approved_at).toLocaleString()})`}
                                    </p>
                                    {a.comment && <p className="p-2 mt-1 text-sm bg-gray-50 rounded-md border">{a.comment}</p>}
                                </li>
                            ))}
                        </ol>
                    </div>

                    {canApprove && (
                         <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-lg font-semibold border-b pb-2 mb-4">결재 처리</h2>
                            <div>
                                <label htmlFor="comment" className="form-label">결재 의견 (선택 사항)</label>
                                <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} className="form-textarea w-full mt-1" rows={3}></textarea>
                            </div>
                            <div className="mt-4 flex justify-end gap-4">
                                <button onClick={() => handleApprovalAction('반려')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">반려</button>
                                <button onClick={() => handleApprovalAction('승인')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">승인</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}