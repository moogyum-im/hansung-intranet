// src/app/(main)/approvals/[id]/InternalApprovalView.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function InternalApprovalView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        requesterDepartment: '',
        requesterPosition: '',
        requesterName: '',
        approvalTitle: '',
        approvalContent: ''
    });
    const [currentStep, setCurrentStep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [approvalComment, setApprovalComment] = useState('');

    const isMyTurnToApprove = employee && currentStep && currentStep.approver?.id === employee.id && currentStep.status === '대기';
    const isDocumentPending = doc?.status === '대기' || doc?.status === '진행중'; 

    useEffect(() => {
        if (doc) {
            try {
                console.log("InternalApprovalView - Original doc.content:", doc.content);

                let parsedContent = {};
                if (doc.content) {
                    try {
                        parsedContent = JSON.parse(doc.content);
                    } catch (jsonParseError) {
                        console.error("InternalApprovalView - JSON parsing failed:", jsonParseError);
                        toast.error("문서 내용 형식이 올바르지 않습니다.");
                    }
                }
                
                console.log("InternalApprovalView - Parsed Content for formData:", parsedContent);

                setFormData(prev => ({
                    ...prev, 
                    // 콘솔 로그를 통해 확인된 실제 doc.content의 키 이름으로 매핑합니다.
                    requesterDepartment: parsedContent.requesterDepartment || prev.requesterDepartment, 
                    requesterPosition: parsedContent.requesterPosition || prev.requesterPosition,     
                    requesterName: parsedContent.requesterName || prev.requesterName,           
                    approvalTitle: parsedContent.title || prev.approvalTitle,          // 'title' 키 사용
                    approvalContent: parsedContent.content || prev.approvalContent      // 'content' 키 사용
                }));

                const activeStep = approvalHistory?.find(step => step.status === '대기');
                setCurrentStep(activeStep || null);

                // --- 디버깅용: isMyTurnToApprove 관련 값 출력 ---
                console.log("Approval Status Check:");
                console.log("  employee:", employee);
                console.log("  currentStep:", currentStep);
                console.log("  currentStep.approver?.id:", currentStep?.approver?.id);
                console.log("  employee.id:", employee?.id);
                console.log("  currentStep.status:", currentStep?.status);
                console.log("  isMyTurnToApprove (after currentStep set):", 
                    employee && activeStep && activeStep.approver?.id === employee.id && activeStep.status === '대기'
                );
                // --- 디버깅 끝 ---


                setLoading(false);
            } catch (e) {
                console.error("InternalApprovalView - Error in useEffect:", e);
                toast.error("문서 정보를 불러오는 중 오류가 발생했습니다.");
                setLoading(false);
            }
        } else {
            setLoading(false); 
        }
    }, [doc, approvalHistory, employee]); // 의존성 배열에 employee를 추가

    const quillModules = useMemo(() => ({
        toolbar: false,
    }), []);

    const handleApprove = async () => {
        console.log("handleApprove called."); // 함수 시작 로그
        if (!currentStep || !employee) {
            toast.error("유효한 결재 단계가 없거나 사용자 정보가 없습니다.");
            console.error("handleApprove: Missing currentStep or employee."); // 에러 로그
            return;
        }
        setLoading(true);
        console.log("handleApprove: Loading set to true.");

        try {
            console.log("handleApprove: Attempting to update approver status to '승인'. currentStep.id:", currentStep.id);
            const { error: updateApproverError } = await supabase
                .from('approval_document_approvers')
                .update({ 
                    status: '승인', 
                    comment: approvalComment, 
                    approved_at: new Date().toISOString() 
                })
                .eq('id', currentStep.id);

            if (updateApproverError) throw new Error(updateApproverError.message);
            console.log("handleApprove: Approver status updated successfully.");

            const currentStepIndex = approvalHistory.findIndex(step => step.id === currentStep.id);
            const nextStep = approvalHistory[currentStepIndex + 1];
            console.log("handleApprove: nextStep:", nextStep);


            if (nextStep) {
                console.log("handleApprove: Next step found, updating status to '대기'. nextStep.id:", nextStep.id);
                const { error: nextStepError } = await supabase
                    .from('approval_document_approvers')
                    .update({ status: '대기' })
                    .eq('id', nextStep.id);
                if (nextStepError) throw new Error(nextStepError.message);

                console.log("handleApprove: Updating document status to '진행중'. doc.id:", doc.id);
                const { error: docStatusError } = await supabase
                    .from('approval_documents')
                    .update({ status: '진행중' })
                    .eq('id', doc.id);
                if (docStatusError) throw new Error(docStatusError.message);

            } else {
                console.log("handleApprove: No next step, updating document status to '완료'. doc.id:", doc.id);
                const { error: docStatusError } = await supabase
                    .from('approval_documents')
                    .update({ status: '완료', completed_at: new Date().toISOString() })
                    .eq('id', doc.id);
                if (docStatusError) throw new Error(docStatusError.message);
            }

            toast.success("문서가 승인되었습니다.");
            router.refresh();
            console.log("handleApprove: Router refreshed, approval process completed.");
        } catch (error) {
            toast.error(`승인 실패: ${error.message}`);
            console.error("handleApprove - Error during approval:", error); // 에러 발생 시 로그
        } finally {
            setLoading(false);
            console.log("handleApprove: Loading set to false (finally block).");
        }
    };

    const handleReject = async () => {
        console.log("handleReject called."); // 함수 시작 로그
        if (!currentStep || !employee) {
            toast.error("유효한 결재 단계가 없거나 사용자 정보가 없습니다.");
            console.error("handleReject: Missing currentStep or employee."); // 에러 로그
            return;
        }
        setLoading(true);
        console.log("handleReject: Loading set to true.");

        try {
            console.log("handleReject: Attempting to update approver status to '반려'. currentStep.id:", currentStep.id);
            const { error: updateApproverError } = await supabase
                .from('approval_document_approvers')
                .update({ 
                    status: '반려', 
                    comment: approvalComment, 
                    approved_at: new Date().toISOString() 
                })
                .eq('id', currentStep.id);

            if (updateApproverError) throw new Error(updateApproverError.message);
            console.log("handleReject: Approver status updated successfully.");

            console.log("handleReject: Updating document status to '반려'. doc.id:", doc.id);
            const { error: docStatusError } = await supabase
                .from('approval_documents')
                .update({ status: '반려', completed_at: new Date().toISOString() })
                .eq('id', doc.id);
            if (docStatusError) throw new Error(docStatusError.message);

            toast.success("문서가 반려되었습니다.");
            router.refresh();
            console.log("handleReject: Router refreshed, rejection process completed.");
        } catch (error) {
            toast.error(`반려 실패: ${error.message}`);
            console.error("handleReject - Error during rejection:", error); // 에러 발생 시 로그
        } finally {
            setLoading(false);
            console.log("handleReject: Loading set to false (finally block).");
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">문서 내용을 불러오는 중...</div>;
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
                    <h1 className="text-2xl font-bold text-center mb-8">내 부 결 재 서</h1>
                    {/* 문서번호 및 작성일 */}
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p>문서번호: {doc.document_id || 'N/A'}</p> 
                        <p>작성일: {new Date(doc.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>

                    {/* 기안자 정보 테이블 */}
                    <div className="mb-8 border border-gray-300">
                        <table className="w-full text-sm border-collapse">
                            <tbody>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">기안부서</th>
                                    <td className="p-2 w-2/5 border-b border-r">{formData.requesterDepartment || '정보 없음'}</td>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직 위</th>
                                    <td className="p-2 w-1/5 border-b">{formData.requesterPosition || '정보 없음'}</td>
                                </tr>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안자</th>
                                    <td className="p-2 border-r">{formData.requesterName || '정보 없음'}</td>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안일자</th>
                                    <td className="p-2">{new Date(doc.created_at).toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-6 text-sm">
                        {/* 결재 제목 */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">제목</label>
                            <input
                                type="text"
                                value={formData.approvalTitle || ''}
                                className="w-full p-2 border rounded-md bg-gray-100"
                                readOnly
                            />
                        </div>

                        {/* 결재 내용 */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">내용</label>
                            <div className="border rounded-md bg-gray-100 p-2 min-h-[200px] quill-readonly-container">
                                {formData.approvalContent !== undefined ? (
                                    <ReactQuill
                                        value={formData.approvalContent} 
                                        readOnly={true}
                                        theme="snow"
                                        modules={quillModules}
                                    />
                                ) : (
                                    <p className="text-gray-500">내용을 불러오는 중...</p>
                                )}
                            </div>
                        </div>

                        {/* 첨부 파일 (doc 객체에 attachment_url과 attachment_filename이 있다고 가정) */}
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
                            {approvalHistory && approvalHistory.map((step, index) => (
                                <div key={step.id} className={`flex items-center space-x-2 p-2 rounded-md ${step.status === '대기' ? 'bg-yellow-50' : step.status === '승인' ? 'bg-green-50' : step.status === '반려' ? 'bg-red-50' : ''}`}>
                                    <span className="font-semibold text-sm text-gray-600">{index + 1}차:</span>
                                    <span className="text-sm font-medium">{step.approver?.full_name} ({step.approver?.position})</span>
                                    <span className="ml-auto text-sm">{getStatusIcon(step.status)} {step.approved_at ? new Date(step.approved_at).toLocaleDateString('ko-KR') : ''}</span>
                                    {step.comment && <p className="text-xs text-gray-500 mt-1">의견: {step.comment}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* 참조인 */}
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