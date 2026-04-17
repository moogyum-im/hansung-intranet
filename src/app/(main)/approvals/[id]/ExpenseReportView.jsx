'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
    Printer, FileText, CheckCircle, XCircle, Hash, 
    Users, Loader2, Download, ChevronRight, Settings, Paperclip, ImageIcon, ExternalLink, CreditCard, MessageSquare, ShieldAlert
} from 'lucide-react';

export default function ExpenseReportView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalComment, setApprovalComment] = useState('');
    const [currentStep, setCurrentStep] = useState(null);
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);

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
                    const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
                    setFormData(content || {});
                    setCurrentStep(approvalHistory?.find(s => s.status === 'pending' || s.status === '대기'));

                    let rawFiles = doc.attachments || content?.attachments || [];
                    if (typeof rawFiles === 'string') {
                        try { rawFiles = JSON.parse(rawFiles); } catch (e) { rawFiles = []; }
                    }

                    if (rawFiles && Array.isArray(rawFiles) && rawFiles.length > 0) {
                        const signedUrlPromises = rawFiles.map(async (file) => {
                            if (!file) return null;
                            let filePath = typeof file === 'object' ? file.path : file;
                            if (!filePath) return null;

                            const cleanPath = filePath.replace('approval_attachments/', '').trim();
                            const { data, error } = await supabase.storage
                                .from('approval_attachments') 
                                .createSignedUrl(cleanPath, 3600);

                            if (!error && data?.signedUrl) {
                                return { url: data.signedUrl, name: (file.name || cleanPath).trim() };
                            }
                            return null;
                        });
                        const results = await Promise.all(signedUrlPromises);
                        setAttachmentSignedUrls(results.filter(Boolean));
                    }
                } catch (e) { console.error("데이터 로드 오류:", e); } finally { setLoading(false); }
            }
        };
        setupPage();
    }, [doc, approvalHistory]);

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep) return;
        if (newStatus === '반려' && !approvalComment.trim()) return toast.error("반려 사유 필수");
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
        } catch (error) { toast.error("처리 중 오류"); } finally { setActionLoading(false); }
    };

    if (loading) return <div className="p-20 text-center font-black text-black text-xs font-sans animate-pulse italic uppercase">HANSUNG ERP LOADING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0 font-black">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
                    .no-print, nav, header, aside, .sidebar { display: none !important; }
                    .print-container { width: 210mm !important; margin: 0 auto !important; padding: 20mm 15mm !important; border: none !important; box-shadow: none !important; box-sizing: border-box !important; }
                    .approval-table { border-collapse: collapse !important; width: auto !important; margin-left: auto !important; }
                    .approval-table th, .approval-table td { border: 1px solid black !important; }
                    table { border-collapse: collapse !important; border: 1px solid black !important; width: 100% !important; }
                    th, td { border: 1px solid black !important; padding: 10px !important; }
                    .print-section { page-break-inside: avoid !important; break-inside: avoid-page !important; }
                }
            `}} />
            
            <div className="w-full max-w-[1100px] mb-4 flex justify-end items-center no-print px-2 font-black">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg"><Printer size={14} /> 인쇄 및 PDF 저장</button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black text-black font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container text-black font-black">
                    
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8 font-black">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black tracking-tighter uppercase font-black">지 출 결 의 서</h1>
                            <div className="flex flex-col text-[10px] mt-4 space-y-1 font-black">
                                <span>문서번호 : {doc.document_number || formData.document_number || '-'}</span>
                                <span>작성일자 : {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 font-black">
                            <table className="approval-table border-collapse border border-black text-[11px] font-black">
                                <tbody>
                                    <tr className="font-black">
                                        <th rowSpan="3" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight font-black">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvalHistory?.map((step) => (
                                            <th key={step.id} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black">
                                                {step.approver?.position || '미지정'}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="h-20 font-black">
                                        <td className="border border-black p-1 text-center relative align-middle font-black">
                                            <div className="text-rose-600 font-black border-2 border-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto opacity-70 rotate-[-15deg] text-[9px] leading-tight font-black">
                                                서명완료<br/>{formatDateShort(doc.created_at)}
                                            </div>
                                            <div className="mt-1 font-black text-[9px] font-black font-black">{doc.requester_name}</div>
                                        </td>
                                        {approvalHistory?.map((step) => (
                                            <td key={step.id} className="border border-black p-1 text-center relative align-middle font-black">
                                                {step.status === '승인' || step.status === '완료' ? (
                                                    <>
                                                        <div className="text-rose-600 font-black border-2 border-rose-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto rotate-[-15deg] text-[10px] leading-tight font-black">
                                                            서명완료<br/>{formatDateShort(step.approved_at)}
                                                        </div>
                                                        <div className="mt-1 font-black text-[10px] font-black">{step.approver?.full_name}</div>
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
                            {doc.status === '진행중' && currentStep && (
                                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded text-[11px] font-black flex items-center gap-1.5 shadow-sm mt-2 no-print">
                                    <ShieldAlert size={12} /> 현재 <b>{currentStep.approver?.full_name} {currentStep.approver?.position}</b>님의 결재를 기다리고 있습니다.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-12 text-black font-black">
                        <table className="w-full border-collapse border border-black text-[11px] font-black print-section font-black">
                            <tbody>
                                <tr className="border-b border-black text-black font-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">지출 제목</th>
                                    <td colSpan="3" className="p-4 font-black">{formData.subject || '-'}</td>
                                </tr>
                                <tr className="border-b border-black text-black font-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">기안부서</th>
                                    <td className="p-4 border-r border-black font-black">{doc.requester_department}</td>
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">기안자</th>
                                    <td className="p-4 font-black">{doc.requester_name} {doc.requester_position}</td>
                                </tr>
                                <tr className="border-b border-black text-black font-black">
                                    <th className="bg-slate-50 p-4 text-left border-r border-black font-black uppercase">지출금액</th>
                                    <td className="p-4 border-r border-black font-black text-blue-700 font-mono font-black">
                                        ₩{Number(formData.amount).toLocaleString()}
                                    </td>
                                    <th className="bg-slate-50 p-4 text-left border-r border-black font-black uppercase">문서번호</th>
                                    <td className="p-4 font-black font-mono font-black">{doc.document_number || formData.document_number || '-'}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="print-section font-black text-black">
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">01. 지출 정보 상세</h2>
                            <table className="w-full border-collapse border border-black text-[11px] font-black">
                                <tbody>
                                    <tr className="border-b border-black text-black font-black">
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black">지출일자</th>
                                        <td className="p-4 border-r border-black font-mono font-black font-black">{formData.expenseDate}</td>
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black">결제수단</th>
                                        <td className="p-4 font-black">
                                            <div className="flex items-center gap-2 font-black">
                                                {formData.paymentMethod}
                                                {formData.paymentMethod === '법인카드' && formData.cardNumberLastFour && (
                                                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 font-black">
                                                        (<CreditCard size={10} /> ****-****-****-{formData.cardNumberLastFour})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="print-section font-black text-black font-black w-full max-w-full">
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">02. 상세 내역 (적요)</h2>
                            {/* 🚀 뷰(View) 컨테이너에도 에디터와 동일한 테이블 제어 CSS (overflow-x-auto 및 강제 비율) 주입 */}
                            <div 
                                className="border border-black p-5 text-[13px] leading-relaxed min-h-[250px] whitespace-pre-wrap font-black break-words overflow-x-auto w-full box-border [&_table]:!w-full [&_table]:!max-w-full [&_table]:!table-fixed [&_table]:!border-collapse [&_table]:my-2 [&_table]:text-[11px] [&_td]:!border [&_td]:!border-slate-400 [&_td]:!p-2 [&_td]:!break-all [&_td]:!whitespace-normal [&_th]:!border [&_th]:!border-slate-400 [&_th]:!p-2 [&_th]:!bg-slate-100 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md"
                                dangerouslySetInnerHTML={{ __html: formData.description || '' }}
                            />
                        </section>

                        <div className="pt-16 text-center space-y-6 print-section font-black text-black font-black">
                            <div className="space-y-4 font-black">
                                <p className="text-[15px] font-black underline underline-offset-8 decoration-1 font-mono font-black">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : '-'}</p>
                                <p className="text-2xl font-black uppercase tracking-[0.4em] mt-6 font-black font-black">기안자: {doc.requester_name} (인)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-5 no-print font-black font-black">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black">
                        <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-100 pb-4 font-black">
                            <Users size={20} /><h2 className="text-[13px] uppercase font-black tracking-widest font-black">결재 의견 및 참조인</h2>
                        </div>
                        <div className="space-y-4 font-black">
                            {approvalHistory?.map((step, idx) => step.comment && (
                                <div key={idx} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black font-black">
                                    <MessageSquare size={16} className="text-slate-400 flex-shrink-0 mt-1 font-black" />
                                    <div className="font-black">
                                        <p className="text-[10px] text-slate-400 font-black mb-1 font-black">{step.approver?.full_name} {step.approver?.position}</p>
                                        <p className="text-[12px] text-slate-700 leading-snug font-black">{step.comment}</p>
                                    </div>
                                </div>
                            ))}
                            {referrerHistory?.length > 0 && (
                                <div className="pt-4 border-t border-dashed border-slate-200 mt-4 font-black">
                                    <p className="text-[10px] uppercase mb-2 font-black text-blue-600 tracking-widest font-black">참조인</p>
                                    <div className="text-[11px] font-black text-blue-900 bg-blue-50/50 p-4 rounded-2xl leading-relaxed font-black font-black">
                                        {referrerHistory.map((r, i) => (
                                            <span key={i} className="block mb-1 last:mb-0 font-black">
                                                [{r.referrer?.department || '소속미정'}] {r.referrer?.full_name || r.referrer_name} {r.referrer?.position || ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-2xl p-6 shadow-xl text-white font-black">
                            <h3 className="text-[11px] uppercase mb-4 font-black text-slate-400 font-black">결재 처리 요청</h3>
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] font-black outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500 font-black" placeholder="승인 또는 반려 의견을 입력하십시오." />
                            <div className="grid grid-cols-2 gap-3 font-black">
                                <button onClick={() => handleApprovalAction('승인')} className="bg-white text-black py-3 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 font-black font-black"><CheckCircle size={14}/> 승인 처리</button>
                                <button onClick={() => handleApprovalAction('반려')} className="bg-rose-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2 font-black font-black"><XCircle size={14}/> 반려 처리</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 text-black font-black">
                            <h2 className="text-[13px] uppercase font-black flex items-center gap-2 font-black font-black"><Paperclip size={14} /> 지출 증빙 및 영수증</h2>
                            <span className="text-[12px] text-slate-400 font-black">{attachmentSignedUrls.length} Files</span>
                        </div>
                        {attachmentSignedUrls.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 font-black">
                                {attachmentSignedUrls.map((file, i) => (
                                    <div key={i} className="flex flex-col border border-slate-100 rounded-lg overflow-hidden bg-slate-50 shadow-sm font-black">
                                        <div className="flex items-center justify-between p-2 bg-white border-b border-slate-100 font-black">
                                            <div className="flex items-center gap-2 flex-1 truncate font-black">
                                                {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={14} className="text-blue-500 font-black" /> : <FileText size={14} className="text-slate-400 font-black" />}
                                                <span className="text-[10px] font-black truncate font-black">{file.name}</span>
                                            </div>
                                            <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors shadow-sm bg-white border border-blue-100 font-black">
                                                <Download size={14} />
                                            </a>
                                        </div>
                                        {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                            <div className="p-2 flex justify-center bg-slate-50 font-black">
                                                <img src={file.url} alt={file.name} className="max-w-full h-auto rounded border border-white shadow-sm font-black" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-xl font-black">
                                <Paperclip size={20} className="mx-auto text-slate-200 mb-2 font-black" />
                                <p className="text-[10px] text-slate-300 font-black italic uppercase font-black">No Receipts</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}