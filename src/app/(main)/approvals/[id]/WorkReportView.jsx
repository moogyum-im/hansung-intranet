// src/app/(main)/approvals/[id]/WorkReportView.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// ReactQuill은 SSR을 지원하지 않으므로 dynamic import로 클라이언트 측에서만 로드
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function WorkReportView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        requesterDepartment: '정보 없음',
        requesterPosition: '정보 없음',
        requesterName: '정보 없음',
        documentId: '',
        createdAt: '',
        title: '',
        reportType: '',
        reportDate: '',
        achievements: '',
        todayPlan: '',
        issues: '',
        nextPlan: '',
    });
    const [currentStep, setCurrentStep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [approvalComment, setApprovalComment] = useState('');

    const isMyTurnToApprove = employee && currentStep && currentStep.approver?.id === employee.id && currentStep.status === '대기';
    const isDocumentPending = doc?.status === '대기' || doc?.status === '진행중'; 

    useEffect(() => {
        if (doc) {
            try {
                console.log("WorkReportView - Original doc object:", doc);
                console.log("WorkReportView - Employee object (for current user info):", employee);
                console.log("WorkReportView - Approval History object:", approvalHistory);

                let parsedContent = {};
                if (doc.content) {
                    try {
                        parsedContent = JSON.parse(doc.content);
                        console.log("WorkReportView - Parsed Content for formData:", parsedContent);
                    } catch (jsonParseError) {
                        console.error("WorkReportView - JSON parsing failed for doc.content:", jsonParseError);
                        toast.error("문서 내용 형식이 올바르지 않습니다. (JSON 파싱 오류)");
                    }
                }
                
                // 상신자 정보 파싱 로직 강화 (LeaveRequestView와 동일)
                const requesterDept = doc.employee?.department 
                                      || doc.requester_department 
                                      || parsedContent.requesterDepartment 
                                      || '정보 없음';
                const requesterPos = doc.employee?.position 
                                     || doc.requester_position 
                                     || parsedContent.requesterPosition 
                                     || '정보 없음';
                const requesterName = doc.employee?.full_name 
                                      || doc.requester_name 
                                      || parsedContent.requesterName 
                                      || '정보 없음';

                setFormData(prev => ({
                    ...prev, 
                    requesterDepartment: requesterDept, 
                    requesterPosition: requesterPos,     
                    requesterName: requesterName,           
                    documentId: doc.document_id || 'N/A',
                    createdAt: new Date(doc.created_at).toLocaleDateString('ko-KR'),
                    title: parsedContent.title || '업무 보고서',
                    reportType: parsedContent.reportType || '',
                    reportDate: parsedContent.reportDate || '',
                    achievements: parsedContent.achievements || '',
                    todayPlan: parsedContent.todayPlan || '',
                    issues: parsedContent.issues || '',
                    nextPlan: parsedContent.nextPlan || '',
                }));

                const activeStep = approvalHistory && Array.isArray(approvalHistory) 
                                 ? approvalHistory.find(step => step.status === '대기') 
                                 : null;
                setCurrentStep(activeStep);

                console.log("WorkReportView - Active Step found:", activeStep);
                console.log("WorkReportView - Current Step set to:", activeStep);
                console.log("WorkReportView - isMyTurnToApprove (calculated in useEffect):", 
                    employee && activeStep && activeStep.approver?.id === employee.id && activeStep.status === '대기'
                );

                setLoading(false); 
            } catch (e) {
                console.error("WorkReportView - Error in useEffect:", e);
                toast.error("문서 정보를 불러오는 중 오류가 발생했습니다.");
                setLoading(false);
            }
        } else {
            console.warn("WorkReportView - doc object is null or undefined.");
            setLoading(false); 
        }
    }, [doc, approvalHistory, employee]); 

    const handleApprove = async () => {
        if (!currentStep || !employee) {
            toast.error("유효한 결재 단계가 없거나 사용자 정보가 없습니다.");
            console.error("handleApprove: Missing currentStep or employee.");
            return;
        }
        setLoading(true);

        try {
            const { error: updateApproverError } = await supabase
                .from('approval_document_approvers')
                .update({ 
                    status: '승인', 
                    comment: approvalComment, 
                    approved_at: new Date().toISOString() 
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
            console.error("handleApprove - Error during approval:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!currentStep || !employee) {
            toast.error("유효한 결재 단계가 없거나 사용자 정보가 없습니다.");
            console.error("handleReject: Missing currentStep or employee.");
            return;
        }
        setLoading(true);

        try {
            const { error: updateApproverError } = await supabase
                .from('approval_document_approvers')
                .update({ 
                    status: '반려', 
                    comment: approvalComment, 
                    approved_at: new Date().toISOString() 
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
            console.error("handleReject - Error during rejection:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">업무보고서 내용을 불러오는 중...</div>;
    if (!doc) return <div className="flex justify-center items-center h-screen text-red-500">업무보고서 정보를 찾을 수 없습니다.</div>;

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
                    <h1 className="text-2xl font-bold text-center mb-8">{formData.title || '업무 보고서'}</h1>
                    {/* 문서번호 및 작성일 */}
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p>문서번호: {formData.documentId}</p> 
                        <p>작성일: {formData.createdAt}</p>
                    </div>

                    {/* 기안자 정보 테이블 */}
                    <div className="mb-8 border border-gray-300">
                        <table className="w-full text-sm border-collapse">
                            <tbody>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">기안부서</th>
                                    <td className="p-2 w-2/5 border-b border-r">{formData.requesterDepartment}</td>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직 위</th>
                                    <td className="p-2 w-1/5 border-b">{formData.requesterPosition}</td>
                                </tr>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안자</th>
                                    <td className="p-2 border-r">{formData.requesterName}</td>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안일자</th>
                                    <td className="p-2">{formData.createdAt}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-6 text-sm">
                        {/* 보고서 유형 */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">보고서 유형</label>
                            <input
                                type="text"
                                value={formData.reportType || ''} 
                                className="w-full p-2 border rounded-md bg-gray-100"
                                readOnly
                            />
                        </div>

                        {/* 보고일자 */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">보고일자</label>
                            <input
                                type="date"
                                value={formData.reportDate || ''} 
                                className="w-full p-2 border rounded-md bg-gray-100"
                                readOnly
                            />
                        </div>

                        {/* 금일 업무 계획 */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">금일 업무 계획</label>
                            <textarea
                                value={formData.todayPlan || ''} 
                                className="w-full p-2 border rounded-md bg-gray-100 min-h-[100px]"
                                readOnly
                            />
                        </div>

                        {/* 업무 진행 및 실적 (ReactQuill) */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">업무 진행 및 실적</label>
                            {/* ReactQuill은 readOnly 속성을 지원하지만, 스타일링을 위해 단순 div에 dangerouslySetInnerHTML 사용 */}
                            <div 
                                className="w-full p-2 border rounded-md bg-gray-100 min-h-[150px] overflow-auto quill-readonly"
                                dangerouslySetInnerHTML={{ __html: formData.achievements || '<p>내용 없음</p>' }}
                            ></div>
                            {/* Quill 편집기에서 사용되는 스타일을 readOnly div에 적용하기 위한 전역 스타일 또는 별도 스타일 필요 */}
                            <style jsx>{`
                                .quill-readonly :global(p) { margin-bottom: 0.5em; }
                                .quill-readonly :global(ul), .quill-readonly :global(ol) { margin-left: 1.5em; list-style-type: disc; }
                                .quill-readonly :global(ol) { list-style-type: decimal; }
                                .quill-readonly :global(h1), .quill-readonly :global(h2) { font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
                                .quill-readonly :global(h1) { font-size: 1.5em; }
                                .quill-readonly :global(h2) { font-size: 1.2em; }
                            `}</style>
                        </div>

                        {/* 특이사항 및 문제점 */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">특이사항 및 문제점</label>
                            <textarea
                                value={formData.issues || ''} 
                                className="w-full p-2 border rounded-md bg-gray-100 min-h-[100px]"
                                readOnly
                            />
                        </div>

                        {/* 익일 업무 계획 */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">익일 업무 계획</label>
                            <textarea
                                value={formData.nextPlan || ''} 
                                className="w-full p-2 border rounded-md bg-gray-100 min-h-[100px]"
                                readOnly
                            />
                        </div>
                        
                        {/* 첨부 파일 */}
                        {doc.attachment_url && (
                            <div className="mt-6">
                                <h3 className="text-lg font-bold mb-2">첨부 파일</h3>
                                <a
                                    href={doc.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                    </svg>
                                    {doc.attachment_filename || '첨부파일'}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* 우측 결재 정보 패널 */}
            <div className="w-96 p-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    {/* 결재선 */}
                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-4">결재선</h2>
                        <div className="space-y-3">
                            {/* approvalHistory가 배열이고 내용이 있을 경우에만 맵핑 */}
                            {approvalHistory && Array.isArray(approvalHistory) && approvalHistory.length > 0 ? ( 
                                approvalHistory.map((step, index) => (
                                    <div key={step.id || `step-${index}`} className={`flex items-center space-x-2 p-2 rounded-md ${step.status === '대기' ? 'bg-yellow-50' : step.status === '승인' ? 'bg-green-50' : step.status === '반려' ? 'bg-red-50' : ''}`}>
                                        <span className="font-semibold text-sm text-gray-600">{index + 1}차:</span>
                                        <span className="text-sm font-medium">{step.approver?.full_name || '이름 없음'} ({step.approver?.position || '직위 없음'})</span>
                                        <span className="ml-auto text-sm">{getStatusIcon(step.status)} {step.approved_at ? new Date(step.approved_at).toLocaleDateString('ko-KR') : ''}</span>
                                        {step.comment && <p className="text-xs text-gray-500 mt-1">의견: {step.comment}</p>}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">결재선 정보가 없습니다.</p> 
                            )}
                        </div>
                    </div>
                    {/* 참조인 */}
                    {referrerHistory && Array.isArray(referrerHistory) && referrerHistory.length > 0 && ( 
                        <div className="border-b pb-4">
                            <h2 className="text-lg font-bold mb-4">참조인</h2>
                            <div className="space-y-2">
                                {referrerHistory.map((ref, index) => (
                                    <div key={ref.id || `ref-${index}`} className="flex items-center space-x-2">
                                        <span className="text-sm font-medium">{ref.referrer?.full_name || '이름 없음'} ({ref.referrer?.position || '직위 없음'})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* 결재/반려 버튼 및 의견 입력 필드 */}
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
                    {/* 문서 최종 상태 표시 */}
                    {doc?.status === '완료' && <p className="text-center text-green-600 font-bold mt-4">✅ 최종 승인 완료된 문서입니다.</p>}
                    {doc?.status === '반려' && <p className="text-center text-red-600 font-bold mt-4">❌ 문서가 반려되었습니다.</p>}
                </div>
            </div>
        </div>
    );
}