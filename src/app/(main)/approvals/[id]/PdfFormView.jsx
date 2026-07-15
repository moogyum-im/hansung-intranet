'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import {
    Printer, Download, FileText, Paperclip,
    CheckCircle, XCircle, Users, MessageSquare, ShieldAlert
} from 'lucide-react';

export default function PdfFormView({ doc, employee, approvalHistory, referrerHistory }) {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalComment, setApprovalComment] = useState('');
    const [currentStep, setCurrentStep] = useState(null);
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);
    const [printWithOpinions, setPrintWithOpinions] = useState(false);

    const isMyTurn = employee && currentStep &&
        currentStep.approver?.id === employee.id &&
        (currentStep.status === 'pending' || currentStep.status === '대기');

    const formatDateShort = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    };

    useEffect(() => {
        const setup = async () => {
            if (!doc) return;
            try {
                const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content || {};
                setFormData(content);
                setCurrentStep(approvalHistory?.find(s => s.status === 'pending' || s.status === '대기'));

                let rawFiles = doc.attachments;
                if (typeof rawFiles === 'string') { try { rawFiles = JSON.parse(rawFiles); } catch { rawFiles = []; } }

                if (rawFiles?.length > 0) {
                    const results = await Promise.all(rawFiles.map(async (file) => {
                        if (!file) return null;
                        const filePath = typeof file === 'object' ? file.path : file;
                        if (!filePath) return null;
                        const cleanPath = filePath.replace('approval_attachments/', '').trim();
                        const { data, error } = await supabase.storage.from('approval_attachments').createSignedUrl(cleanPath, 3600);
                        if (!error && data?.signedUrl) {
                            return { url: data.signedUrl, name: typeof file === 'object' ? (file.name || cleanPath) : cleanPath, path: cleanPath };
                        }
                        return null;
                    }));
                    setAttachmentSignedUrls(results.filter(Boolean));
                }
            } catch (e) { console.error('PdfFormView 로드 오류:', e); } finally { setLoading(false); }
        };
        setup();
    }, [doc, approvalHistory]);

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep || (newStatus === '반려' && !approvalComment.trim())) return toast.error('반려 사유를 입력해주세요.');
        setActionLoading(true);
        try {
            await supabase.from('approval_document_approvers')
                .update({ status: newStatus, comment: approvalComment, approved_at: new Date().toISOString() })
                .eq('id', currentStep.id);
            const nextStep = approvalHistory.find(s => s.sequence === currentStep.sequence + 1);
            if (newStatus === '반려' || !nextStep) {
                await supabase.from('approval_documents')
                    .update({ status: newStatus === '반려' ? '반려' : '완료', completed_at: new Date().toISOString() })
                    .eq('id', doc.id);
            } else {
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('id', nextStep.id);
                await supabase.from('approval_documents')
                    .update({ status: '진행중', current_approver_id: nextStep.approver_id })
                    .eq('id', doc.id);
            }
            window.location.reload();
        } catch { toast.error('처리 실패'); } finally { setActionLoading(false); }
    };

    if (loading) return <div className="p-20 text-center font-black text-xs animate-pulse italic uppercase">HANSUNG ERP LOADING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0 !important; padding: 0 !important; background: white !important; }
                    .no-print, nav, header, aside { display: none !important; }
                    .print-container { width: 210mm !important; margin: 0 auto !important; padding: 20mm 15mm !important; border: none !important; box-shadow: none !important; }
                }
            `}} />

            <div className="w-full max-w-[1100px] mb-4 flex justify-end items-center gap-4 no-print px-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-600">
                    <input type="checkbox" checked={printWithOpinions} onChange={e => setPrintWithOpinions(e.target.checked)} className="w-3.5 h-3.5 accent-slate-700" />
                    결재 의견 포함
                </label>
                <button onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] font-black shadow-lg">
                    <Printer size={14} /> 인쇄 및 PDF 저장
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 문서 본문 */}
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm print-container">
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black tracking-tighter uppercase">서 식 결 재</h1>
                            <div className="flex flex-col text-[10px] space-y-1">
                                <span>작성일자 : {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <table className="border-collapse border border-black text-[11px]">
                                <tbody>
                                    <tr>
                                        <th rowSpan="2" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvalHistory?.map(step => (
                                            <th key={step.id} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black">
                                                {step.approver?.position || '결재'}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="h-20">
                                        <td className="border border-black p-1 text-center align-middle">
                                            <div className="text-rose-600 font-black border-2 border-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto opacity-70 rotate-[-15deg] text-[9px] leading-tight font-black">
                                                서명완료<br/>{formatDateShort(doc.created_at)}
                                            </div>
                                            <div className="mt-1 text-[9px] font-black">{doc.requester_name}</div>
                                        </td>
                                        {approvalHistory?.map(step => (
                                            <td key={step.id} className="border border-black p-1 text-center align-middle">
                                                {step.status === '승인' || step.status === '완료' ? (
                                                    <>
                                                        <div className="text-rose-600 border-2 border-rose-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto rotate-[-15deg] text-[10px] leading-tight font-black">
                                                            서명완료<br/>{formatDateShort(step.approved_at)}
                                                        </div>
                                                        <div className="mt-1 text-[10px] font-black">{step.approver?.full_name}</div>
                                                    </>
                                                ) : step.status === '반려' ? (
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-rose-500 border-2 border-dashed border-rose-500 rounded-full w-14 h-14 flex items-center justify-center mx-auto rotate-[-15deg] text-[10px] leading-tight font-black uppercase">
                                                            반려됨<br/>{formatDateShort(step.approved_at)}
                                                        </div>
                                                        <div className="mt-1 text-[10px] font-black">{step.approver?.full_name}</div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-slate-200 border-2 border-dashed border-slate-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] italic uppercase font-black">대기중</div>
                                                        <div className="mt-1 text-[10px] font-black">{step.approver?.full_name || '미지정'}</div>
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                            {['진행중', 'pending', '대기'].includes(doc.status) && currentStep && (
                                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded text-[11px] font-black flex items-center gap-1.5 mt-2 no-print">
                                    <ShieldAlert size={12} /> 현재 <b>{currentStep.approver?.full_name} {currentStep.approver?.position}</b>님의 결재 대기 중
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-10">
                        {/* 기안자 정보 */}
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <tbody>
                                <tr className="border-b border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">기안부서</th>
                                    <td className="p-4 border-r border-black">{doc.requester_department}</td>
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">기안자</th>
                                    <td className="p-4">{doc.requester_name} {doc.requester_position}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* 제목 */}
                        <section>
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">01. 문서 제목</h2>
                            <div className="border border-black p-5 text-[14px] font-black bg-slate-50/20">{doc.title}</div>
                        </section>

                        {/* 첨부 서류 인라인 뷰어 */}
                        <section>
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">02. 첨부 서류</h2>
                            {attachmentSignedUrls.length > 0 ? (
                                <div className="border border-black">
                                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-black/10 no-print">
                                        <div className="flex items-center gap-2">
                                            <FileText size={13} className="text-slate-500 shrink-0" />
                                            <span className="text-[11px] font-black truncate">{attachmentSignedUrls[0].name}</span>
                                        </div>
                                        <a href={attachmentSignedUrls[0].url} download={attachmentSignedUrls[0].name} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-1 px-3 py-1 border border-black text-[10px] font-black hover:bg-black hover:text-white transition-all shrink-0 ml-3">
                                            <Download size={11} /> 다운로드
                                        </a>
                                    </div>
                                    <iframe
                                        src={attachmentSignedUrls[0].url}
                                        className="w-full"
                                        style={{ height: '80vh' }}
                                        title="첨부 서류 PDF"
                                    />
                                    {attachmentSignedUrls.length > 1 && (
                                        <div className="border-t border-black/10 p-3 space-y-1 bg-slate-50 no-print">
                                            {attachmentSignedUrls.slice(1).map((file, i) => (
                                                <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-white border border-slate-200 rounded text-[11px]">
                                                    <span className="font-black truncate">{file.name}</span>
                                                    <a href={file.url} download={file.name} target="_blank" rel="noreferrer"
                                                        className="flex items-center gap-1 px-2 py-0.5 border border-black text-[10px] font-black hover:bg-black hover:text-white transition-all shrink-0 ml-2">
                                                        <Download size={11} /> 다운로드
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="border border-dashed border-slate-200 p-8 text-center text-[11px] text-slate-300">첨부 파일 없음</div>
                            )}
                        </section>

                        {/* 비고 */}
                        {formData.note && (
                            <section>
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">03. 비고 / 전달 사항</h2>
                                <div className="border border-black p-5 text-[13px] leading-relaxed whitespace-pre-wrap font-medium">{formData.note}</div>
                            </section>
                        )}

                        <div className="pt-10 text-center">
                            <p className="text-xl font-black uppercase tracking-widest">
                                기안자: {doc.requester_name} (인)
                            </p>
                        </div>

                        {printWithOpinions && (approvalHistory?.some(s => s.comment) || referrerHistory?.length > 0) && (
                            <div className="mt-10 pt-8 border-t-2 border-black">
                                <h2 className="text-[11px] font-black uppercase tracking-widest border-l-4 border-black pl-2 mb-5">결재 의견 및 참조인</h2>
                                <div className="space-y-3">
                                    {approvalHistory?.filter(s => s.comment).map((step, idx) => (
                                        <div key={idx} className="border border-slate-300 p-3 text-[12px]">
                                            <p className="text-[10px] text-slate-500 font-bold mb-1">{step.approver?.full_name} {step.approver?.position}</p>
                                            <p className="font-black leading-snug">{step.comment}</p>
                                        </div>
                                    ))}
                                    {referrerHistory?.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-dashed border-slate-400">
                                            <p className="text-[10px] font-black uppercase mb-2 text-blue-700 tracking-widest">참조인</p>
                                            {referrerHistory.map((r, i) => (
                                                <p key={i} className="text-[11px] font-black">[{r.referrer?.department || '소속미정'}] {r.referrer?.full_name} {r.referrer?.position || ''}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 오른쪽 사이드바 */}
                <aside className="lg:col-span-4 space-y-5 no-print">
                    {/* 결재 의견 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-100 pb-4">
                            <Users size={20} />
                            <h2 className="text-[13px] uppercase font-black tracking-widest">결재 의견 및 참조인</h2>
                        </div>
                        <div className="space-y-4">
                            {approvalHistory?.map((step, idx) => step.comment && (
                                <div key={idx} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <MessageSquare size={16} className="text-slate-400 shrink-0 mt-1" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black mb-1">{step.approver?.full_name} {step.approver?.position}</p>
                                        <p className="text-[12px] text-slate-700 leading-snug font-black">{step.comment}</p>
                                    </div>
                                </div>
                            ))}
                            {referrerHistory?.length > 0 && (
                                <div className="pt-4 border-t border-dashed border-slate-200">
                                    <p className="text-[10px] uppercase mb-2 font-black text-blue-600 tracking-widest">참조인</p>
                                    <div className="text-[11px] font-black text-blue-900 bg-blue-50/50 p-4 rounded-2xl leading-relaxed">
                                        {referrerHistory.map((r, i) => (
                                            <span key={i} className="block mb-1 last:mb-0">
                                                [{r.referrer?.department || '소속미정'}] {r.referrer?.full_name || r.referrer_name} {r.referrer?.position || ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 결재 처리 버튼 */}
                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-2xl p-6 shadow-xl text-white font-black">
                            <h3 className="text-[11px] uppercase mb-4 text-slate-400 font-black">결재 처리 요청</h3>
                            <textarea
                                value={approvalComment}
                                onChange={e => setApprovalComment(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] font-black outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500"
                                placeholder="승인 또는 반려 의견을 입력하십시오."
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleApprovalAction('승인')} disabled={actionLoading}
                                    className="bg-white text-black py-3 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    <CheckCircle size={14} /> 승인 처리
                                </button>
                                <button onClick={() => handleApprovalAction('반려')} disabled={actionLoading}
                                    className="bg-rose-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    <XCircle size={14} /> 반려 처리
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 첨부 파일 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                            <h2 className="text-[13px] uppercase font-black flex items-center gap-2"><Paperclip size={14} /> 첨부 서류</h2>
                            <span className="text-[10px] text-slate-400">{attachmentSignedUrls.length} Files</span>
                        </div>
                        {attachmentSignedUrls.length > 0 ? (
                            <div className="space-y-2">
                                {attachmentSignedUrls.map((file, i) => (
                                    <div key={i} className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50">
                                        <div className="flex items-center justify-between p-2 bg-white border-b border-slate-100">
                                            <div className="flex items-center gap-2 flex-1 truncate">
                                                <FileText size={14} className="text-slate-400 shrink-0" />
                                                <span className="text-[10px] font-black truncate">{file.name}</span>
                                            </div>
                                            <a href={file.url} download={file.name} target="_blank" rel="noreferrer"
                                                className="text-blue-600 hover:bg-blue-100 p-1 rounded bg-white border border-blue-200 shrink-0">
                                                <Download size={14} />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-xl">
                                <Paperclip size={20} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-[10px] text-slate-300 italic uppercase">No Attachments</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
