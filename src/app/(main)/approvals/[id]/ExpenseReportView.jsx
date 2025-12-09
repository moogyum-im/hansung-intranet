'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { usePdfExport } from '@/hooks/usePdfExport';

export default function ExpenseReportView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
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
        documentNumber: '미지정',
    });
    const [loading, setLoading] = useState(true);
    const [approvalComment, setApprovalComment] = useState('');
    const [currentStep, setCurrentStep] = useState(null);
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);
    
    const [manualDocNumber, setManualDocNumber] = useState('');

    // --- [추가] --- 문서 번호 수정을 위한 상태변수
    const [isEditingDocNum, setIsEditingDocNum] = useState(false);
    const [tempDocNum, setTempDocNum] = useState('');

    const printRef = useRef(null);
    const { exportToPdf, isExporting } = usePdfExport(printRef);

    const isMyTurnToApprove = employee && currentStep && currentStep.approver?.id === employee.id && (currentStep.status === 'pending' || currentStep.status === '대기');
    const isFinalApprover = currentStep ? approvalHistory.findIndex(step => step.id === currentStep.id) === approvalHistory.length - 1 : false;

    useEffect(() => {
        const setupPage = async () => {
            if (doc) {
                try {
                    let parsedContent = doc.content ? JSON.parse(doc.content) : {};
                    const requesterDept = doc.requester_department || '정보 없음';
                    const requesterPos = doc.requester_position || '정보 없음';
                    const requesterName = doc.requester_name || '정보 없음';

                    setFormData({
                        requesterDepartment: requesterDept,
                        requesterPosition: requesterPos,
                        requesterName: requesterName,
                        expenseDate: parsedContent.expenseDate || '',
                        amount: parsedContent.amount || '',
                        accountType: parsedContent.accountType || '',
                        paymentMethod: parsedContent.paymentMethod || '',
                        cardNumberLastFour: parsedContent.cardNumberLastFour || '',
                        description: parsedContent.description || '',
                        documentNumber: doc.document_number || '미지정', 
                    });

                    // 수정 모드 초기값 설정
                    setTempDocNum(doc.document_number || '');

                    const activeStep = approvalHistory?.find(step => step.status === 'pending' || step.status === '대기');
                    setCurrentStep(activeStep);
                    
                    if (doc.attachments && doc.attachments.length > 0) {
                        const signedUrlPromises = doc.attachments.map(file => 
                            supabase.storage.from('approval_attachments').createSignedUrl(file.path, 60)
                        );
                        const signedUrlResults = await Promise.all(signedUrlPromises);
                        const urls = signedUrlResults.map((result, index) => {
                            if (result.error) {
                                console.error('Signed URL 생성 실패:', result.error);
                                return null;
                            }
                            return { url: result.data.signedUrl, name: doc.attachments[index].name };
                        }).filter(Boolean);
                        setAttachmentSignedUrls(urls);
                    }
                } catch (e) {
                    console.error("지출결의서 처리 중 오류:", e);
                    toast.error("문서 정보를 처리하는 중 오류가 발생했습니다.");
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        setupPage();
    }, [doc, approvalHistory]);

    // --- [추가] --- 문서 번호 수정 핸들러
    const handleUpdateDocNumber = async () => {
        if (!tempDocNum.trim()) return toast.error("문서 번호를 입력해주세요.");

        try {
            const { error } = await supabase
                .from('approval_documents')
                .update({ document_number: tempDocNum })
                .eq('id', doc.id);

            if (error) throw error;

            setFormData(prev => ({ ...prev, documentNumber: tempDocNum }));
            setIsEditingDocNum(false);
            toast.success("문서 번호가 수정되었습니다.");
        } catch (error) {
            console.error("문서 번호 수정 실패:", error);
            toast.error("문서 번호 수정에 실패했습니다.");
        }
    };

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep) return toast.error("결재를 진행할 수 없습니다.");
        if (newStatus === '반려' && !approvalComment.trim()) {
            return toast.error("반려 시에는 의견을 입력해야 합니다.");
        }
        
        if (newStatus === '승인' && isFinalApprover && !manualDocNumber.trim()) {
            return toast.error("최종 승인 시에는 문서 번호를 반드시 입력해야 합니다.");
        }

        setLoading(true);
        try {
            await supabase
                .from('approval_document_approvers')
                .update({ status: newStatus, comment: approvalComment, approved_at: new Date().toISOString() })
                .eq('id', currentStep.id)
                .throwOnError();

            const nextStep = approvalHistory.find(step => step.sequence === currentStep.sequence + 1);

            if (newStatus === '반려' || !nextStep) {
                const finalStatus = newStatus === '반려' ? '반려' : '완료';
                
                const docNumToSave = (finalStatus === '완료') ? manualDocNumber : doc.document_number;

                await supabase
                    .from('approval_documents')
                    .update({ 
                        status: finalStatus, 
                        completed_at: new Date().toISOString(),
                        document_number: docNumToSave
                    })
                    .eq('id', doc.id)
                    .throwOnError();
                
                if (finalStatus === '완료') {
                    setFormData(prev => ({ ...prev, documentNumber: manualDocNumber || '미지정' }));
                    setTempDocNum(manualDocNumber); // 수정 모드 값도 업데이트
                }

            } else {
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('id', nextStep.id).throwOnError();
                await supabase.from('approval_documents').update({ status: '진행중', current_approver_id: nextStep.approver_id }).eq('id', doc.id).throwOnError();
            }
            toast.success(`문서가 ${newStatus}되었습니다.`);
            router.refresh();
        } catch (error) {
            toast.error(`${newStatus} 처리 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePdfExport = () => {
        const fileName = `${formData.requesterName}_지출결의서_${formData.documentNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
        exportToPdf(fileName);
    };
    
    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': case '대기': return '⌛';
            case '승인': case '완료': return '✅';
            case '반려': return '❌';
            case '진행중': return '➡️';
            default: return '';
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
            <div className="flex-1" ref={printRef}>
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">{doc.title || '지출 결의서'}</h1>
                    <div className="text-right text-sm text-gray-500 mb-4 flex flex-col items-end">
                        {/* --- [수정] --- 문서 번호 수정 UI 적용 --- */}
                        <div className="flex items-center space-x-2">
                            <span className="font-bold text-gray-600">문서번호:</span>
                            {isEditingDocNum ? (
                                <div className="flex items-center space-x-1">
                                    <input 
                                        type="text" 
                                        value={tempDocNum} 
                                        onChange={(e) => setTempDocNum(e.target.value)}
                                        className="border rounded px-1 py-0.5 text-sm w-32"
                                    />
                                    <button onClick={handleUpdateDocNumber} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">저장</button>
                                    <button onClick={() => setIsEditingDocNum(false)} className="text-xs bg-gray-300 text-black px-2 py-1 rounded">취소</button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2 group">
                                    <span>{formData.documentNumber}</span>
                                    {/* 완료된 문서일 때만 수정 버튼 노출 (프린트 시에는 숨김) */}
                                    {doc?.status === '완료' && (
                                        <button 
                                            onClick={() => setIsEditingDocNum(true)} 
                                            className="text-gray-400 hover:text-blue-500 no-print"
                                            title="문서번호 수정"
                                        >
                                            ✏️
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <p>작성일: {new Date(doc.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
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
                    <div className="mb-8 border border-gray-300">
                        <h2 className="p-2 bg-gray-100 font-bold border-b">지출 정보</h2>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">지출일자</label>
                                    <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.expenseDate}</p>
                                </div>
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">금액</label>
                                    <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.amount ? `${Number(formData.amount).toLocaleString()}원` : ''}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">계정 과목</label>
                                    <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.accountType}</p>
                                </div>
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">결제 수단</label>
                                    <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.paymentMethod}</p>
                                </div>
                            </div>
                            {formData.paymentMethod === '법인카드' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-gray-700 font-bold mb-2 text-sm">카드번호 뒷 4자리</label>
                                        <p className="w-full p-2 border rounded-md bg-gray-50 text-sm">{formData.cardNumberLastFour}</p>
                                    </div>
                                    <div></div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="border border-gray-300">
                        <h2 className="p-2 bg-gray-100 font-bold border-b">상세 내역 (적요)</h2>
                        <div className="p-4">
                            <p className="w-full p-3 border rounded-md bg-gray-50 h-40 overflow-auto text-sm whitespace-pre-wrap break-all">{formData.description}</p>
                        </div>
                    </div>
                    {attachmentSignedUrls.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-bold mb-2">첨부 파일</h3>
                            <ul className="space-y-2">
                                {attachmentSignedUrls.map((file, index) => (
                                    <li key={index}>
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.name || true} className="text-blue-600 hover:underline flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>
                                            {file.name || '첨부파일 보기'}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            <div className="w-96 p-8 no-print">
                <div className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    {doc?.status === '완료' && (
                        <div className="border-b pb-4">
                            <button onClick={handlePdfExport} disabled={isExporting} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 font-semibold">
                                {isExporting ? 'PDF 저장 중...' : 'PDF로 저장'}
                            </button>
                        </div>
                    )}
                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-4">결재선</h2>
                        <div className="space-y-2">
                            {approvalHistory.length > 0 ? (
                                approvalHistory.map((step, index) => (
                                    <div key={step.id} className={`flex flex-col p-2 rounded-md ${step.status === 'pending' || step.status === '대기' ? 'bg-yellow-50' : step.status === '승인' || step.status === '완료' ? 'bg-green-50' : step.status === '반려' ? 'bg-red-50' : ''}`}>
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
                                    <div key={ref.id} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
                                        <span className="text-sm font-medium">{ref.referrer?.full_name || '이름 없음'} ({ref.referrer?.position || '직위 없음'})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {isMyTurnToApprove && (
                        <div className="border-t pt-4 mt-4">
                            {isFinalApprover && (
                                <div className="mb-4">
                                    <label className="block text-lg font-bold mb-2 text-blue-600">문서 번호 입력</label>
                                    <input
                                        type="text"
                                        value={manualDocNumber}
                                        onChange={(e) => setManualDocNumber(e.target.value)}
                                        placeholder="예: 지출-2025-001 (미입력 시 공란)"
                                        className="w-full p-2 border border-blue-300 rounded-md"
                                    />
                                </div>
                            )}
                            <h2 className="text-lg font-bold mb-2">결재 의견</h2>
                            <textarea
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                                placeholder="결재 의견을 입력하세요."
                                className="w-full p-2 border rounded-md h-24 resize-none mb-4"
                            />
                            <div className="flex space-x-4">
                                <button onClick={() => handleApprovalAction('승인')} disabled={loading} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-semibold">
                                    {loading ? '처리 중...' : '승인'}
                                </button>
                                <button onClick={() => handleApprovalAction('반려')} disabled={loading} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-semibold">
                                    {loading ? '처리 중...' : '반려'}
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