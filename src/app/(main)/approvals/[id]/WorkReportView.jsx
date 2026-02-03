'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
    Printer, FileText, CheckCircle, XCircle, Hash, 
    UserCheck, Users, Loader2, Download, ChevronRight, Settings, Paperclip, ImageIcon
} from 'lucide-react';

export default function WorkReportView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalComment, setApprovalComment] = useState('');
    const [currentStep, setCurrentStep] = useState(null);
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);
    const [manualDocNumber, setManualDocNumber] = useState('');

    const isReferrer = referrerHistory?.some(ref => ref.referrer_id === employee?.id || ref.referrer?.id === employee?.id);
    const isMyTurn = employee && currentStep && currentStep.approver?.id === employee.id && (currentStep.status === 'pending' || currentStep.status === '대기');

    useEffect(() => {
        const setupPage = async () => {
            if (doc) {
                try {
                    const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content || {};
                    setFormData(content);
                    setManualDocNumber(doc.document_number || '');
                    setCurrentStep(approvalHistory?.find(s => s.status === 'pending' || s.status === '대기'));

                    let rawFiles = doc.attachments;
                    if (typeof rawFiles === 'string') {
                        try { rawFiles = JSON.parse(rawFiles); } catch (e) { rawFiles = []; }
                    }

                    if (rawFiles && Array.isArray(rawFiles) && rawFiles.length > 0) {
                        const signedUrlPromises = rawFiles.map(async (file) => {
                            if (!file) return null;
                            const filePath = typeof file === 'object' ? file.path : file;
                            if (!filePath) return null;

                            const cleanPath = filePath.replace('approval_attachments/', '').replace('settlement_proofs/', '').trim();
                            const { data, error } = await supabase.storage.from('approval_attachments').createSignedUrl(cleanPath, 3600);

                            if (!error && data?.signedUrl) {
                                return { url: data.signedUrl, name: file.name || cleanPath };
                            }
                            return null;
                        });
                        const results = await Promise.all(signedUrlPromises);
                        setAttachmentSignedUrls(results.filter(Boolean));
                    }
                } catch (e) { console.error("로드 실패:", e); } finally { setLoading(false); }
            }
        };
        setupPage();
    }, [doc, approvalHistory]);

    const handleUpdateDocNumber = async () => {
        if (!manualDocNumber.trim()) return toast.error("문서 번호 입력 필요");
        setActionLoading(true);
        try {
            await supabase.from('approval_documents').update({ document_number: manualDocNumber }).eq('id', doc.id);
            toast.success("반영되었습니다.");
            router.refresh();
        } catch (error) { toast.error("실패"); } finally { setActionLoading(false); }
    };

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep || (newStatus === '반려' && !approvalComment.trim())) return toast.error("반려 사유 필수");
        setActionLoading(true);
        try {
            await supabase.from('approval_document_approvers').update({ status: newStatus, comment: approvalComment, approved_at: new Date().toISOString() }).eq('id', currentStep.id);
            const nextStep = approvalHistory.find(step => step.sequence === currentStep.sequence + 1);
            if (newStatus === '반려' || !nextStep) {
                await supabase.from('approval_documents').update({ status: newStatus === '반려' ? '반려' : '완료', completed_at: new Date().toISOString() }).eq('id', doc.id);
            } else {
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('id', nextStep.id);
                await supabase.from('approval_documents').update({ status: '진행중', current_approver_id: nextStep.approver_id }).eq('id', doc.id);
            }
            window.location.reload();
        } catch (error) { toast.error("처리 실패"); } finally { setActionLoading(false); }
    };

    if (loading) return <div className="p-20 text-center font-black text-black text-xs font-sans animate-pulse italic uppercase">HANSUNG ERP LOADING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0 font-black font-black font-black font-black">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
                    .no-print, nav, header, aside, .sidebar { display: none !important; }
                    .print-container { width: 210mm !important; margin: 0 auto !important; padding: 25mm 20mm !important; border: none !important; box-shadow: none !important; box-sizing: border-box !important; }
                    table { border-collapse: collapse !important; border: 1px solid black !important; width: 100% !important; }
                    th, td { border: 1px solid black !important; padding: 10px !important; }
                    .print-section { page-break-inside: avoid !important; break-inside: avoid-page !important; }
                    ::-webkit-scrollbar { display: none !important; }
                }
                ::-webkit-scrollbar { width: 0px; } 
            `}} />
            
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Work Report Viewer</span>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg font-black"><Printer size={14} /> 인쇄 및 PDF 저장</button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black text-black font-black font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container font-black font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black print-section font-black font-black">
                        <h1 className="text-3xl font-black tracking-tighter uppercase">{formData.title || '업 무 보 고 서'}</h1>
                        <div className="flex justify-between text-[10px] mt-4 font-black">
                            <span>문서번호 : {doc.document_number || '관리부 추후 부여'}</span>
                            <span>작성일자 : {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                        </div>
                    </header>

                    <div className="space-y-12 text-black font-black">
                        <table className="w-full border-collapse border border-black text-[11px] font-black print-section font-black font-black font-black font-black font-black">
                            <tbody>
                                <tr className="border-b border-black text-black font-black font-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">기안부서</th>
                                    <td className="p-4 border-r border-black font-black font-black">{doc.requester_department}</td>
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase font-black">성명/직위</th>
                                    <td className="p-4 font-black font-black">{doc.requester_name} {doc.requester_position}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* 🚀 01. 시간별 업무 내역 */}
                        {formData.hourlyTasks && (
                            <section className="print-section font-black text-black font-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black font-black">01. 시간별 주요 업무 내역</h2>
                                <table className="w-full border-collapse border border-black text-[11px] font-black">
                                    <tbody>
                                        {Object.entries(formData.hourlyTasks).map(([time, task]) => (
                                            <tr key={time} className="border-b border-black last:border-0 font-black">
                                                <td className="bg-slate-50 w-32 p-3 text-center border-r border-black font-mono font-black">{time}</td>
                                                <td className="p-3 font-black">{task || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        )}

                        {/* 🚀 02. 금일 계획 */}
                        {formData.todayPlan && (
                            <section className="print-section font-black text-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">02. 금일 업무 계획</h2>
                                <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[100px] whitespace-pre-wrap font-black">{formData.todayPlan}</div>
                            </section>
                        )}

                        {/* 🚀 03. 상세 실적 */}
                        {formData.achievements && (
                            <section className="print-section font-black text-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">03. 상세 업무 실적</h2>
                                <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[200px] whitespace-pre-wrap font-black prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.achievements }}></div>
                            </section>
                        )}

                        {/* 🚀 04. 특이사항 */}
                        {formData.issues && (
                            <section className="print-section font-black text-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black text-red-600">04. 특이사항 및 문제점</h2>
                                <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[80px] whitespace-pre-wrap font-black bg-red-50/5">{formData.issues}</div>
                            </section>
                        )}

                        {/* 🚀 05. 향후 계획 */}
                        {formData.futurePlan && (
                            <section className="print-section font-black text-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">05. 향후 업무 계획</h2>
                                <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[100px] whitespace-pre-wrap font-black bg-slate-50/10">{formData.futurePlan}</div>
                            </section>
                        )}

                        <div className="pt-20 text-center space-y-6 print-section font-black text-black font-black">
                            <div className="space-y-4 font-black">
                                <p className="text-[15px] font-black underline underline-offset-8 decoration-1 font-mono">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : '-'}</p>
                                <p className="text-2xl font-black uppercase tracking-[0.4em] mt-6 font-black font-black">보고인: {doc.requester_name} (인)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-5 no-print font-black font-black">
                    {isReferrer && (
                        <div className="bg-white border border-black p-6 shadow-sm font-black text-black">
                            <div className="flex flex-col gap-2 font-black font-black">
                                <p className="text-[9px] text-slate-400 mb-1 font-black">※ 관리부 승인 후 공식 문서번호를 입력해 주십시오.</p>
                                <div className="flex gap-2">
                                    <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value)} className="flex-1 border border-black px-3 py-1.5 text-[11px] outline-none font-black text-black focus:bg-slate-50" placeholder="관리부 추후 부여" />
                                    <button onClick={handleUpdateDocNumber} className="bg-black text-white px-4 py-1.5 text-[10px] font-black hover:bg-slate-800 transition-all">반영</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2 text-black font-black">
                            <Users size={16} /><h2 className="text-[11px] uppercase font-black text-black font-black">결재 프로세스</h2>
                        </div>
                        <div className="space-y-2 mb-5 font-black text-black font-black">
                            {approvalHistory?.map((step, idx) => (
                                <div key={step.id} className={`p-3 rounded-xl border flex justify-between items-center ${step.status === '승인' || step.status === '완료' ? 'bg-slate-50 border-black font-black' : 'bg-white opacity-60'} font-black`}>
                                    <div className="text-[12px] font-black">{step.approver?.full_name} <span className="text-[9px] text-slate-400 ml-1">{idx + 1}차</span></div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${step.status === '승인' || step.status === '완료' ? 'bg-black text-white' : 'bg-amber-400 text-white'}`}>{step.status === 'pending' ? '대기' : step.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-2xl p-6 shadow-xl text-white font-black font-black">
                            <h3 className="text-[11px] uppercase mb-4 font-black text-slate-400">결재 의견 작성</h3>
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] font-black outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500" placeholder="의견을 입력하십시오." />
                            <div className="grid grid-cols-2 gap-3 font-black">
                                <button onClick={() => handleApprovalAction('승인')} className="bg-white text-black py-3 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 font-black font-black"><CheckCircle size={14}/> 승인</button>
                                <button onClick={() => handleApprovalAction('반려')} className="bg-rose-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2 font-black font-black font-black"><XCircle size={14}/> 반려</button>
                            </div>
                        </div>
                    )}

                    {/* 🚀 [갤러리 영역] 카이 방식으로 수정됨 (다운로드 기능 포함) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 text-black">
                            <h2 className="text-[11px] uppercase font-black flex items-center gap-2 font-black"><Paperclip size={14} /> 증빙 자료 및 첨부파일</h2>
                            <span className="text-[10px] text-slate-400 font-black">{attachmentSignedUrls.length} Files</span>
                        </div>
                        
                        {attachmentSignedUrls.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 font-black">
                                {attachmentSignedUrls.map((file, i) => (
                                    <div key={i} className="flex flex-col border border-slate-100 rounded-lg overflow-hidden bg-slate-50 shadow-sm font-black">
                                        <div className="flex items-center justify-between p-2 bg-white border-b border-slate-100 font-black">
                                            <div className="flex items-center gap-2 flex-1 truncate font-black">
                                                {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={14} className="text-blue-500" /> : <FileText size={14} className="text-slate-400" />}
                                                <span className="text-[10px] font-black truncate">{file.name}</span>
                                            </div>
                                            <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-50 p-1 rounded bg-white border border-blue-100 font-black">
                                                <Download size={14} />
                                            </a>
                                        </div>
                                        {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                            <div className="p-2 flex justify-center bg-slate-50 font-black font-black">
                                                <img src={file.url} alt={file.name} className="max-w-full h-auto rounded border border-white shadow-sm" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-xl font-black">
                                <Paperclip size={20} className="mx-auto text-slate-200 mb-2 font-black" />
                                <p className="text-[10px] text-slate-300 font-black italic uppercase">No Attachments</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}