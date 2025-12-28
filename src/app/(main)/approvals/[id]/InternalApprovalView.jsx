'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { usePdfExport } from '@/hooks/usePdfExport';
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
        approvalContent: '',
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
                        approvalTitle: parsedContent.title || '',
                        approvalContent: parsedContent.content || '',
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
                    console.error("내부 결재 문서 처리 중 오류:", e);
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
                    setFormData(prev => ({ ...prev, documentNumber: manualDocNumber }));
                }
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
        const fileName = `${formData.requesterName}_내부결재서_${new Date().toISOString().split('T')[0]}.pdf`;
        exportToPdf(fileName);
    };

    const quillModules = useMemo(() => ({ toolbar: false }), []);
    
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
        <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen p-4 sm:p-8 lg:space-x-8 space-y-6 lg:space-y-0">
            <div className="flex-1 w-full" ref={printRef}>
                <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-6">내 부 결 재 서</h1>
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p className="font-medium">문서번호: {formData.documentNumber}</p> 
                    </div>
                    <div className="mb-8 border border-gray-300 overflow-x-auto">
                        <table className="w-full text-sm border-collapse min-w-[500px]">
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

                    <div className="space-y-6">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">제목</label>
                            <div className="w-full p-3 border rounded-md bg-gray-50 font-medium">{formData.approvalTitle}</div>
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">내용</label>
                            <div className="border rounded-md bg-gray-50 p-2 min-h-[300px] quill-readonly-container overflow-auto">
                                <ReactQuill
                                    value={formData.approvalContent} 
                                    readOnly={true}
                                    theme="snow"
                                    modules={quillModules}
                                />
                            </div>
                        </div>
                        {attachmentSignedUrls.length > 0 && (
                            <div className="mt-6 border-t pt-4">
                                <h3 className="text-md font-bold mb-3 flex items-center">
                                    <span className="mr-2">📎</span> 첨부 파일
                                </h3>
                                <ul className="space-y-2">
                                    {attachmentSignedUrls.map((file, index) => (
                                        <li key={index}>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center text-sm">
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

            <div className="w-full lg:w-96 no-print">
                <div className="bg-white p-6 rounded-xl shadow-lg border space-y-6 lg:sticky lg:top-8">
                    {doc?.status === '완료' && (
                        <button onClick={handlePdfExport} disabled={isExporting} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-md transition-all font-semibold">
                            {isExporting ? 'PDF 저장 중...' : 'PDF로 저장'}
                        </button>
                    )}
                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-4">결재선</h2>
                        <div className="space-y-3">
                            {approvalHistory?.map((step, index) => (
                                <div key={step.id} className={`flex flex-col p-3 rounded-md border ${step.status === '대기' ? 'bg-yellow-50 border-yellow-200' : step.status === '승인' ? 'bg-green-50 border-green-200' : step.status === '반려' ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                                   <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-xs text-gray-500">{index + 1}차</span>
                                        <span className="text-sm font-bold">{step.approver?.full_name}</span>
                                        <span className="text-xs text-gray-500">({step.approver?.position})</span>
                                        <span className="ml-auto text-sm">{getStatusIcon(step.status)}</span>
                                    </div>
                                    {step.comment && <p className="text-xs text-gray-600 mt-2 bg-white/50 p-1 rounded">의견: {step.comment}</p>}
                                    {step.approved_at && <p className="text-[10px] text-gray-400 mt-1 text-right">{new Date(step.approved_at).toLocaleString('ko-KR')}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                    {isMyTurnToApprove && (
                        <div className="space-y-4">
                            {isFinalApprover && (
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-blue-600">문서 번호 부여</label>
                                    <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value)} placeholder="예: 내부-2025-001" className="w-full p-2 border border-blue-300 rounded-md text-sm" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-sm font-bold mb-2">결재 의견</h2>
                                <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} placeholder="의견을 입력하세요." className="w-full p-2 border rounded-md h-24 resize-none text-sm focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="flex space-x-3">
                                <button onClick={() => handleApprovalAction('승인')} disabled={loading} className="flex-1 py-2 bg-green-600 text-white rounded-md font-bold shadow hover:bg-green-700">승인</button>
                                <button onClick={() => handleApprovalAction('반려')} disabled={loading} className="flex-1 py-2 bg-red-600 text-white rounded-md font-bold shadow hover:bg-red-700">반려</button>
                            </div>
                        </div>
                    )}
                    {doc?.status === '완료' && <p className="text-center text-green-600 font-bold pt-2">✅ 결재 완료</p>}
                </div>
            </div>
        </div>
    );
}