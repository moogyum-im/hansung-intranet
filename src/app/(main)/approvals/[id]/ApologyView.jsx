// src/app/(main)/approvals/[id]/ApologyView.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ApologyView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [currentStep, setCurrentStep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [approvalComment, setApprovalComment] = useState(''); // approvalOpinion -> approvalComment

    const isMyTurnToApprove = employee && currentStep && currentStep.approver?.id === employee.id && currentStep.status === '대기';
    const isDocumentPending = doc?.status === '대기' || doc?.status === '진행중'; 

    useEffect(() => {
        if (doc) {
            try {
                setFormData(doc.content ? JSON.parse(doc.content) : {});
                
                const activeStep = approvalHistory?.find(step => step.status === '대기');
                setCurrentStep(activeStep || null);
                
                setLoading(false);
            } catch (e) {
                console.error("Failed to parse document content or set active step:", e);
                toast.error("문서 내용을 불러오는데 실패했습니다.");
                setLoading(false);
            }
        }
    }, [doc, approvalHistory]);

    const handleApprove = async () => {
        if (!currentStep || !employee) {
            toast.error("유효한 결재 단계가 없거나 사용자 정보가 없습니다.");
            return;
        }
        setLoading(true);
        try {
            const { error: updateApproverError } = await supabase
                .from('approval_document_approvers')
                .update({ 
                    status: '승인', 
                    comment: approvalComment, // opinion -> comment
                    processed_at: new Date().toISOString() // approved_at -> processed_at
                })
                .eq('id', currentStep.id);

            if (updateApproverError) throw new Error(updateApproverError.message);

            const currentStepIndex = approvalHistory.findIndex(step => step.id === currentStep.id);
            const nextStep = approvalHistory[currentStepIndex + 1];

            if (nextStep) {
                const { error: nextStepError } = await supabase
                    .from('approval_document_approvers')
                    .update({ status: '대기' })
                    .eq('id', nextStep.id);
                if (nextStepError) throw new Error(nextStepError.message);

                const { error: docStatusError } = await supabase
                    .from('approval_documents')
                    .update({ status: '진행중' })
                    .eq('id', doc.id);
                if (docStatusError) throw new Error(docStatusError.message);

            } else {
                const { error: docStatusError } = await supabase
                    .from('approval_documents')
                    .update({ status: '완료', completed_at: new Date().toISOString() })
                    .eq('id', doc.id);
                if (docStatusError) throw new Error(docStatusError.message);
            }
            
            toast.success("문서가 승인되었습니다.");
            router.refresh();
        } catch (error) {
            toast.error(`승인 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!currentStep || !employee) {
            toast.error("유효한 결재 단계가 없거나 사용자 정보가 없습니다.");
            return;
        }
        setLoading(true);
        try {
            const { error: updateApproverError } = await supabase
                .from('approval_document_approvers')
                .update({ 
                    status: '반려', 
                    comment: approvalComment, // opinion -> comment
                    processed_at: new Date().toISOString() // approved_at -> processed_at
                })
                .eq('id', currentStep.id);

            if (updateApproverError) throw new Error(updateApproverError.message);

            const { error: docStatusError } = await supabase
                .from('approval_documents')
                .update({ status: '반려', completed_at: new Date().toISOString() })
                .eq('id', doc.id);
            if (docStatusError) throw new Error(docStatusError.message);

            toast.success("문서가 반려되었습니다.");
            router.refresh();
        } catch (error) {
            toast.error(`반려 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !doc) return <div className="flex justify-center items-center h-screen">문서 내용을 불러오는 중...</div>;
    if (!doc) return <div className="flex justify-center items-center h-screen text-red-500">문서 정보를 찾을 수 없습니다.</div>;

    const getStatusIcon = (status) => {
        switch (status) {
            case '대기': return '⌛';
            case '승인': return '✅';
            case '반려': return '❌';
            default: return '';
        }
    };

    return (
        <div className="flex bg-gray-50 min-h-screen p-8 space-x-8">
            <div className="flex-1">
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">시 말 서</h1>
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p>문서번호: {doc.document_id || 'N/A'}</p> 
                        <p>작성일: {new Date(doc.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <div className="mb-8 border border-gray-300">
                        <table className="w-full text-sm border-collapse">
                            <tbody>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">소속</th>
                                    <td className="p-2 w-2/5 border-b border-r">{formData.requesterDepartment || '정보 없음'}</td>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직위</th>
                                    <td className="p-2 w-1/5 border-b">{formData.requesterPosition || '정보 없음'}</td>
                                </tr>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">성명</th>
                                    <td className="p-2 border-r">{formData.requesterName || '정보 없음'}</td>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">작성일</th>
                                    <td className="p-2">{new Date(doc.created_at).toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">발생 일시</label>
                            <input type="datetime-local" value={formData.incidentDate || ''} className="w-full p-2 border rounded-md text-sm bg-gray-100" readOnly />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">사건 내용</label>
                            <textarea value={formData.incidentDetails || ''} className="w-full p-3 border rounded-md h-40 resize-none bg-gray-100" readOnly />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">발생 원인</label>
                            <textarea value={formData.cause || ''} className="w-full p-3 border rounded-md h-24 resize-none bg-gray-100" readOnly />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">대책 및 처리</label>
                            <textarea value={formData.solution || ''} className="w-full p-3 border rounded-md h-24 resize-none bg-gray-100" readOnly />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">시말 내용</label>
                            <textarea value={formData.apologyContent || ''} className="w-full p-3 border rounded-md h-40 resize-none bg-gray-100" readOnly />
                        </div>
                        <div className="pt-8 text-center">
                            <p>위와 같이 시말서를 제출합니다.</p>
                            <p className="mt-4">{new Date(doc.created_at).getFullYear()}년 {new Date(doc.created_at).getMonth() + 1}월 {new Date(doc.created_at).getDate()}일</p>
                            <p className="mt-4">제출자: {formData.requesterName || '정보 없음'} (인)</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-96 p-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-4">결재선</h2>
                        <div className="space-y-3">
                            {approvalHistory && approvalHistory.map((step, index) => (
                                <div key={step.id} className={`flex items-center space-x-2 p-2 rounded-md ${step.status === '대기' ? 'bg-yellow-50' : step.status === '승인' ? 'bg-green-50' : step.status === '반려' ? 'bg-red-50' : ''}`}>
                                    <span className="font-semibold text-sm text-gray-600">{index + 1}차:</span>
                                    <span className="text-sm font-medium">{step.approver?.full_name} ({step.approver?.position})</span>
                                    <span className="ml-auto text-sm">{getStatusIcon(step.status)} {step.processed_at ? new Date(step.processed_at).toLocaleDateString('ko-KR') : ''}</span> {/* approved_at -> processed_at */}
                                    {step.comment && <p className="text-xs text-gray-500 mt-1">의견: {step.comment}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                    {referrerHistory && referrerHistory.length > 0 && (
                        <div className="border-b pb-4">
                            <h2 className="text-lg font-bold mb-4">참조인</h2>
                            <div className="space-y-2">
                                {referrerHistory.map((ref, index) => (
                                    <div key={ref.id} className="flex items-center space-x-2">
                                        <span className="text-sm font-medium">{ref.referrer?.full_name} ({ref.referrer?.position})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {isMyTurnToApprove && (
                        <div className="border-t pt-4 mt-4">
                            <h2 className="text-lg font-bold mb-2">결재 의견</h2>
                            <textarea
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                                placeholder="결재 의견을 입력하세요."
                                className="w-full p-2 border rounded-md h-24 resize-none mb-4"
                            />
                            <div className="flex space-x-4">
                                <button
                                    onClick={handleApprove}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-semibold"
                                >
                                    {loading ? '승인 중...' : '승인'}
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-semibold"
                                >
                                    {loading ? '반려 중...' : '반려'}
                                </button>
                            </div>
                        </div>
                    )}
                    {doc?.status === '완료' && <p className="text-center text-green-600 font-bold mt-4">✅ 최종 승인 완료된 문서입니다.</p>}
                    {doc?.status === '반려' && <p className="text-center text-red-600 font-bold mt-4">❌ 문서가 반려되었습니다.</p>}
                </div>
            </div>
        </div>
    );
}