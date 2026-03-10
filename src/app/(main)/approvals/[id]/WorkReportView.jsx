'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
    Printer, FileText, CheckCircle, XCircle, Hash, 
    UserCheck, Users, Loader2, Download, ChevronRight, Settings, Paperclip, ImageIcon, X, MessageSquare
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
    const [selectedImg, setSelectedImg] = useState(null);

    const isReferrer = referrerHistory?.some(ref => ref.referrer_id === employee?.id || ref.referrer?.id === employee?.id);
    const isMyTurn = employee && currentStep && currentStep.approver?.id === employee.id && (currentStep.status === 'pending' || currentStep.status === '대기');

    const formatDateShort = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "";
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}.${day}`;
    };

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
                            const cleanPath = filePath.replace('approval_attachments/', '').trim();
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

    const isVisible = (sectionKey) => {
        if (!formData.visibleSections) return true;
        return formData.visibleSections[sectionKey] !== false;
    };

    if (loading) return <div className="p-20 text-center font-black text-black text-xs font-sans animate-pulse italic uppercase">HANSUNG ERP LOADING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0 font-black">
            {selectedImg && (
                <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out no-print font-black" onClick={() => setSelectedImg(null)}>
                    <img src={selectedImg} alt="zoom" className="max-w-full max-h-full object-contain shadow-2xl font-black" />
                    <button className="absolute top-10 right-10 text-white hover:rotate-90 transition-transform font-black"><X size={40}/></button>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
                    .no-print, nav, header, aside, .sidebar { display: none !important; }
                    .print-container { width: 210mm !important; margin: 0 auto !important; padding: 20mm 15mm !important; border: none !important; box-shadow: none !important; box-sizing: border-box !important; }
                    .approval-table { border-collapse: collapse !important; width: auto !important; margin-left: auto !important; }
                    .approval-table th, .approval-table td { border: 1px solid black !important; }
                    .print-section { page-break-inside: avoid !important; break-inside: avoid-page !important; }
                }
            `}} />
            
            <div className="w-full max-w-[1100px] mb-4 flex justify-end items-center no-print px-2 font-black">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg font-black"><Printer size={14} /> 인쇄 및 PDF 저장</button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black text-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container font-black font-black">
                    
                    {/* 🚀 상단 결재 스탬프 영역 (다른 문서와 통일) */}
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8 font-black">
                        <div className="space-y-4 font-black">
                            <h1 className="text-4xl font-black tracking-tighter uppercase font-black">{formData.title || '업 무 보 고 서'}</h1>
                            <div className="flex flex-col text-[10px] space-y-1 font-black">
                                <span>문서번호 : {doc.document_number || '관리부 추후 부여'}</span>
                                <span>작성일자 : {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                            </div>
                        </div>

                        <div className="flex font-black font-black">
                            <table className="approval-table border-collapse border border-black text-[11px] font-black">
                                <tbody>
                                    <tr className="font-black">
                                        <th rowSpan="3" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvalHistory?.map((step) => (
                                            <th key={step.id} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black font-black">
                                                {step.approver?.position || '결재'}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="h-20 font-black">
                                        <td className="border border-black p-1 text-center relative align-middle font-black">
                                            <div className="text-rose-600 font-black border-2 border-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto opacity-70 rotate-[-15deg] text-[9px] leading-tight font-black">
                                                서명완료<br/>{formatDateShort(doc.created_at)}
                                            </div>
                                            <div className="mt-1 font-black text-[9px] font-black">{doc.requester_name}</div>
                                        </td>
                                        {approvalHistory?.map((step) => (
                                            <td key={step.id} className="border border-black p-1 text-center relative align-middle font-black font-black">
                                                {step.status === '승인' || step.status === '완료' ? (
                                                    <>
                                                        <div className="text-rose-600 font-black border-2 border-rose-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto rotate-[-15deg] text-[10px] leading-tight font-black font-black">
                                                            서명완료<br/>{formatDateShort(step.approved_at)}
                                                        </div>
                                                        <div className="mt-1 font-black text-[10px] font-black">{step.approver?.full_name}</div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <div className={`font-black border-2 border-dashed rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[10px] leading-tight rotate-[-15deg] uppercase italic font-black ${step.status === '반려' ? 'text-rose-500 border-rose-500' : 'text-slate-200 border-slate-100'}`}>
                                                            {step.status === '반려' ? `반려됨\n${formatDateShort(step.approved_at)}` : '대기중'}
                                                        </div>
                                                        <div className="mt-1 font-black text-[10px] text-black font-black">
                                                            {step.approver?.full_name}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 본문 내용 생략 (기존 유지) */}
                    <div className="space-y-12 text-black font-black font-sans font-black font-black">
                        <table className="w-full border-collapse border border-black text-[11px] font-black print-section">
                            <tbody>
                                <tr className="border-b border-black text-black font-black font-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase font-black font-black">기안부서</th>
                                    <td className="p-4 border-r border-black font-black font-black">{doc.requester_department}</td>
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase font-black font-black">성명/직위</th>
                                    <td className="p-4 font-black font-black font-black">{doc.requester_name} {doc.requester_position}</td>
                                </tr>
                            </tbody>
                        </table>

                        {isVisible('hourlyTasks') && formData.hourlyTasks && (
                            <section className="print-section font-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black font-black">01. 시간별 주요 업무 내역</h2>
                                <table className="w-full border-collapse border border-black text-[11px] font-black">
                                    <tbody>
                                        {Object.entries(formData.hourlyTasks).map(([time, task]) => (
                                            <tr key={time} className="border-b border-black last:border-0 font-black">
                                                <td className="bg-slate-50 w-32 p-3 text-center border-r border-black font-mono font-black font-black">{time}</td>
                                                <td className="p-3 font-black font-black">{task || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        )}

                        {isVisible('todayPlan') && formData.todayPlan && (
                            <section className="print-section font-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black font-black">02. 금일 업무 계획</h2>
                                <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[100px] whitespace-pre-wrap font-black font-black font-black font-black">{formData.todayPlan}</div>
                            </section>
                        )}

                        {isVisible('achievements') && formData.achievements && (
                            <section className="print-section font-black font-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black font-black">03. 상세 업무 실적</h2>
                                <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[200px] font-black font-black font-black font-black prose prose-sm max-w-none font-black font-black" dangerouslySetInnerHTML={{ __html: formData.achievements }}></div>
                            </section>
                        )}

                        {isVisible('gallery') && formData.galleryItems && formData.galleryItems.length > 0 && (
                            <section className="print-section font-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black font-black">04. 전/후 과정 비교</h2>
                                <div className="space-y-6 font-black font-black">
                                    {formData.galleryItems.map((item, idx) => (
                                        <div key={idx} className="border border-black p-5 bg-white font-black">
                                            <div className="grid grid-cols-2 gap-4 mb-4 font-black">
                                                <div className="space-y-2 text-center font-black">
                                                    <p className="text-[9px] uppercase text-slate-400 font-black font-black font-black font-black">BEFORE</p>
                                                    <div className="aspect-[4/3] bg-slate-50 border border-black/10 overflow-hidden cursor-zoom-in group relative font-black" onClick={() => setSelectedImg(item.before.url)}>
                                                        {item.before?.url ? (
                                                            <img src={item.before.url} alt="before" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 font-black" />
                                                        ) : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-300 font-black">-</div>}
                                                    </div>
                                                </div>
                                                <div className="space-y-2 text-center font-black">
                                                    <p className="text-[9px] uppercase text-blue-600 font-black font-black font-black font-black">AFTER</p>
                                                    <div className="aspect-[4/3] bg-slate-50 border border-black/10 overflow-hidden cursor-zoom-in group relative font-black" onClick={() => setSelectedImg(item.after.url)}>
                                                        {item.after?.url ? (
                                                            <img src={item.after.url} alt="after" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 font-black" />
                                                        ) : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-300 font-black font-black">-</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            {item.description && (
                                                <div className="p-3 bg-slate-50 text-[11px] font-black border-t border-black/5 leading-relaxed font-sans font-black font-black font-black font-black">{item.description}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {isVisible('issues') && formData.issues && (
                            <section className="print-section font-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black font-black text-red-600">05. 특이사항 및 문제점</h2>
                                <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[80px] whitespace-pre-wrap font-black bg-red-50/5 font-black font-black font-black">{formData.issues}</div>
                            </section>
                        )}

                        {isVisible('nextPlan') && (formData.nextPlan || formData.futurePlan) && (
                            <section className="print-section font-black font-black">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black font-black">06. 향후 업무 계획</h2>
                                <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[100px] whitespace-pre-wrap font-black bg-slate-50/10 font-black font-black font-black font-black">
                                    {formData.nextPlan || formData.futurePlan}
                                </div>
                            </section>
                        )}

                        <div className="pt-20 text-center space-y-6 print-section font-black font-black font-black font-black">
                            <div className="space-y-4 font-black font-black font-black">
                                <p className="text-[15px] font-black underline underline-offset-8 decoration-1 font-mono font-black font-black font-black font-black">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : '-'}</p>
                                <p className="text-2xl font-black uppercase tracking-[0.4em] mt-6 font-black font-sans font-black font-black font-black font-black">보고인: {doc.requester_name} (인)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-5 no-print font-black font-black font-black font-black">
                    {/* 관리자 문서번호 부여 (다른 문서와 동일) */}
                    {isReferrer && (
                        <div className="bg-white border border-black p-6 shadow-sm font-black text-black font-black">
                            <div className="flex flex-col gap-2 font-black font-black">
                                <p className="text-[9px] text-slate-400 mb-1 font-black uppercase font-black font-black font-black">※ 관리부 승인 후 문서번호를 부여해 주십시오.</p>
                                <div className="flex gap-2">
                                    <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value)} className="flex-1 border border-black px-3 py-1.5 text-[11px] outline-none font-black text-black focus:bg-slate-50 font-black font-black font-black font-black" placeholder="관리부 추후 부여" />
                                    <button onClick={handleUpdateDocNumber} className="bg-black text-white px-4 py-1.5 text-[10px] font-black hover:bg-slate-800 transition-all font-black font-black font-black font-black">반영</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🚀 결재 의견 및 참조인 (리스트 제거 및 다른 문서와 통일) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black font-black font-black font-black">
                        <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-100 pb-4 font-black">
                            <Users size={20} /><h2 className="text-[13px] uppercase font-black tracking-widest font-black font-black">결재 의견 및 참조인</h2>
                        </div>
                        <div className="space-y-4 font-black">
                            {approvalHistory?.map((step, idx) => step.comment && (
                                <div key={idx} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black font-black">
                                    <MessageSquare size={16} className="text-slate-400 flex-shrink-0 mt-1 font-black font-black font-black font-black" />
                                    <div className="font-black">
                                        <p className="text-[10px] text-slate-400 font-black mb-1 font-black font-black font-black font-black">{step.approver?.full_name} {step.approver?.position}</p>
                                        <p className="text-[12px] text-slate-700 leading-snug font-black font-black font-black font-black font-black">{step.comment}</p>
                                    </div>
                                </div>
                            ))}

                            {referrerHistory?.length > 0 && (
                                <div className="pt-4 border-t border-dashed border-slate-200 mt-4 font-black font-black">
                                    <p className="text-[10px] uppercase mb-2 font-black text-blue-600 tracking-widest font-black font-black font-black font-black">참조인</p>
                                    <div className="text-[11px] font-black text-blue-900 bg-blue-50/50 p-4 rounded-2xl leading-relaxed font-black font-black font-black font-black font-black">
                                        {referrerHistory.map((r, i) => (
                                            <span key={i} className="block mb-1 last:mb-0 font-black font-black font-black font-black font-black font-black">
                                                [{r.referrer?.department || '소속미정'}] {r.referrer?.full_name || r.referrer_name} {r.referrer?.position || ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-2xl p-6 shadow-xl text-white font-black font-black font-black font-black font-black font-black font-black font-black">
                            <h3 className="text-[11px] uppercase mb-4 font-black text-slate-400 font-black font-black font-black font-black font-black">결재 처리 요청</h3>
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] font-black outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500 font-black font-black font-black font-black font-black font-black font-black" placeholder="의견을 입력하십시오." />
                            <div className="grid grid-cols-2 gap-3 font-black font-black font-black font-black font-black">
                                <button onClick={() => handleApprovalAction('승인')} className="bg-white text-black py-3 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 font-black font-black font-black font-black font-black font-black"><CheckCircle size={14}/> 승인 처리</button>
                                <button onClick={() => handleApprovalAction('반려')} className="bg-rose-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><XCircle size={14}/> 반려 처리</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black font-black font-black font-black font-black font-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 text-black font-black font-black font-black font-black">
                            <h2 className="text-[11px] uppercase font-black flex items-center gap-2 font-black font-black font-black font-black font-black"><Paperclip size={14} /> 증빙 자료 및 첨부파일</h2>
                            <span className="text-[10px] text-slate-400 font-black font-black font-black font-black font-black">{attachmentSignedUrls.length} Files</span>
                        </div>
                        
                        {attachmentSignedUrls.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 font-black">
                                {attachmentSignedUrls.map((file, i) => (
                                    <div key={i} className="flex flex-col border border-slate-100 rounded-lg overflow-hidden bg-slate-50 shadow-sm font-black font-black font-black font-black font-black font-black">
                                        <div className="flex items-center justify-between p-2 bg-white border-b border-slate-100 font-black font-black font-black font-black font-black font-black">
                                            <div className="flex items-center gap-2 flex-1 truncate font-black font-black font-black font-black font-black font-black font-black">
                                                {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={14} className="text-blue-500 font-black font-black" /> : <FileText size={14} className="text-slate-400 font-black font-black" />}
                                                <span className="text-[10px] font-black truncate font-black font-black font-black font-black font-black">{file.name}</span>
                                            </div>
                                            <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-100 p-1 rounded bg-white border border-blue-100 font-black font-black font-black font-black">
                                                <Download size={14} />
                                            </a>
                                        </div>
                                        {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                            <div className="p-2 flex justify-center bg-slate-50 font-black font-black font-black font-black font-black cursor-zoom-in font-black font-black font-black font-black" onClick={() => setSelectedImg(file.url)}>
                                                <img src={file.url} alt={file.name} className="max-w-full h-auto rounded border border-white shadow-sm font-black font-black font-black font-black" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-xl font-black font-black font-black font-black font-black font-black font-black">
                                <Paperclip size={20} className="mx-auto text-slate-200 mb-2 font-black font-black font-black font-black font-black font-black" />
                                <p className="text-[10px] text-slate-300 font-black italic uppercase font-sans font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">No Attachments</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}