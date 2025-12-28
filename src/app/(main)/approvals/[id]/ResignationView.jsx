'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { usePdfExport } from '@/hooks/usePdfExport';

export default function ResignationView({ doc, employee, approvalHistory, referrerHistory }) { 
    const router = useRouter();
    const [formData, setFormData] = useState({
        requesterDepartment: '',
        requesterPosition: '',
        requesterName: '',
        resignationDate: '',
        residentId: '',
        resignationReason: '',
        documentNumber: '미지정',
    });
    const [currentStep, setCurrentStep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [approvalComment, setApprovalComment] = useState('');
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);
    const [manualDocNumber, setManualDocNumber] = useState('');

    const printRef = useRef(null);
    const { exportToPdf, isExporting } = usePdfExport(printRef);

    const isMyTurnToApprove = employee && currentStep && currentStep.approver?.id === employee.id && currentStep.status === '대기';
    const isFinalApprover = currentStep ? approvalHistory.findIndex(step => step.id === currentStep.id) === approvalHistory.length - 1 : false;

    useEffect(() => {
        const setupPage = async () => {
            if (doc) {
                try {
                    let parsedContent = doc.content ? JSON.parse(doc.content) : {};
                    
                    setFormData({
                        requesterDepartment: parsedContent.requesterDepartment || '정보 없음',
                        requesterPosition: parsedContent.requesterPosition || '정보 없음',
                        requesterName: parsedContent.requesterName || '정보 없음',
                        resignationDate: parsedContent.resignationDate || '',
                        residentId: parsedContent.residentId || '',
                        resignationReason: parsedContent.resignationReason || '',
                        documentNumber: doc.document_number || '미지정',
                    });
                    
                    const activeStep = approvalHistory?.find(step => step.status === '대기');
                    setCurrentStep(activeStep || null);
                    
                    if (doc.attachments && doc.attachments.length > 0) {
                        const signedUrlPromises = doc.attachments.map(file => 
                            supabase.storage.from('approval_attachments').createSignedUrl(file.path, 60)
                        );
                        const signedUrlResults = await Promise.all(signedUrlPromises);
                        const urls = signedUrlResults.map((result, index) => {
                            if (result.error) return null;
                            return { url: result.data.signedUrl, name: doc.attachments[index].name };
                        }).filter(Boolean);
                        setAttachmentSignedUrls(urls);
                    }
                } catch (e) {
                    console.error("사직서 처리 중 오류:", e);
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

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep) return toast.error("결재를 진행할 수 없습니다.");
        if (newStatus === '반려' && !approvalComment.trim()) return toast.error("반려 시에는 의견을 입력해야 합니다.");
        if (newStatus === '승인' && isFinalApprover && !manualDocNumber.trim()) return toast.error("최종 승인 시에는 문서 번호를 반드시 입력해야 합니다.");

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
                await supabase
                    .from('approval_documents')
                    .update({ 
                        status: finalStatus, 
                        completed_at: new Date().toISOString(),
                        document_number: finalStatus === '완료' ? manualDocNumber : doc.document_number 
                    })
                    .eq('id', doc.id)
                    .throwOnError();
                
                if (finalStatus === '완료') setFormData(prev => ({ ...prev, documentNumber: manualDocNumber }));
            } else {
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('id', nextStep.id).throwOnError();
                await supabase.from('approval_documents').update({ status: '진행중' }).eq('id', doc.id).throwOnError();
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
        const fileName = `${formData.requesterName}_사직서_${new Date().toISOString().split('T')[0]}.pdf`;
        exportToPdf(fileName);
    };

    if (loading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
    if (!doc) return <div className="flex justify-center items-center h-screen text-red-500">문서를 찾을 수 없습니다.</div>;

    const getStatusIcon = (status) => {
        switch (status) {
            case '대기': return '⌛';
            case '승인': return '✅';
            case '반려': return '❌';
            default: return '';
        }
    };

    return (
        <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen p-4 sm:p-8 lg:space-x-8 space-y-6 lg:space-y-0">
            <div className="flex-1 w-full" ref={printRef}>
                <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg border">
                    <h1 className="text-3xl font-bold text-center mb-8 tracking-[1rem]">사직서</h1>
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p>문서번호: {formData.documentNumber}</p>
                    </div>
                    
                    <div className="mb-8 border border-gray-300 overflow-x-auto">
                        <table className="w-full text-sm border-collapse min-w-[500px]">
                            <tbody>
                                <tr>
                                    <th className="p-3 bg-gray-100 font-bold w-1/5 text-left border-r border-b">소속</th>
                                    <td className="p-3 w-2/5 border-b border-r">{formData.requesterDepartment}</td>
                                    <th className="p-3 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직위</th>
                                    <td className="p-3 w-1/5 border-b">{formData.requesterPosition}</td>
                                </tr>
                                <tr>
                                    <th className="p-3 bg-gray-100 font-bold text-left border-r">성명</th>
                                    <td className="p-3 border-r">{formData.requesterName}</td>
                                    <th className="p-3 bg-gray-100 font-bold text-left border-r">작성일</th>
                                    <td className="p-3">{new Date(doc.created_at).toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-8 text-sm sm:text-base">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">퇴사 사유</label>
                            <div className="w-full p-4 border rounded-md min-h-[100px] bg-gray-50 leading-relaxed">{formData.resignationReason}</div>
                        </div>

                        <div className="border-2 border-double p-6 rounded-md space-y-4 bg-gray-50">
                            <h3 className="font-bold text-center text-lg underline decoration-double underline-offset-4">서 약 서</h3>
                            <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                                <p>1. 본인은 퇴직에 따른 사무 인수, 인계의 절차로 최종 퇴사시까지 책 책임과 의무를 완수하고, 재직 시 업무상 취득한 비밀사항을 타인에게 누설하지 않겠습니다.</p>
                                <p>2. 퇴직금 수령 등 환불품(금)은 퇴직일 전일까지 반환하겠습니다.</p>
                                <p>3. 기타 회사와 관련한 제반사항은 회사규정에 의거 퇴직일 전일까지 처리하겠습니다.</p>
                                <p>4. 만일 본인이 상기 사항을 위반하였을 때에는 이유 여하를 막론하고 민, 형사상의 책임을 지며 손해배상의 의무를 지겠습니다.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">퇴사 예정일</label>
                                <div className="p-3 border-b-2 border-gray-200 font-medium">{formData.resignationDate}</div>
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">주민등록번호</label>
                                <div className="p-3 border-b-2 border-gray-200 font-medium">{formData.residentId}</div>
                            </div>
                        </div>

                        <div className="pt-12 text-center space-y-4">
                            <p className="text-lg font-medium">
                                {new Date(doc.created_at).getFullYear()}년 {new Date(doc.created_at).getMonth() + 1}월 {new Date(doc.created_at).getDate()}일
                            </p>
                            <p className="text-xl font-bold">기안자: {formData.requesterName} (인)</p>
                        </div>

                        {attachmentSignedUrls.length > 0 && (
                            <div className="mt-8 border-t pt-4 no-print">
                                <h3 className="font-bold mb-2">첨부 파일</h3>
                                <ul className="space-y-1">
                                    {attachmentSignedUrls.map((file, index) => (
                                        <li key={index}>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center">
                                                <span className="mr-2">📁</span>{file.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-96 no-print">
                <div className="bg-white p-6 rounded-xl shadow-lg border space-y-6 lg:sticky lg:top-8">
                    {doc?.status === '완료' && (
                        <button onClick={handlePdfExport} disabled={isExporting} className="w-full py-3 bg-indigo-600 text-white rounded-md font-bold shadow hover:bg-indigo-700 transition-all">
                            {isExporting ? 'PDF 생성 중...' : 'PDF 다운로드'}
                        </button>
                    )}
                    
                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-4">결재 진행 상태</h2>
                        <div className="space-y-3">
                            {approvalHistory?.map((step, index) => (
                                <div key={step.id} className={`p-3 rounded-lg border ${step.status === '대기' ? 'bg-yellow-50 border-yellow-200' : step.status === '승인' ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold">{index + 1}차: {step.approver?.full_name}</span>
                                        <span>{getStatusIcon(step.status)}</span>
                                    </div>
                                    {step.comment && <p className="text-xs text-gray-500 mt-2 italic">"{step.comment}"</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {isMyTurnToApprove && (
                        <div className="space-y-4 pt-2">
                            {isFinalApprover && (
                                <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value)} placeholder="문서 번호 입력 (인사-000)" className="w-full p-2 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            )}
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} placeholder="결재 의견을 입력하세요." className="w-full p-3 border rounded h-24 text-sm resize-none" />
                            <div className="flex gap-3">
                                <button onClick={() => handleApprovalAction('승인')} className="flex-1 py-2 bg-green-600 text-white rounded font-bold">승인</button>
                                <button onClick={() => handleApprovalAction('반려')} className="flex-1 py-2 bg-red-600 text-white rounded font-bold">반려</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}