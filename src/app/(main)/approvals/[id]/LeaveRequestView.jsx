// src/app/(main)/approvals/[id]/LeaveRequestView.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react'; // useRef 추가
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { usePdfExport } from '@/hooks/usePdfExport'; // usePdfExport 훅 임포트

export default function LeaveRequestView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        requesterDepartment: '',
        requesterPosition: '',
        requesterName: '',
        leaveType: '',      
        startDate: '',      
        endDate: '',        
        duration: '',       
        reason: '',         
    });
    const [currentStep, setCurrentStep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [approvalComment, setApprovalComment] = useState('');

    // PDF로 변환할 콘텐츠 영역을 참조하기 위한 ref
    const printRef = useRef(null); // 초기값 null로 설정
    // 커스텀 훅 usePdfExport 사용
    const { exportToPdf, isExporting } = usePdfExport(printRef);

    const isMyTurnToApprove = employee && currentStep && currentStep.approver?.id === employee.id && currentStep.status === '대기';
    const isDocumentPending = doc?.status === '대기' || doc?.status === '진행중'; 

    useEffect(() => {
        if (doc) {
            try {
                // console.log("LeaveRequestView - Original doc.content:", doc.content);
                // console.log("LeaveRequestView - Full doc object (for requester info):", doc);
                // console.log("LeaveRequestView - Employee object (for current user info):", employee);
                // console.log("LeaveRequestView - Approval History object:", approvalHistory);

                let parsedContent = {};
                if (doc.content) {
                    try {
                        parsedContent = JSON.parse(doc.content);
                    } catch (jsonParseError) {
                        console.error("LeaveRequestView - JSON parsing failed for doc.content:", jsonParseError);
                        toast.error("문서 내용 형식이 올바르지 않습니다. (JSON 파싱 오류)");
                    }
                }
                
                // console.log("LeaveRequestView - Parsed Content for formData:", parsedContent);

                // --- 상신자 정보 파싱 로직 강화 ---
                // doc.employee에 정보가 있다면 우선 사용 (supabase join으로 가져온 경우)
                // 없다면 doc 객체 자체에 requester_department, requester_position, requester_name과 같은 필드가 있는지 확인 (직접 저장한 경우)
                // 이마저도 없다면 기본값 '정보 없음'
                const requesterDept = doc.employee?.department 
                                      || doc.requester_department 
                                      || '정보 없음';
                const requesterPos = doc.employee?.position 
                                     || doc.requester_position 
                                     || '정보 없음';
                const requesterName = doc.employee?.full_name 
                                      || doc.requester_name 
                                      || '정보 없음';
                // --- 상신자 정보 파싱 로직 끝 ---

                // --- 휴가 기간 계산 로직 ---
                const leaveType = parsedContent.leaveType || ''; 
                const start = parsedContent.startDate || '';     
                const end = parsedContent.endDate || '';         
                let calculatedDuration = '';

                if (leaveType === '반차') { 
                    calculatedDuration = '0.5일'; 
                } else if (start && end) {
                    const startDateObj = new Date(start + 'T00:00:00'); // 시간 정보 추가하여 로컬 시간대 문제 방지
                    const endDateObj = new Date(end + 'T00:00:00');   // 시간 정보 추가하여 로컬 시간대 문제 방지
                    if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
                        const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
                        // +1을 하여 시작일과 종료일 모두 포함 (예: 1일 시작, 1일 종료 => 1일)
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        calculatedDuration = `${diffDays + 1}일`; 
                    } else {
                        console.warn("Invalid date format for duration calculation:", start, end);
                    }
                } else {
                    console.warn("Missing start or end date for duration calculation.");
                }
                // --- 기간 계산 로직 끝 ---

                setFormData(prev => ({
                    ...prev, 
                    requesterDepartment: requesterDept, 
                    requesterPosition: requesterPos,     
                    requesterName: requesterName,           
                    
                    leaveType: leaveType,             
                    startDate: start,           
                    endDate: end,                 
                    duration: calculatedDuration, 
                    reason: parsedContent.reason || '', 
                }));

                const activeStep = approvalHistory && Array.isArray(approvalHistory) 
                                 ? approvalHistory.find(step => step.status === '대기') 
                                 : null;
                setCurrentStep(activeStep);

                // console.log("LeaveRequestView - Active Step found:", activeStep);
                // console.log("LeaveRequestView - Current Step set to:", activeStep);
                // console.log("LeaveRequestView - isMyTurnToApprove (calculated in useEffect):", 
                //     employee && activeStep && activeStep.approver?.id === employee.id && activeStep.status === '대기'
                // );

                setLoading(false); 
            } catch (e) {
                console.error("LeaveRequestView - Error in useEffect:", e);
                toast.error("문서 정보를 불러오는 중 오류가 발생했습니다.");
                setLoading(false);
            }
        } else {
            console.warn("LeaveRequestView - doc object is null or undefined.");
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
                console.log("handleApprove: There is a next approver. Updating document status to '진행중'."); // 로그 추가
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
                // --- 마지막 결재자라면 문서 상태를 '완료'로 변경 ---
                console.log("handleApprove: Last approver. Attempting to update document status to '완료'. Document ID:", doc.id); // 로그 추가
                const { error: docStatusError } = await supabase
                    .from('approval_documents')
                    .update({ status: '완료', completed_at: new Date().toISOString() })
                    .eq('id', doc.id);
                if (docStatusError) {
                    console.error("handleApprove: Failed to update document status to '완료'. Error:", docStatusError); // 에러 로그 추가
                    throw new Error(docStatusError.message);
                }
                console.log("handleApprove: Document status successfully updated to '완료'."); // 성공 로그 추가
            }

            toast.success("문서가 승인되었습니다.");
            router.refresh(); // 변경사항 반영을 위해 페이지 새로고침
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

            // 문서 상태를 '반려'로 변경
            const { error: docStatusError } = await supabase
                .from('approval_documents')
                .update({ status: '반려', completed_at: new Date().toISOString() })
                .eq('id', doc.id);
            if (docStatusError) throw new Error(docStatusError.message);

            toast.success("문서가 반려되었습니다.");
            router.refresh(); // 변경사항 반영을 위해 페이지 새로고침
        } catch (error) {
            toast.error(`반려 실패: ${error.message}`);
            console.error("handleReject - Error during rejection:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">휴가신청서 내용을 불러오는 중...</div>;
    if (!doc) return <div className="flex justify-center items-center h-screen text-red-500">휴가신청서 정보를 찾을 수 없습니다.</div>;

    const getStatusIcon = (status) => {
        switch (status) {
            case '대기': return '⌛';
            case '승인': return '✅';
            case '반려': return '❌';
            default: return '';
        }
    };
    
    // PDF 내보내기 버튼 클릭 핸들러
    const handlePdfExport = () => {
        const fileName = `${formData.requesterName}_휴가신청서_${formData.startDate}.pdf`;
        exportToPdf(fileName);
    };

    return (
        <div className="flex bg-gray-50 min-h-screen p-8 space-x-8">
            {/* PDF로 변환될 메인 콘텐츠 영역 - 여기에 ref를 연결합니다! */}
            <div className="flex-1" ref={printRef}> 
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">휴 가 신 청 서</h1>
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
                                    <td className="p-2 w-2/5 border-b border-r">{formData.requesterDepartment}</td>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직 위</th>
                                    <td className="p-2 w-1/5 border-b">{formData.requesterPosition}</td>
                                </tr>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안자</th>
                                    <td className="p-2 border-r">{formData.requesterName}</td>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안일자</th>
                                    <td className="p-2">{new Date(doc.created_at).toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-6 text-sm">
                        {/* 휴가 종류 */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">휴가 종류</label>
                            <input
                                type="text"
                                value={formData.leaveType || ''} 
                                className="w-full p-2 border rounded-md bg-gray-100"
                                readOnly
                            />
                        </div>

                        {/* 휴가 기간 */}
                        <div className="mb-6 flex space-x-4">
                            <div className="flex-1">
                                <label className="block text-gray-700 font-bold mb-2">시작일</label>
                                <input
                                    type="date"
                                    value={formData.startDate || ''} 
                                    className="w-full p-2 border rounded-md bg-gray-100"
                                    readOnly
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-gray-700 font-bold mb-2">종료일</label>
                                <input
                                    type="date"
                                    value={formData.endDate || ''} 
                                    className="w-full p-2 border rounded-md bg-gray-100"
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* 휴가 기간 일수 (자동 계산된 값 표시) */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">기간 (일)</label>
                            <input
                                type="text"
                                value={formData.duration || ''} 
                                className="w-full p-2 border rounded-md bg-gray-100"
                                readOnly
                            />
                        </div>

                        {/* 휴가 사유 */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-bold mb-2">휴가 사유</label>
                            <textarea
                                value={formData.reason || ''} 
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
                    {/* --- PDF 저장 버튼 추가 --- */}
                    {/* 문서 상태가 '완료'일 때만 PDF 저장 버튼을 표시 */}
                    {doc?.status === '완료' && (
                        <div className="border-b pb-4">
                            <button
                                onClick={handlePdfExport}
                                disabled={isExporting} // PDF 생성 중에는 버튼 비활성화
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 font-semibold"
                            >
                                {isExporting ? 'PDF 저장 중...' : 'PDF로 저장'}
                            </button>
                        </div>
                    )}
                    {/* --- 버튼 추가 끝 --- */}

                    {/* 결재선 */}
                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-4">결재선</h2>
                        <div className="space-y-3">
                            {/* approvalHistory가 배열이고 내용이 있을 경우에만 맵핑 */}
                            {approvalHistory && Array.isArray(approvalHistory) && approvalHistory.length > 0 ? ( 
                                approvalHistory.map((step, index) => (
                                    <div key={step.id || `step-${index}`} className={`flex flex-col p-2 rounded-md ${step.status === '대기' ? 'bg-yellow-50' : step.status === '승인' ? 'bg-green-50' : step.status === '반려' ? 'bg-red-50' : ''}`}>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-sm text-gray-600">{index + 1}차:</span>
                                            <span className="text-sm font-medium">{step.approver?.full_name || '이름 없음'} ({step.approver?.position || '직위 없음'})</span>
                                            <span className="ml-auto text-sm">{getStatusIcon(step.status)} {step.approved_at ? new Date(step.approved_at).toLocaleDateString('ko-KR') : ''}</span>
                                        </div>
                                        {step.comment && <p className="text-xs text-gray-500 mt-1 pl-6">의견: {step.comment}</p>}
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