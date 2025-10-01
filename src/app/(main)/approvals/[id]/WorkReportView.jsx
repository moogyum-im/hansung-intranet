'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { usePdfExport } from '@/hooks/usePdfExport';

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
                    
                    const requesterDept = doc.requester_department || parsedContent.requesterDepartment || '정보 없음';
                    const requesterPos = doc.requester_position || parsedContent.requesterPosition || '정보 없음';
                    const requesterName = doc.requester_name || parsedContent.requesterName || '정보 없음';

                    setFormData({
                        requesterDepartment: requesterDept, 
                        requesterPosition: requesterPos,     
                        requesterName: requesterName,           
                        documentId: doc.document_number || '미지정',
                        createdAt: new Date(doc.created_at).toLocaleDateString('ko-KR'),
                        title: parsedContent.title || '업무 보고서',
                        reportType: parsedContent.reportType || '',
                        reportDate: parsedContent.reportDate || '',
                        achievements: parsedContent.achievements || '',
                        todayPlan: parsedContent.todayPlan || '',
                        issues: parsedContent.issues || '',
                        nextPlan: parsedContent.nextPlan || '',
                    });

                    const activeStep = approvalHistory?.find(step => step.status === '대기');
                    setCurrentStep(activeStep);

                    if (doc.attachments && doc.attachments.length > 0) {
                        const signedUrlPromises = doc.attachments.map(file => 
                            supabase.storage
                                .from('approval_attachments')
                                .createSignedUrl(file.path, 60)
                        );
                        const signedUrlResults = await Promise.all(signedUrlPromises);
                        const urls = signedUrlResults.map((result, index) => {
                            if (result.error) {
                                console.error('Signed URL 생성 실패:', result.error);
                                return null;
                            }
                            return {
                                url: result.data.signedUrl,
                                name: doc.attachments[index].name,
                            };
                        }).filter(Boolean);
                        setAttachmentSignedUrls(urls);
                    }

                } catch (e) {
                    console.error("업무 보고서 처리 중 오류:", e);
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
                await supabase
                    .from('approval_documents')
                    .update({ 
                        status: finalStatus, 
                        completed_at: new Date().toISOString(),
                        document_number: finalStatus === '완료' ? manualDocNumber : doc.document_number 
                    })
                    .eq('id', doc.id)
                    .throwOnError();

                if (finalStatus === '완료') {
                    setFormData(prev => ({ ...prev, documentId: manualDocNumber }));
                }

            } else {
                await supabase
                    .from('approval_document_approvers')
                    .update({ status: '대기' })
                    .eq('id', nextStep.id)
                    .throwOnError();
                await supabase
                    .from('approval_documents')
                    .update({ status: '진행중' })
                    .eq('id', doc.id)
                    .throwOnError();
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
        const fileName = `${formData.requesterName}_${formData.title}_${new Date().toISOString().split('T')[0]}.pdf`;
        exportToPdf(fileName);
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
            <div className="flex-1" ref={printRef}>
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">{formData.title || '업무 보고서'}</h1>
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p>문서번호: {formData.documentId}</p> 
                        <p>작성일: {formData.createdAt}</p>
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
                                    <td className="p-2">{formData.createdAt}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-6 text-sm">
                        {/* --- [수정] --- 입력창 자체의 높이를 p-2에서 p-3로 늘립니다. --- */}
                        <div className="mb-8">
                            <label className="block text-gray-700 font-bold mb-2">보고서 유형</label>
                            <input type="text" value={formData.reportType || ''} className="w-full p-3 border rounded-md bg-gray-100" readOnly />
                        </div>

                        <div className="mb-8">
                            <label className="block text-gray-700 font-bold mb-2">보고일자</label>
                            <input type="date" value={formData.reportDate || ''} className="w-full p-3 border rounded-md bg-gray-100" readOnly />
                        </div>

                        <div className="mb-8">
                            <label className="block text-gray-700 font-bold mb-2">금일 업무 계획</label>
                            <textarea value={formData.todayPlan || ''} className="w-full p-3 border rounded-md bg-gray-100 min-h-[120px]" readOnly />
                        </div>

                        <div className="mb-8">
                            <label className="block text-gray-700 font-bold mb-2">업무 진행 및 실적</label>
                            <div className="w-full p-3 border rounded-md bg-gray-100 min-h-[150px] overflow-auto prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: formData.achievements || '<p>내용 없음</p>' }}
                            ></div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-gray-700 font-bold mb-2">특이사항 및 문제점</label>
                            <textarea value={formData.issues || ''} className="w-full p-3 border rounded-md bg-gray-100 min-h-[120px]" readOnly />
                        </div>

                        <div className="mb-8">
                            <label className="block text-gray-700 font-bold mb-2">익일 업무 계획</label>
                            <textarea value={formData.nextPlan || ''} className="w-full p-3 border rounded-md bg-gray-100 min-h-[120px]" readOnly />
                        </div>
                        
                        {attachmentSignedUrls.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-bold mb-2">첨부 파일</h3>
                                <ul className="space-y-2">
                                    {attachmentSignedUrls.map((file, index) => (
                                        <li key={index}>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={file.name || true}
                                                className="text-blue-600 hover:underline flex items-center"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                                </svg>
                                                {file.name || '첨부파일 보기'}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="w-96 p-8 no-print">
                <div className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    {doc?.status === '완료' && (
                        <div className="border-b pb-4">
                            <button
                                onClick={handlePdfExport}
                                disabled={isExporting}
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 font-semibold"
                            >
                                {isExporting ? 'PDF 저장 중...' : 'PDF로 저장'}
                            </button>
                        </div>
                    )}
                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-4">결재선</h2>
                        <div className="space-y-3">
                            {approvalHistory?.length > 0 ? ( 
                                approvalHistory.map((step, index) => (
                                    <div key={step.id} className={`flex flex-col p-2 rounded-md ${step.status === '대기' ? 'bg-yellow-50' : step.status === '승인' ? 'bg-green-50' : step.status === '반려' ? 'bg-red-50' : ''}`}>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-sm text-gray-600">{index + 1}차:</span>
                                            <span className="text-sm font-medium">{step.approver?.full_name} ({step.approver?.position})</span>
                                            <span className="ml-auto text-sm">{getStatusIcon(step.status)} {step.approved_at ? new Date(step.approved_at).toLocaleDateString('ko-KR') : ''}</span>
                                        </div>
                                        {step.comment && <p className="text-xs text-gray-500 mt-1">의견: {step.comment}</p>}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">결재선 정보가 없습니다.</p> 
                            )}
                        </div>
                    </div>
                    {referrerHistory?.length > 0 && (
                        <div className="border-b pb-4">
                            <h2 className="text-lg font-bold mb-4">참조인</h2>
                            <div className="space-y-2">
                                {referrerHistory.map((ref) => (
                                    <div key={ref.id} className="flex items-center space-x-2">
                                        <span className="text-sm font-medium">{ref.referrer?.full_name} ({ref.referrer?.position})</span>
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
                                        placeholder="예: 현장A-2025-001"
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
                                <button
                                    onClick={() => handleApprovalAction('승인')}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-semibold"
                                >
                                    {loading ? '처리 중...' : '승인'}
                                </button>
                                <button
                                    onClick={() => handleApprovalAction('반려')}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-semibold"
                                >
                                    {loading ? '처리 중...' : '반려'}
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