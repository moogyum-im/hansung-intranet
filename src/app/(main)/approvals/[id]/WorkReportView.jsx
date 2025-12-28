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
        hourlyTasks: {},
        visibleSections: {
            hourlyTasks: true,
            todayPlan: true,
            achievements: true,
            issues: true,
            nextPlan: true
        }
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
                        hourlyTasks: parsedContent.hourlyTasks || {},
                        visibleSections: parsedContent.visibleSections || {
                            hourlyTasks: true,
                            todayPlan: true,
                            achievements: true,
                            issues: true,
                            nextPlan: true
                        }
                    });

                    const activeStep = approvalHistory?.find(step => step.status === '대기');
                    setCurrentStep(activeStep);

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
                    console.error("오류:", e);
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
        if (newStatus === '승인' && isFinalApprover && !manualDocNumber.trim()) return toast.error("문서 번호를 입력해야 합니다.");

        setLoading(true);
        try {
            await supabase.from('approval_document_approvers').update({ status: newStatus, comment: approvalComment, approved_at: new Date().toISOString() }).eq('id', currentStep.id).throwOnError();
            const nextStep = approvalHistory.find(step => step.sequence === currentStep.sequence + 1);
            if (newStatus === '반려' || !nextStep) {
                const finalStatus = newStatus === '반려' ? '반려' : '완료';
                await supabase.from('approval_documents').update({ status: finalStatus, completed_at: new Date().toISOString(), document_number: finalStatus === '완료' ? manualDocNumber : doc.document_number }).eq('id', doc.id).throwOnError();
                if (finalStatus === '완료') setFormData(prev => ({ ...prev, documentId: manualDocNumber }));
            } else {
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('id', nextStep.id).throwOnError();
                await supabase.from('approval_documents').update({ status: '진행중' }).eq('id', doc.id).throwOnError();
            }
            toast.success(`문서가 ${newStatus}되었습니다.`);
            router.refresh();
        } catch (error) {
            toast.error(`실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePdfExport = () => {
        const fileName = `${formData.requesterName}_${formData.title}_${new Date().toISOString().split('T')[0]}.pdf`;
        exportToPdf(fileName);
    };

    if (loading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
    if (!doc) return <div className="flex justify-center items-center h-screen text-red-500">정보를 찾을 수 없습니다.</div>;

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
                    <h1 className="text-2xl font-bold text-center mb-6">{formData.title}</h1>
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p>문서번호: {formData.documentId}</p> 
                        <p>작성일: {formData.createdAt}</p>
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
                                    <td className="p-2">{formData.createdAt}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {formData.visibleSections.hourlyTasks && (
                        <div className="mb-8 border border-gray-300 overflow-x-auto">
                            <h2 className="p-2 bg-blue-50 font-bold border-b text-sm text-center text-blue-900">시간별 주요 업무 내역</h2>
                            <table className="w-full text-sm border-collapse min-w-[400px]">
                                <tbody>
                                    {Object.entries(formData.hourlyTasks).map(([time, task]) => (
                                        <tr key={time} className="border-b last:border-0">
                                            <th className="p-2 bg-gray-50 font-medium w-32 text-center border-r text-gray-500">{time}</th>
                                            <td className="p-2">{task || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="space-y-6 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">보고서 유형</label>
                                <div className="p-3 border rounded bg-gray-50">{formData.reportType}</div>
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">보고일자</label>
                                <div className="p-3 border rounded bg-gray-50">{formData.reportDate}</div>
                            </div>
                        </div>

                        {formData.visibleSections.todayPlan && (
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">업무 계획</label>
                                <div className="p-3 border rounded bg-gray-50 min-h-[100px] whitespace-pre-wrap">{formData.todayPlan}</div>
                            </div>
                        )}

                        {formData.visibleSections.achievements && (
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">상세 업무 진행 및 실적</label>
                                <div className="p-3 border rounded bg-gray-50 min-h-[150px] overflow-auto prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.achievements || '<p>내용 없음</p>' }}></div>
                            </div>
                        )}

                        {formData.visibleSections.issues && (
                            <div>
                                <label className="block text-gray-700 font-bold mb-1 text-red-600">특이사항 및 문제점</label>
                                <div className="p-3 border rounded bg-red-50/30 min-h-[100px] whitespace-pre-wrap">{formData.issues}</div>
                            </div>
                        )}

                        {formData.visibleSections.nextPlan && (
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">향후 업무 계획</label>
                                <div className="p-3 border rounded bg-gray-50 min-h-[100px] whitespace-pre-wrap">{formData.nextPlan}</div>
                            </div>
                        )}
                        
                        {attachmentSignedUrls.length > 0 && (
                            <div className="mt-6 no-print border-t pt-4">
                                <h3 className="text-lg font-bold mb-2">첨부 파일</h3>
                                <ul className="space-y-1">
                                    {attachmentSignedUrls.map((file, index) => (
                                        <li key={index}><a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center">📎 {file.name}</a></li>
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
                        <button onClick={handlePdfExport} disabled={isExporting} className="w-full py-2.5 bg-indigo-600 text-white rounded-md font-bold shadow-md hover:bg-indigo-700 transition-all">{isExporting ? 'PDF 생성 중...' : 'PDF로 저장'}</button>
                    )}
                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-4">결재선</h2>
                        <div className="space-y-3">
                            {approvalHistory?.map((step, index) => (
                                <div key={step.id} className={`p-2 rounded-md ${step.status === '대기' ? 'bg-yellow-50 border border-yellow-100' : step.status === '승인' ? 'bg-green-50' : 'bg-gray-50'}`}>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold">{index + 1}차: {step.approver?.full_name}</span>
                                        <span>{getStatusIcon(step.status)}</span>
                                    </div>
                                    {step.comment && <p className="text-xs text-gray-500 mt-1 pl-1 border-l-2">의견: {step.comment}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                    {isMyTurnToApprove && (
                        <div className="space-y-4">
                            {isFinalApprover && <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value)} placeholder="문서 번호 입력" className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500" />}
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} placeholder="결재 의견" className="w-full p-2 border rounded h-24 text-sm" />
                            <div className="flex gap-2">
                                <button onClick={() => handleApprovalAction('승인')} className="flex-1 py-2 bg-green-600 text-white rounded font-bold shadow">승인</button>
                                <button onClick={() => handleApprovalAction('반려')} className="flex-1 py-2 bg-red-600 text-white rounded font-bold shadow">반려</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}