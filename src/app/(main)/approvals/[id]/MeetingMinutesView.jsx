'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Printer, Download, FileText, CheckCircle, XCircle,
    Users, Paperclip, MessageSquare, ShieldAlert
} from 'lucide-react';

export default function MeetingMinutesView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalComment, setApprovalComment] = useState('');
    const [printWithOpinions, setPrintWithOpinions] = useState(false);
    const [currentStep, setCurrentStep] = useState(null);
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);

    const isReferrer = referrerHistory?.some(ref => ref.referrer_id === employee?.id || ref.referrer?.id === employee?.id);
    const isMyTurn = employee && currentStep && currentStep.approver?.id === employee.id && (currentStep.status === 'pending' || currentStep.status === '대기');

    const formatDateShort = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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
                if (rawFiles?.length) {
                    const unique = rawFiles.filter((f, i, self) => {
                        const p = typeof f === 'object' ? f.path : f;
                        return p && self.findIndex(x => (typeof x === 'object' ? x.path : x) === p) === i;
                    });
                    const results = await Promise.all(unique.map(async (file) => {
                        const path = (typeof file === 'object' ? file.path : file)?.replace('approval_attachments/', '').trim();
                        if (!path) return null;
                        const { data, error } = await supabase.storage.from('approval_attachments').createSignedUrl(path, 3600);
                        return error ? null : { url: data.signedUrl, name: file.name || path, path };
                    }));
                    setAttachmentSignedUrls(results.filter(Boolean));
                }
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        setup();
    }, [doc, approvalHistory]);

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep || (newStatus === '반려' && !approvalComment.trim())) return toast.error("반려 사유 필수");
        setActionLoading(true);
        try {
            await supabase.from('approval_document_approvers').update({ status: newStatus, comment: approvalComment, approved_at: new Date().toISOString() }).eq('id', currentStep.id);
            const nextStep = approvalHistory.find(s => s.sequence === currentStep.sequence + 1);
            if (newStatus === '반려' || !nextStep) {
                await supabase.from('approval_documents').update({ status: newStatus === '반려' ? '반려' : '완료', completed_at: new Date().toISOString() }).eq('id', doc.id);
            } else {
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('id', nextStep.id);
                await supabase.from('approval_documents').update({ status: '진행중', current_approver_id: nextStep.approver_id }).eq('id', doc.id);
            }
            window.location.reload();
        } catch { toast.error("처리 실패"); } finally { setActionLoading(false); }
    };

    if (loading) return <div className="p-20 text-center font-black text-black text-xs animate-pulse uppercase">HANSUNG ERP LOADING...</div>;

    const agendaItems = Array.isArray(formData.agenda_items) ? formData.agenda_items : [];
    const attendees = Array.isArray(formData.attendees) ? formData.attendees.filter(Boolean) : [];

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0 !important; padding: 0 !important; background: white !important; }
                    .no-print, nav, header, aside, .sidebar { display: none !important; }
                    .print-container { width: 210mm !important; margin: 0 auto !important; padding: 20mm 15mm !important; border: none !important; box-shadow: none !important; box-sizing: border-box !important; }
                    .approval-table th, .approval-table td { border: 1px solid black !important; }
                    .print-section { page-break-inside: avoid !important; break-inside: avoid-page !important; }
                }
            `}} />

            <div className="w-full max-w-[1100px] mb-4 flex justify-end items-center gap-4 no-print px-2 font-black">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-600">
                    <input type="checkbox" checked={printWithOpinions} onChange={e => setPrintWithOpinions(e.target.checked)} className="w-3.5 h-3.5 accent-slate-700" />
                    결재 의견 포함
                </label>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg">
                    <Printer size={14} /> 인쇄 및 PDF 저장
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-black">
                {/* 본문 */}
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container text-black font-black">

                    {/* 헤더 */}
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8 print-section">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black tracking-tighter uppercase">회 의 록</h1>
                            <div className="flex flex-col text-[10px] space-y-1 font-black">
                                <span>문서번호 : {doc.document_number || formData.document_number || '-'}</span>
                                <span>작성일자 : {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                            </div>
                        </div>
                        <div className="flex">
                            <table className="approval-table border-collapse border border-black text-[11px] font-black">
                                <tbody>
                                    <tr>
                                        <th rowSpan="3" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvalHistory?.map((step) => (
                                            <th key={step.id} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black">{step.approver?.position || '미지정'}</th>
                                        ))}
                                    </tr>
                                    <tr className="h-20">
                                        <td className="border border-black p-1 text-center align-middle font-black">
                                            <div className="text-rose-600 border-2 border-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto opacity-70 rotate-[-15deg] text-[9px] leading-tight">서명완료<br/>{formatDateShort(doc.created_at)}</div>
                                            <div className="mt-1 text-[9px] font-black">{doc.requester_name}</div>
                                        </td>
                                        {approvalHistory?.map((step) => (
                                            <td key={step.id} className="border border-black p-1 text-center align-middle font-black">
                                                {step.status === '승인' || step.status === '완료' ? (
                                                    <>
                                                        <div className="text-rose-600 border-2 border-rose-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto rotate-[-15deg] text-[10px] leading-tight">승인<br/>{formatDateShort(step.approved_at)}</div>
                                                        <div className="mt-1 text-[10px] font-black">{step.approver?.full_name}</div>
                                                    </>
                                                ) : step.status === '반려' ? (
                                                    <>
                                                        <div className="text-slate-400 border-2 border-slate-400 border-dashed rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[10px]">반려</div>
                                                        <div className="mt-1 text-[10px] font-black">{step.approver?.full_name}</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="text-slate-100 border-2 border-slate-100 border-dashed rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] italic">Sign</div>
                                                        <div className="mt-1 text-[10px] font-black">{step.approver?.full_name}</div>
                                                    </>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-1 text-center text-[9px] font-black bg-slate-50">{formData.requesterDepartment || doc.requester_department}</td>
                                        {approvalHistory?.map((step) => (
                                            <td key={step.id} className="border border-black p-1 text-center text-[9px] font-black bg-slate-50">{step.approver?.department || '-'}</td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 기본 정보 */}
                    <div className="space-y-10 text-black font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black print-section">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 text-left font-black uppercase w-28">회의명</th>
                                    <td className="p-3 font-black" colSpan="3">{formData.meeting_title || '-'}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 text-left font-black uppercase">일시</th>
                                    <td className="p-3 font-black font-mono">
                                        {formData.meeting_date ? new Date(formData.meeting_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                        {formData.meeting_time ? ` ${formData.meeting_time}` : ''}
                                    </td>
                                    <th className="bg-slate-50 p-3 text-left font-black uppercase">장소</th>
                                    <td className="p-3 font-black">{formData.meeting_location || '-'}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 text-left font-black uppercase">사회자</th>
                                    <td className="p-3 font-black" colSpan="3">{formData.chairman || '-'}</td>
                                </tr>
                                {attendees.length > 0 && (
                                    <tr className="border-b border-r border-black">
                                        <th className="bg-slate-50 p-3 text-left font-black uppercase align-top pt-4">참석자</th>
                                        <td className="p-3 font-black" colSpan="3">
                                            <div className="space-y-1">
                                                <div className="grid grid-cols-3 gap-4 pb-1 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase">
                                                    <span>회사명</span><span>이름</span><span>직책</span>
                                                </div>
                                                {attendees.map((att, i) => {
                                                    const isObj = typeof att === 'object' && att !== null;
                                                    return (
                                                        <div key={i} className="grid grid-cols-3 gap-4 text-[12px] font-black py-0.5">
                                                            <span>{isObj ? att.company : att}</span>
                                                            <span>{isObj ? att.name : ''}</span>
                                                            <span>{isObj ? att.position : ''}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* 안건별 논의 */}
                        {agendaItems.map((item, idx) => (
                            <section key={idx} className="border border-black print-section">
                                <div className="bg-slate-900 text-white px-5 py-3 flex items-center gap-3">
                                    <span className="text-[11px] font-black text-slate-400 shrink-0">{idx + 1}.</span>
                                    <span className="font-black text-[13px]">{item.title || '(제목 없음)'}</span>
                                </div>
                                {item.discussion && (
                                    <div className="border-b border-black">
                                        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2">
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">논의 내용</span>
                                        </div>
                                        <div
                                            className="p-5 text-[12px] leading-relaxed font-black"
                                            dangerouslySetInnerHTML={{ __html: item.discussion }}
                                        />
                                    </div>
                                )}
                                {item.decisions && (
                                    <div>
                                        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2">
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">결정사항</span>
                                        </div>
                                        <p className="p-5 text-[12px] leading-relaxed font-black whitespace-pre-wrap">{item.decisions}</p>
                                    </div>
                                )}
                            </section>
                        ))}

                        {/* 후속조치 */}
                        {formData.next_steps && (
                            <section className="print-section">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">후속 조치 사항</h2>
                                <div className="border border-black p-5 text-[12px] leading-relaxed font-black whitespace-pre-wrap bg-slate-50/50">
                                    {formData.next_steps}
                                </div>
                            </section>
                        )}

                        {/* 첨부파일 */}
                        {attachmentSignedUrls.length > 0 && (
                            <section className="print-section">
                                <h2 className="text-[10px] mb-3 uppercase tracking-tighter font-black flex items-center gap-2">
                                    <Paperclip size={13} /> 첨부 자료
                                </h2>
                                <ul className="space-y-2">
                                    {attachmentSignedUrls.map((file, i) => (
                                        <li key={i} className="flex items-center gap-3 p-3 border border-slate-200 bg-slate-50 font-black text-[12px]">
                                            <FileText size={14} className="text-slate-400 shrink-0" />
                                            <span className="flex-1 truncate">{file.name}</span>
                                            <a href={file.url} download={file.name} className="no-print flex items-center gap-1 text-[10px] font-black hover:underline">
                                                <Download size={12} /> 다운로드
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* 서명 */}
                        <div className="pt-16 text-center space-y-6 print-section font-black text-black">
                            <div className="space-y-4">
                                <p className="text-[15px] font-black underline underline-offset-8 decoration-1 font-mono">
                                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                </p>
                                <p className="text-2xl font-black uppercase tracking-[0.4em] mt-6">작성자: {doc.requester_name} (인)</p>
                            </div>
                        </div>

                        {printWithOpinions && (approvalHistory?.some(s => s.comment) || referrerHistory?.length > 0) && (
                            <div className="mt-10 pt-8 border-t-2 border-black print-section">
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

                {/* 사이드바 */}
                <aside className="lg:col-span-4 space-y-5 no-print font-black">
                    {/* 결재 의견 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black">
                        <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-100 pb-4">
                            <Users size={20} /><h2 className="text-[13px] uppercase font-black tracking-widest">결재 의견 및 참조인</h2>
                        </div>
                        <div className="space-y-4">
                            {approvalHistory?.map((step, idx) => step.comment && (
                                <div key={idx} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black">
                                    <MessageSquare size={16} className="text-slate-400 flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black mb-1">{step.approver?.full_name} {step.approver?.position}</p>
                                        <p className="text-[12px] text-slate-700 leading-snug font-black">{step.comment}</p>
                                    </div>
                                </div>
                            ))}
                            {referrerHistory?.length > 0 && (
                                <div className="pt-4 border-t border-dashed border-slate-200 mt-4">
                                    <p className="text-[10px] uppercase mb-2 font-black text-blue-600 tracking-widest">참조인</p>
                                    <div className="text-[11px] font-black text-blue-900 bg-blue-50/50 p-4 rounded-2xl leading-relaxed">
                                        {referrerHistory.map((r, i) => (
                                            <span key={i} className="block mb-1 last:mb-0">[{r.referrer?.department || '소속미정'}] {r.referrer?.full_name} {r.referrer?.position || ''}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 결재 행동 */}
                    {(isMyTurn || isReferrer) && (
                        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm font-black">
                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-700">
                                <ShieldAlert size={18} className="text-amber-400" />
                                <h2 className="text-[12px] uppercase font-black tracking-widest text-amber-400">{isMyTurn ? '결재 대기중' : '참조 문서'}</h2>
                            </div>
                            {isMyTurn && (
                                <>
                                    <textarea
                                        value={approvalComment}
                                        onChange={(e) => setApprovalComment(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] font-black outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500"
                                        placeholder="결재 의견을 입력하십시오."
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleApprovalAction('승인')}
                                            disabled={actionLoading}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black hover:bg-slate-100 text-[11px] font-black rounded-xl transition-all"
                                        >
                                            <CheckCircle size={14} /> 승인
                                        </button>
                                        <button
                                            onClick={() => handleApprovalAction('반려')}
                                            disabled={actionLoading}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white hover:bg-red-700 text-[11px] font-black rounded-xl transition-all"
                                        >
                                            <XCircle size={14} /> 반려
                                        </button>
                                    </div>
                                </>
                            )}
                            {isReferrer && !isMyTurn && (
                                <p className="text-[11px] text-slate-400 font-black">참조인으로 지정된 문서입니다.</p>
                            )}
                        </div>
                    )}

                    {/* 첨부파일 목록 */}
                    {attachmentSignedUrls.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black">
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                                <Paperclip size={16} /><h2 className="text-[12px] uppercase font-black tracking-widest">첨부 파일</h2>
                                <span className="ml-auto text-[11px] text-slate-400">{attachmentSignedUrls.length}</span>
                            </div>
                            <div className="space-y-2">
                                {attachmentSignedUrls.map((file, i) => (
                                    <a key={i} href={file.url} download={file.name}
                                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
                                        <FileText size={14} className="text-slate-400 shrink-0" />
                                        <span className="text-[11px] font-black flex-1 truncate text-slate-700">{file.name}</span>
                                        <Download size={12} className="text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
