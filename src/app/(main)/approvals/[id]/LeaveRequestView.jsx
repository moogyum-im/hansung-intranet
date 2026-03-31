'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
    Printer, FileText, CheckCircle, XCircle, Hash, 
    UserCheck, Users, Loader2, Download, ChevronRight, Settings, Paperclip, ImageIcon, MessageSquare, ShieldAlert
} from 'lucide-react';

export default function LeaveRequestView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalComment, setApprovalComment] = useState('');
    const [currentStep, setCurrentStep] = useState(null);
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);

    const displayApprovals = approvalHistory || doc?.approval_document_approvers || [];
    const displayReferrers = referrerHistory || doc?.approval_document_referrers || [];
    
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
                    
                    let calculatedDuration = '';
                    if (content.leaveType?.includes('반차')) { 
                        calculatedDuration = '0.5일'; 
                    } else if (content.startDate && content.endDate) {
                        const start = new Date(content.startDate);
                        const end = new Date(content.endDate);
                        const diff = Math.abs(end - start);
                        calculatedDuration = `${Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1}일`; 
                    }

                    setFormData({ ...content, duration: calculatedDuration });
                    setCurrentStep(displayApprovals.find(step => step.status === 'pending' || step.status === '대기'));

                    let rawFiles = doc.attachments || content.attachments || [];
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
    }, [doc, displayApprovals]);

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep) return;
        if (newStatus === '반려' && !approvalComment.trim()) return toast.error("반려 사유 필수");
        setActionLoading(true);
        try {
            // 1. 현재 결재자 상태 업데이트
            await supabase.from('approval_document_approvers').update({ status: newStatus, comment: approvalComment, approved_at: new Date().toISOString() }).eq('id', currentStep.id);
            
            const nextStep = displayApprovals.find(step => step.sequence === currentStep.sequence + 1);
            
            if (newStatus === '반려' || !nextStep) {
                // 2. 최종 승인 또는 반려 처리
                await supabase.from('approval_documents').update({ status: newStatus === '반려' ? '반려' : '완료', completed_at: new Date().toISOString() }).eq('id', doc.id);
                
                // 🚀 [추가] 최종 '승인'일 경우 기안자의 연차 자동 차감
                if (newStatus === '승인' && !nextStep) {
                    try {
                        const contentData = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
                        // 기안 시 넘겨받은 requestedDays 확보 (없으면 0)
                        const requestedDays = Number(contentData.requestedDays || 0);

                        if (requestedDays > 0 && doc.requester_id) {
                            // 현재 기안자의 프로필에서 사용 연차(used_leave_days) 조회
                            const { data: profileData, error: profileError } = await supabase
                                .from('profiles')
                                .select('used_leave_days')
                                .eq('id', doc.requester_id)
                                .single();

                            if (!profileError && profileData) {
                                // 기존 사용 연차 + 새로 승인된 연차 합산
                                const newUsedDays = Number(profileData.used_leave_days || 0) + requestedDays;
                                
                                // 프로필 업데이트
                                const { error: updateError } = await supabase
                                    .from('profiles')
                                    .update({ used_leave_days: newUsedDays })
                                    .eq('id', doc.requester_id);

                                if (!updateError) {
                                    toast.success(`최종 승인 완료 및 연차 ${requestedDays}일 자동 차감됨`);
                                } else {
                                    console.error("연차 차감 실패:", updateError);
                                }
                            }
                        }
                    } catch (err) {
                        console.error("연차 차감 로직 오류:", err);
                    }
                }
            } else {
                // 3. 다음 결재자로 넘김
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('id', nextStep.id);
                await supabase.from('approval_documents').update({ status: '진행중', current_approver_id: nextStep.approver_id }).eq('id', doc.id);
            }
            window.location.reload();
        } catch (error) { 
            toast.error("처리 실패"); 
        } finally { 
            setActionLoading(false); 
        }
    };

    if (loading) return <div className="p-20 text-center font-black text-black text-xs font-sans animate-pulse italic uppercase">HANSUNG ERP LOADING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
                    .no-print, nav, header, aside, .sidebar { display: none !important; }
                    .print-container { width: 210mm !important; margin: 0 auto !important; padding: 20mm 15mm !important; border: none !important; box-shadow: none !important; box-sizing: border-box !important; }
                    .approval-table { border-collapse: collapse !important; width: auto !important; margin-left: auto !important; }
                    .approval-table th, .approval-table td { border: 1px solid black !important; }
                }
            `}} />
            
            <div className="w-full max-w-[1100px] mb-4 flex justify-end items-center no-print px-2">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg"><Printer size={14} /> 인쇄 및 PDF 저장</button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container text-black font-black">
                    
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black tracking-tighter uppercase">휴 가 신 청 서</h1>
                            <div className="flex flex-col text-[10px] space-y-1">
                                <span>문서번호 : {doc?.document_number || formData?.document_number || '-'}</span>
                                <span>작성일자 : {doc?.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <table className="approval-table border-collapse border border-black text-[11px]">
                                <tbody>
                                    <tr>
                                        <th rowSpan="3" className="w-8 bg-slate-50 border border-black p-2 text-center leading-tight">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center">기안</th>
                                        {displayApprovals.map((step) => (
                                            <th key={step.id} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center">
                                                {step.approver?.position || '미지정'}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="h-20">
                                        <td className="border border-black p-1 text-center relative align-middle">
                                            <div className="text-rose-600 border-2 border-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto opacity-70 rotate-[-15deg] text-[9px] leading-tight">
                                                서명완료<br/>{formatDateShort(doc?.created_at)}
                                            </div>
                                            <div className="mt-1 text-[9px]">{doc?.requester_name}</div>
                                        </td>
                                        {displayApprovals.map((step) => (
                                            <td key={step.id} className="border border-black p-1 text-center relative align-middle">
                                                {step.status === '승인' || step.status === '완료' ? (
                                                    <>
                                                        <div className="text-rose-600 border-2 border-rose-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto rotate-[-15deg] text-[10px] leading-tight">
                                                            서명완료<br/>{formatDateShort(step.approved_at)}
                                                        </div>
                                                        <div className="mt-1 text-[10px]">{step.approver?.full_name}</div>
                                                    </>
                                                ) : step.status === '반려' ? (
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-rose-500 border-2 border-dashed border-rose-500 rounded-full w-14 h-14 flex items-center justify-center mx-auto rotate-[-15deg] text-[10px] leading-tight uppercase">
                                                            반려됨<br/>{formatDateShort(step.approved_at)}
                                                        </div>
                                                        <div className="mt-1 text-[10px] text-black">
                                                            {step.approver?.full_name}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-slate-200 border-2 border-dashed border-slate-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] leading-tight uppercase italic">
                                                            대기중
                                                        </div>
                                                        <div className="mt-1 text-[10px] text-black">
                                                            {step.approver?.full_name || '미지정'}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                            {['진행중', 'pending', '대기'].includes(doc?.status) && currentStep && (
                                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded text-[11px] flex items-center gap-1.5 shadow-sm mt-2 no-print">
                                    <ShieldAlert size={12} /> 현재 <b>{currentStep.approver?.full_name} {currentStep.approver?.position}</b>님의 결재 대기 중
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-12">
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <tbody>
                                <tr className="border-b border-black text-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black uppercase">소속부서</th>
                                    <td className="p-4 border-r border-black">{doc?.requester_department}</td>
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black uppercase">성명/직위</th>
                                    <td className="p-4">{doc?.requester_name} {doc?.requester_position}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="text-black">
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2">01. 휴가 세부 내역</h2>
                            <table className="w-full border-collapse border border-black text-[11px]">
                                <tbody>
                                    <tr className="border-b border-black text-black">
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black uppercase">휴가종류</th>
                                        <td className="p-4 border-r border-black">{formData.leaveType}</td>
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black uppercase">신청일수</th>
                                        <td className="p-4 text-blue-700">{formData.duration}</td>
                                    </tr>
                                    <tr className="border-b border-black text-black">
                                        <th className="bg-slate-50 p-4 text-left border-r border-black uppercase">시작일자</th>
                                        <td className="p-4 border-r border-black font-mono">{formData.startDate}</td>
                                        <th className="bg-slate-50 p-4 text-left border-r border-black uppercase">종료일자</th>
                                        <td className="p-4 font-mono">{formData.endDate}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="text-black">
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2">02. 휴가 사유</h2>
                            <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[200px] whitespace-pre-wrap">{formData.reason}</div>
                        </section>

                        <div className="pt-20 text-center space-y-6 text-black">
                            <div className="space-y-4">
                                <p className="text-[15px] underline underline-offset-8 decoration-1 font-mono">{doc?.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : '-'}</p>
                                <p className="text-2xl uppercase tracking-[0.4em] mt-6">신청인: {doc?.requester_name} (인)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-5 no-print">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black">
                        <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-100 pb-4">
                            <Users size={20} /><h2 className="text-[13px] uppercase tracking-widest">결재 의견 및 참조인</h2>
                        </div>
                        
                        <div className="space-y-4">
                            {displayApprovals.map((step, idx) => step.comment && (
                                <div key={idx} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <MessageSquare size={16} className="text-slate-400 flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 mb-1">{step.approver?.full_name || step.approver_name} {step.approver?.position}</p>
                                        <p className="text-[12px] text-slate-700 leading-snug">{step.comment}</p>
                                    </div>
                                </div>
                            ))}

                            {displayReferrers.length > 0 && (
                                <div className="pt-4 border-t border-dashed border-slate-200 mt-4">
                                    <p className="text-[10px] uppercase mb-2 text-blue-600 tracking-widest">참조인</p>
                                    <div className="text-[11px] text-blue-900 bg-blue-50/50 p-4 rounded-2xl leading-relaxed">
                                        {displayReferrers.map((r, i) => (
                                            <span key={i} className="block mb-1 last:mb-0">
                                                [{r.referrer?.department || '소속미정'}] {r.referrer?.full_name || r.referrer_name} {r.referrer?.position || ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-2xl p-6 shadow-xl text-white">
                            <h3 className="text-[11px] uppercase mb-4 text-slate-400">결재 처리 요청</h3>
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500" placeholder="결재 의견을 입력하십시오." />
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleApprovalAction('승인')} disabled={actionLoading} className="bg-white text-black py-3 rounded-xl text-[11px] hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle size={14}/> 승인 처리</button>
                                <button onClick={() => handleApprovalAction('반려')} disabled={actionLoading} className="bg-rose-600 text-white py-3 rounded-xl text-[11px] hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"><XCircle size={14}/> 반려 처리</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 text-black">
                            <h2 className="text-[13px] uppercase flex items-center gap-2"><Paperclip size={14} /> 증빙 자료 및 첨부파일</h2>
                            <span className="text-[12px] text-slate-400">{attachmentSignedUrls.length} Files</span>
                        </div>
                        
                        {attachmentSignedUrls.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {attachmentSignedUrls.map((file, i) => (
                                    <div key={i} className="flex flex-col border border-slate-100 rounded-lg overflow-hidden bg-slate-50 shadow-sm">
                                        <div className="flex items-center justify-between p-2 bg-white border-b border-slate-100">
                                            <div className="flex items-center gap-2 flex-1 truncate">
                                                {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={14} className="text-blue-500" /> : <FileText size={14} className="text-slate-400" />}
                                                <span className="text-[10px] truncate">{file.name}</span>
                                            </div>
                                            <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-100 p-1 rounded bg-white border border-blue-200">
                                                <Download size={14} />
                                            </a>
                                        </div>
                                        {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                            <div className="p-2 flex justify-center bg-slate-50">
                                                <img src={file.url} alt={file.name} className="max-w-full h-auto rounded border border-white shadow-sm" />
                                            </div>
                                        )}
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