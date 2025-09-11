// src/app/(main)/approvals/[id]/ExpenseReportView.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';

export default function ExpenseReportView({ doc, employee, approvalHistory, referrerHistory }) {
    const [formData, setFormData] = useState({
        requesterDepartment: '',
        requesterPosition: '',
        requesterName: '',
        expenseDate: '',
        amount: '',
        accountType: '',
        paymentMethod: '',
        cardNumberLastFour: '',
        description: '',
    });
    const [loading, setLoading] = useState(true);
    const [approvalComment, setApprovalComment] = useState('');
    const [currentStep, setCurrentStep] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (doc) {
            console.log("ExpenseReportView: useEffect started. doc:", doc);
            console.log("ExpenseReportView: approvalHistory:", approvalHistory); // ★★★ approvalHistory 전체 로그 추가 ★★★

            try {
                let parsedContent = {};
                if (doc.content) {
                    try {
                        parsedContent = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
                    } catch (jsonParseError) {
                        console.error("ExpenseReportView - JSON parsing failed for doc.content:", jsonParseError);
                        toast.error("문서 내용 형식이 올바르지 않습니다. (JSON 파싱 오류)");
                        setLoading(false);
                        return;
                    }
                }
                console.log("ExpenseReportView: Parsed Content for formData:", parsedContent);

                const requesterDept = doc.employee?.department || '정보 없음';
                const requesterPos = doc.employee?.position || '정보 없음';
                const requesterName = doc.employee?.full_name || '정보 없음';

                setFormData(prev => ({
                    ...prev,
                    requesterDepartment: requesterDept,
                    requesterPosition: requesterPos,
                    requesterName: requesterName,
                    expenseDate: parsedContent.expenseDate || '',
                    amount: parsedContent.amount || '',
                    accountType: parsedContent.accountType || '',
                    paymentMethod: parsedContent.paymentMethod || '',
                    cardNumberLastFour: parsedContent.cardNumberLastFour || '',
                    description: parsedContent.description || '',
                }));

                // 현재 결재 단계 찾기
                // ★★★ '대기' 또는 'pending' 둘 다 확인하도록 조건 강화 또는 실제 DB 값으로 변경 ★★★
                const activeStep = approvalHistory && Array.isArray(approvalHistory)
                    ? approvalHistory.find(step => step.status === 'pending' || step.status === '대기') // 둘 다 확인
                    : null;
                setCurrentStep(activeStep);
                
                console.log("ExpenseReportView: Found activeStep:", activeStep); // ★★★ activeStep 로그 추가 ★★★
                console.log("ExpenseReportView: Current step and other states set.");
                setLoading(false);
            } catch (e) {
                console.error("ExpenseReportView: Error in useEffect:", e);
                toast.error("문서 정보를 불러오는 중 오류가 발생했습니다.");
                setLoading(false);
            }
        } else {
            console.warn("ExpenseReportView: doc object is null or undefined in useEffect.");
            setLoading(false);
        }
    }, [doc, approvalHistory]);

    // 결재 버튼 표시 조건
    // ★★★ isDocumentPending 조건도 'pending' 또는 '대기' 모두 확인하도록 강화 ★★★
    const isMyTurnToApprove = employee && currentStep && currentStep.approver?.id === employee.id && (currentStep.status === 'pending' || currentStep.status === '대기');
    const isDocumentPending = doc?.status === 'pending' || doc?.status === '대기' || doc?.status === '진행중';
    const showApprovalButtons = isMyTurnToApprove && isDocumentPending;

    console.log("Approval Status Check:"); // ★★★ 다시 한번 체크 로그 추가 ★★★
    console.log("  employee:", employee);
    console.log("  currentStep:", currentStep);
    console.log("  isMyTurnToApprove:", isMyTurnToApprove);
    console.log("  doc.status:", doc?.status); // ★★★ doc.status 값 직접 로그 ★★★
    console.log("  isDocumentPending:", isDocumentPending);
    console.log("  showApprovalButtons:", showApprovalButtons);


    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return '⌛';
            case '대기': return '⌛'; // '대기'도 'pending'과 동일하게 처리
            case '승인': return '✅';
            case '반려': return '❌';
            case '완료': return '✅';
            case '진행중': return '➡️'; // 진행중 상태 아이콘 추가 (선택 사항)
            default: return '';
        }
    };

    const handleApprove = async () => {
        if (!doc || !employee || !currentStep || isProcessing) return;

        setIsProcessing(true);
        try {
            const nextStepOrder = currentStep.order + 1;

            // 1. 현재 결재자의 상태를 '승인'으로 업데이트
            const { error: approverUpdateError } = await supabase
                .from('approval_document_approvers')
                .update({ status: '승인', approved_at: new Date().toISOString(), comment: approvalComment })
                .eq('id', currentStep.id);

            if (approverUpdateError) throw new Error(approverUpdateError.message);

            // 2. 다음 결재자 찾기
            const nextApprover = approvalHistory.find(step => step.order === nextStepOrder);

            if (nextApprover) {
                // 다음 결재자가 있으면 approval_documents의 current_approver_id 업데이트
                const { error: docUpdateError } = await supabase
                    .from('approval_documents')
                    // ★★★ 문서 상태를 '진행중' 또는 'pending'으로 업데이트. 실제 DB 값에 맞춰야 함 ★★★
                    .update({ current_approver_id: nextApprover.approver_id, status: '진행중' }) 
                    .eq('id', doc.id);
                if (docUpdateError) throw new Error(docUpdateError.message);
                toast.success('결재가 승인되었고 다음 결재자에게 전달되었습니다.');
            } else {
                // 마지막 결재자일 경우, 문서 상태를 '완료'로 변경
                const { error: docStatusError } = await supabase
                    .from('approval_documents')
                    .update({ status: '완료', current_approver_id: null })
                    .eq('id', doc.id);
                if (docStatusError) throw new Error(docStatusError.message);
                toast.success('최종 결재가 승인되어 문서가 완료되었습니다.');
            }

            window.location.reload();
        } catch (error) {
            console.error("결재 승인 오류:", error);
            toast.error(`결재 승인 실패: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!doc || !employee || !currentStep || isProcessing) return;
        if (!approvalComment.trim()) {
            toast.error('반려 시에는 반드시 의견을 입력해야 합니다.');
            return;
        }

        setIsProcessing(true);
        try {
            // 1. 현재 결재자의 상태를 '반려'로 업데이트
            const { error: approverUpdateError } = await supabase
                .from('approval_document_approvers')
                .update({ status: '반려', approved_at: new Date().toISOString(), comment: approvalComment })
                .eq('id', currentStep.id);

            if (approverUpdateError) throw new Error(approverUpdateError.message);

            // 2. 문서 상태를 '반려'로 변경
            const { error: docStatusError } = await supabase
                .from('approval_documents')
                .update({ status: '반려', current_approver_id: null })
                .eq('id', doc.id);
            if (docStatusError) throw new Error(docStatusError.message);

            toast.success('문서가 반려되었습니다.');
            window.location.reload();
        } catch (error) {
            console.error("결재 반려 오류:", error);
            toast.error(`결재 반려 실패: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">지출결의서 내용을 불러오는 중...</div>;
    }

    if (!doc || !employee) {
        return <div className="p-8 text-center text-red-500">문서 또는 사용자 정보를 불러올 수 없습니다.</div>;
    }

    return (
        <div className="flex bg-gray-50 min-h-screen p-8 space-x-8">
            <div className="flex-1">
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">{formData.title || doc.title || '지출 결의서'}</h1>
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p>문서번호: {doc.document_id || 'N/A'}</p>
                        <p>작성일: {new Date(doc.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
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

                    <div className="mb-8 border border-gray-300">
                        <h2 className="p-2 bg-gray-100 font-bold border-b">지출 정보</h2>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">지출일자</label>
                                    <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.expenseDate || '정보 없음'}</p>
                                </div>
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">금액</label>
                                    <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.amount ? `${Number(formData.amount).toLocaleString()}원` : '정보 없음'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">계정 과목</label>
                                    <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.accountType || '정보 없음'}</p>
                                </div>
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">결제 수단</label>
                                    <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.paymentMethod || '정보 없음'}</p>
                                </div>
                            </div>
                            {formData.paymentMethod === '법인카드' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-gray-700 font-bold mb-2 text-sm">카드번호 뒷 4자리</label>
                                        <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.cardNumberLastFour || '정보 없음'}</p>
                                    </div>
                                    <div></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border border-gray-300">
                        <h2 className="p-2 bg-gray-100 font-bold border-b">상세 내역 (적요)</h2>
                        <div className="p-4">
                            <p className="w-full p-3 border rounded-md bg-gray-50 h-40 overflow-auto text-sm">{formData.description || '내용 없음'}</p>
                        </div>
                    </div>
                     {/* 첨부 파일 (doc.attachment_url 사용) */}
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

            <div className="w-96 p-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    <div>
                        <h2 className="text-lg font-bold mb-4 border-b pb-2">결재선</h2>
                        <div className="space-y-2">
                            {approvalHistory.length > 0 ? (
                                approvalHistory.map((step, index) => (
                                    <div key={step.id || `approver-${index}`} className={`flex flex-col p-2 rounded-md ${step.status === 'pending' || step.status === '대기' ? 'bg-yellow-50' : step.status === '승인' || step.status === '완료' ? 'bg-green-50' : step.status === '반려' ? 'bg-red-50' : ''}`}>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-sm text-gray-600">{index + 1}차:</span>
                                            <span className="text-sm font-medium">{step.approver?.full_name || '이름 없음'} ({step.approver?.position || '직위 없음'})</span>
                                            <span className="ml-auto text-sm">{getStatusIcon(step.status)} {step.approved_at ? new Date(step.approved_at).toLocaleDateString('ko-KR') : ''}</span>
                                        </div>
                                        {step.comment && <p className="text-xs text-gray-500 mt-1 pl-6">의견: {step.comment}</p>}
                                    </div>
                                ))
                            ) : <p className="text-sm text-gray-500">결재선 정보가 없습니다.</p>}
                        </div>
                    </div>
                    {referrerHistory.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold mb-4 border-b pb-2">참조인</h2>
                            <div className="space-y-2">
                                {referrerHistory.map((ref, index) => (
                                    <div key={ref.id || `referrer-${index}`} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
                                        <span className="text-sm font-medium">{ref.referrer?.full_name || '이름 없음'} ({ref.referrer?.position || '직위 없음'})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {showApprovalButtons && (
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
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-semibold"
                                >
                                    승인
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-semibold"
                                >
                                    반려
                                </button>
                            </div>
                        </div>
                    )}
                     {doc.status === '완료' && <p className="text-center text-green-600 font-bold mt-4">✅ 최종 승인 완료된 문서입니다.</p>}
                     {doc.status === '반려' && <p className="text-center text-red-600 font-bold mt-4">❌ 문서가 반려되었습니다.</p>}
                </div>
            </div>
        </div>
    );
}