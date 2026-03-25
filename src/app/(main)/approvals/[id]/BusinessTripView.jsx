'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
    Printer, FileText, CheckCircle, XCircle, Hash, 
    Users, Loader2, Download, Paperclip, ImageIcon, MessageSquare, ShieldAlert
} from 'lucide-react';

export default function BusinessTripView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [currentStep, setCurrentStep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalComment, setApprovalComment] = useState('');
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);

    const isReferrer = referrerHistory?.some(ref => ref.referrer_id === employee?.id || ref.referrer?.id === employee?.id);
    const isMyTurn = employee && currentStep && currentStep.approver?.id === employee.id && currentStep.status === '대기';

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
                    const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
                    setFormData(content);
                    
                    const activeStep = approvalHistory?.find(s => s.status === '대기');
                    setCurrentStep(activeStep || null);

                    let rawAttachments = doc.attachments;
                    if (typeof rawAttachments === 'string') {
                        try { rawAttachments = JSON.parse(rawAttachments); } catch (e) { rawAttachments = []; }
                    }

                    if (rawAttachments && Array.isArray(rawAttachments) && rawAttachments.length > 0) {
                        const signedUrlPromises = rawAttachments.map(async (file) => {
                            if (!file) return null;
                            const rawPath = typeof file === 'object' ? file.path : file;
                            if (!rawPath) return null;

                            const cleanPath = rawPath.replace('approval_attachments/', '').trim();
                            const { data, error } = await supabase.storage
                                .from('approval_attachments')
                                .createSignedUrl(cleanPath, 3600);

                            if (!error && data?.signedUrl) {
                                return {
                                    url: data.signedUrl,
                                    name: typeof file === 'object' ? (file.name || cleanPath) : cleanPath
                                };
                            }
                            return null;
                        });

                        const results = await Promise.all(signedUrlPromises);
                        setAttachmentSignedUrls(results.filter(Boolean));
                    }
                } catch (e) { 
                    console.error("데이터 로드 중 오류:", e);
                } finally { 
                    setLoading(false); 
                }
            }
        };
        setupPage();
    }, [doc, approvalHistory]);

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep) return;
        setActionLoading(true);
        try {
            await supabase.from('approval_document_approvers').update({ 
                status: newStatus, 
                comment: approvalComment, 
                approved_at: new Date().toISOString() 
            }).eq('id', currentStep.id);
            const nextStep = approvalHistory.find(step => step.sequence === currentStep.sequence + 1);
            if (newStatus === '반려' || !nextStep) {
                await supabase.from('approval_documents').update({ 
                    status: newStatus === '반려' ? '반려' : '완료', 
                    completed_at: new Date().toISOString() 
                }).eq('id', doc.id);
            } else {
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('id', nextStep.id);
                await supabase.from('approval_documents').update({ 
                    status: '진행중', 
                    current_approver_id: nextStep.approver_id 
                }).eq('id', doc.id);
            }
            window.location.reload();
        } catch (e) { toast.error("처리 중 오류 발생"); } finally { setActionLoading(false); }
    };

    if (loading) return <div className="p-20 text-center font-black text-black text-xs font-sans italic animate-pulse uppercase">HANSUNG ERP LOADING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0 font-black">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 15mm 15mm; -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-container { width: 100% !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
                    .approval-table { border-collapse: collapse !important; width: auto !important; margin-left: auto !important; }
                    .approval-table th, .approval-table td { border: 1px solid black !important; }
                }
            `}} />
            
            <div className="w-full max-w-[1100px] mb-4 flex justify-end items-center no-print px-2 font-black">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg font-black font-black">
                    <Printer size={14} /> 인쇄 및 PDF 저장
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black text-black font-black font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container text-black font-black font-black font-black">
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8 font-black font-black font-black font-black">
                        <div className="space-y-2 font-black">
                            <h1 className="text-4xl font-black tracking-tighter uppercase font-black">출 장 신 청 서</h1>
                            <div className="flex flex-col text-[10px] space-y-1 font-black">
                                <span>문서번호 : {doc.document_number || formData.document_number || '-'}</span>
                                <span>작성일자 : {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 font-black">
                            <table className="approval-table border-collapse border border-black text-[11px] font-black font-black">
                                <tbody>
                                    <tr className="font-black">
                                        <th rowSpan="3" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvalHistory?.map((step) => (
                                            <th key={step.id} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black font-black">
                                                {step.approver?.position || '미지정'}
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
                                            <td key={step.id} className="border border-black p-1 text-center relative align-middle font-black">
                                                {step.status === '승인' || step.status === '완료' ? (
                                                    <>
                                                        <div className="text-rose-600 font-black border-2 border-rose-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto rotate-[-15deg] text-[10px] leading-tight font-black font-black">
                                                            서명완료<br/>{formatDateShort(step.approved_at)}
                                                        </div>
                                                        <div className="mt-1 font-black text-[10px] font-black font-black">{step.approver?.full_name}</div>
                                                    </>
                                                ) : step.status === '반려' ? (
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-rose-500 font-black border-2 border-dashed border-rose-500 rounded-full w-14 h-14 flex items-center justify-center mx-auto rotate-[-15deg] text-[10px] leading-tight font-black uppercase">
                                                            반려됨<br/>{formatDateShort(step.approved_at)}
                                                        </div>
                                                        <div className="mt-1 font-black text-[10px] text-black font-black">
                                                            {step.approver?.full_name}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-slate-200 font-black border-2 border-dashed border-slate-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] leading-tight uppercase italic font-black">
                                                            대기중
                                                        </div>
                                                        <div className="mt-1 font-black text-[10px] text-black font-black font-black">
                                                            {step.approver?.full_name || '미지정'}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                            {['진행중', 'pending', '대기'].includes(doc.status) && currentStep && (
                                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded text-[11px] font-black flex items-center gap-1.5 shadow-sm mt-2 no-print">
                                    <ShieldAlert size={12} /> 현재 <b>{currentStep.approver?.full_name} {currentStep.approver?.position}</b>님의 결재 대기 중
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-12 font-black">
                        <table className="w-full border-collapse border border-black text-[12px] font-black">
                            <tbody>
                                <tr className="border-b border-black font-black">
                                    <th className="bg-slate-50 p-5 w-32 text-left border-r border-black font-black uppercase">소속부서</th>
                                    <td className="p-5 border-r border-black font-black">{doc.requester_department}</td>
                                    <th className="bg-slate-50 p-5 w-32 text-left border-r border-black font-black uppercase font-black">성명/직위</th>
                                    <td className="p-5 font-black">{doc.requester_name} {doc.requester_position}</td>
                                </tr>
                                <tr className="border-b border-black font-black">
                                    <th className="bg-slate-50 p-5 text-left border-r border-black font-black uppercase font-black">보존기한</th>
                                    <td className="p-5 border-r border-black font-black">{formData.preservationPeriod || '5년'}</td>
                                    <th className="bg-slate-50 p-5 text-left border-r border-black font-black uppercase font-black font-black">문서상태</th>
                                    <td className="p-5 font-black text-blue-700 font-black">{doc.status}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="space-y-4 font-black">
                            <h2 className="text-[11px] uppercase font-black tracking-widest border-l-8 border-black pl-3 font-black">01. 출장 세부 계획</h2>
                            <table className="w-full border-collapse border border-black text-[12px] font-black font-black">
                                <tbody>
                                    <tr className="border-b border-black font-black font-black">
                                        <th className="bg-slate-50 p-5 w-32 text-left border-r border-black font-black">출장기간</th>
                                        <td className="p-5 font-mono font-black font-black">{formData.startDate} ~ {formData.endDate} ({formData.duration}일간)</td>
                                    </tr>
                                    <tr className="border-b border-black font-black">
                                        <th className="bg-slate-50 p-5 w-32 text-left border-r border-black font-black font-black font-black font-black">행선지</th>
                                        <td className="p-5 font-black font-black font-black font-black font-black">{formData.destination} (비상연락처: {formData.contact})</td>
                                    </tr>
                                    <tr className="border-b border-black font-black">
                                        <th className="bg-slate-50 p-5 w-32 text-left border-r border-black font-black font-black font-black font-black font-black">출장목적</th>
                                        <td className="p-5 h-40 align-top whitespace-pre-wrap leading-relaxed font-black font-black font-black">{formData.purpose}</td>
                                    </tr>
                                    <tr className="font-black font-black font-black">
                                        <th className="bg-slate-50 p-5 w-32 text-left border-r border-black font-black font-black">교통수단</th>
                                        <td className="p-5 font-black font-black">{formData.transportation} {formData.transportation === '차량' && ` (${formData.transportDetail}${formData.transportMemo ? `: ${formData.transportMemo}` : ''})`}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <div className="py-24 text-center space-y-12 font-black text-black">
                            <p className="text-[14px] font-black tracking-tight font-black">위와 같이 출장신청서를 제출하오니 승인하여 주시기 바랍니다.</p>
                            <div className="space-y-4 font-black">
                                <p className="text-[18px] font-black underline underline-offset-8 decoration-2 font-mono font-black font-black font-black">
                                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : '-'}
                                </p>
                                <p className="text-3xl font-black uppercase tracking-[0.5em] mt-10 font-black font-black font-black font-black font-black">신청인: {doc.requester_name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-5 no-print font-black font-black">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-black font-black font-black font-black font-black">
                        <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-100 pb-4 font-black font-black font-black font-black font-black">
                            <Users size={20} /><h2 className="text-[13px] uppercase font-black tracking-widest font-black font-black font-black font-black font-black">결재 의견 및 참조인</h2>
                        </div>
                        <div className="space-y-4 font-black font-black font-black font-black">
                            {approvalHistory?.map((step) => step.comment && (
                                <div key={step.id} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black font-black font-black font-black font-black font-black font-black">
                                    <MessageSquare size={16} className="text-slate-400 flex-shrink-0 mt-1 font-black" />
                                    <div className="font-black">
                                        <p className="text-[10px] text-slate-400 font-black mb-1 font-black font-black font-black font-black font-black font-black font-black">{step.approver?.full_name || step.approver_name} {step.approver?.position}</p>
                                        <p className="text-[12px] text-slate-700 leading-snug font-black font-black font-black font-black font-black font-black font-black font-black">{step.comment}</p>
                                    </div>
                                </div>
                            ))}
                            {referrerHistory?.length > 0 && (
                                <div className="pt-4 border-t border-dashed border-slate-200 mt-4 font-black font-black font-black font-black font-black">
                                    <p className="text-[10px] uppercase mb-2 font-black text-blue-600 tracking-widest font-black font-black font-black font-black font-black">참조인</p>
                                    <div className="text-[11px] font-black text-blue-900 bg-blue-50/50 p-4 rounded-2xl leading-relaxed font-black font-black font-black font-black font-black">
                                        {referrerHistory.map((r, i) => (
                                            <span key={i} className="block mb-1 last:mb-0 font-black font-black font-black font-black">
                                                [{r.referrer?.department || '소속미정'}] {r.referrer?.full_name || r.referrer_name} {r.referrer?.position || ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-3xl p-8 shadow-2xl text-white font-black font-black font-black font-black font-black font-black">
                            <h3 className="text-[13px] uppercase mb-6 font-black tracking-widest text-slate-400 font-black font-black font-black font-black font-black">결재 처리 요청</h3>
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-5 text-[13px] font-black outline-none mb-6 h-32 focus:border-white transition-all text-white placeholder-slate-500 font-black font-black font-black font-black font-black" placeholder="결재 의견을 입력하십시오." />
                            <div className="grid grid-cols-2 gap-4 font-black font-black font-black font-black font-black font-black font-black">
                                <button onClick={() => handleApprovalAction('승인')} className="bg-white text-black py-4 rounded-2xl text-[12px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg font-black font-black font-black font-black font-black"><CheckCircle size={18}/> 승인 처리</button>
                                <button onClick={() => handleApprovalAction('반려')} className="bg-rose-600 text-white py-4 rounded-2xl text-[12px] font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg font-black font-black font-black font-black font-black font-black"><XCircle size={18}/> 반려 처리</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm font-black font-black font-black font-black font-black">
                        <div className="flex items-center justify-between mb-6 border-b-2 border-slate-100 pb-4 font-black font-black font-black font-black font-black font-black">
                            <h2 className="text-[13px] uppercase font-black tracking-widest flex items-center gap-2 font-black font-black font-black font-black font-black font-black font-black"><Paperclip size={20} /> 첨부 증빙 서류</h2>
                            <span className="text-[12px] text-slate-400 font-black font-black font-black font-black font-black font-black font-black">{attachmentSignedUrls.length}</span>
                        </div>
                        {attachmentSignedUrls.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 font-black font-black font-black font-black font-black">
                                {attachmentSignedUrls.map((file, i) => (
                                    <div key={i} className="flex flex-col border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 shadow-sm font-black font-black font-black font-black font-black">
                                        <div className="flex items-center justify-between p-4 bg-white border-b border-slate-100 font-black font-black font-black font-black font-black">
                                            <div className="flex items-center gap-3 flex-1 truncate font-black font-black font-black font-black font-black font-black">
                                                {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={18} className="text-blue-500 font-black font-black font-black" /> : <FileText size={18} className="text-slate-400 font-black font-black font-black font-black" />}
                                                <span className="text-[12px] font-black truncate font-black font-black font-black font-black font-black font-black">{file.name}</span>
                                            </div>
                                            <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-xl transition-colors shadow-sm font-black font-black font-black font-black font-black font-black">
                                                <Download size={18} />
                                            </a>
                                        </div>
                                        {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                            <div className="p-4 flex justify-center bg-slate-50 font-black font-black font-black font-black font-black font-black font-black">
                                                <img src={file.url} alt={file.name} className="max-w-full h-auto rounded-xl border-4 border-white shadow-md font-black font-black font-black font-black font-black" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                                <Paperclip size={32} className="mx-auto text-slate-200 mb-3 font-black font-black font-black font-black font-black font-black font-black font-black font-black" />
                                <p className="text-[12px] text-slate-300 font-black italic uppercase font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">No Attachments</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}