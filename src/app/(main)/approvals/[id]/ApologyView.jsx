'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
    Printer, FileText, CheckCircle, XCircle, Users, Download, Paperclip, ImageIcon, ExternalLink, Settings, Music
} from 'lucide-react';

export default function ApologyView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [currentStep, setCurrentStep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [manualDocNumber, setManualDocNumber] = useState('');
    const [approvalComment, setApprovalComment] = useState('');
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);

    const isReferrer = referrerHistory?.some(ref => ref.referrer_id === employee?.id || ref.referrer?.id === employee?.id);
    const isMyTurn = employee && currentStep && currentStep.approver?.id === employee.id && currentStep.status === '대기';

    useEffect(() => {
        const setupPage = async () => {
            if (doc) {
                try {
                    const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
                    setFormData(content || {});
                    setManualDocNumber(doc.document_number || '');
                    setCurrentStep(approvalHistory?.find(s => s.status === '대기') || null);

                    // 🚀 [카이 방식] 첨부파일 로직 이식
                    let rawAttachments = doc.attachments || content?.attachments || [];
                    if (typeof rawAttachments === 'string') {
                        try { rawAttachments = JSON.parse(rawAttachments); } catch (e) { rawAttachments = []; }
                    }

                    if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
                        const signedUrlPromises = rawAttachments.map(async (file) => {
                            if (!file) return null;
                            const filePath = typeof file === 'object' ? file.path : file;
                            if (!filePath) return null;
                            const cleanPath = filePath.replace('approval_attachments/', '').trim();
                            const { data } = await supabase.storage.from('approval_attachments').createSignedUrl(cleanPath, 3600);
                            if (data?.signedUrl) {
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
                } catch (e) { console.error(e); } finally { setLoading(false); }
            }
        };
        setupPage();
    }, [doc, approvalHistory]);

    const handleUpdateDocNumber = async () => {
        if (!manualDocNumber.trim()) return toast.error("문서 번호를 입력하세요.");
        setActionLoading(true);
        try {
            await supabase.from('approval_documents').update({ document_number: manualDocNumber }).eq('id', doc.id);
            toast.success("반영되었습니다.");
            router.refresh();
        } catch (e) { toast.error("실패"); } finally { setActionLoading(false); }
    };

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep) return;
        if (newStatus === '반려' && !approvalComment.trim()) return toast.error("반려 사유를 입력해주세요.");
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
        } catch (e) { toast.error("처리 중 오류"); } finally { setActionLoading(false); }
    };

    if (loading) return <div className="p-20 text-center font-black text-black text-xs animate-pulse italic">HANSUNG ERP LOADING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0 font-black">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
                    .no-print, nav, header, aside, .sidebar { display: none !important; }
                    .print-container { width: 210mm !important; margin: 0 auto !important; padding: 25mm 20mm !important; border: none !important; box-shadow: none !important; box-sizing: border-box !important; }
                    .print-section { page-break-inside: avoid !important; break-inside: avoid-page !important; }
                    ::-webkit-scrollbar { display: none !important; }
                }
                ::-webkit-scrollbar { width: 0px; } 
            `}} />
            
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2">
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Document Approval Viewer</span>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg">
                    <Printer size={14} /> 인쇄 및 PDF 저장
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container text-black font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black print-section font-black">
                        <div className="flex justify-between items-start mb-6 font-black">
                            <div className="space-y-1 font-black">
                                <p className="text-[9px] tracking-widest text-slate-400 font-black uppercase">Hansung Landscape & Construction</p>
                                <h1 className="text-3xl font-black tracking-tighter uppercase font-black">시 말 서</h1>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] font-black">
                            <span>문서번호 : {doc.document_number || '미발급'}</span>
                            <span>작성일자 : {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                        </div>
                    </header>

                    <div className="space-y-12 text-black font-black">
                        <table className="w-full border-collapse border border-black text-[11px] font-black print-section">
                            <tbody>
                                <tr className="border-b border-black text-black font-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">소속부서</th>
                                    <td className="p-4 border-r border-black font-black font-black">{doc.requester_department}</td>
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">성명/직위</th>
                                    <td className="p-4 font-black font-black">{doc.requester_name} {doc.requester_position}</td>
                                </tr>
                                <tr className="border-b border-black text-black">
                                    <th className="bg-slate-50 p-4 text-left border-r border-black font-black uppercase">발생일시</th>
                                    <td className="p-4 border-r border-black font-black font-mono font-black">{formData.incidentDate ? formData.incidentDate.replace('T', ' ') : '-'}</td>
                                    <th className="bg-slate-50 p-4 text-left border-r border-black font-black uppercase">문서상태</th>
                                    <td className="p-4 font-black underline underline-offset-4 decoration-1 font-black font-black">{doc.status}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="print-section font-black text-black">
                            <h2 className="text-[10px] mb-3 uppercase font-black tracking-tighter border-l-4 border-black pl-2">01. 사건 내용 및 경위</h2>
                            <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[150px] whitespace-pre-wrap font-black">{formData.incidentDetails}</div>
                        </section>

                        <section className="print-section font-black text-black">
                            <h2 className="text-[10px] mb-3 uppercase font-black tracking-tighter border-l-4 border-black pl-2">02. 발생 원인 분석</h2>
                            <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[100px] whitespace-pre-wrap font-black">{formData.cause}</div>
                        </section>

                        <section className="print-section font-black text-black">
                            <h2 className="text-[10px] mb-3 uppercase font-black tracking-tighter border-l-4 border-black pl-2">03. 대책 및 반성</h2>
                            <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[150px] whitespace-pre-wrap font-black">{formData.apologyContent}</div>
                        </section>

                        {/* 🚀 [카이 방식 적용] 첨부 증빙 자료 갤러리 및 다운로드 */}
                        {attachmentSignedUrls.length > 0 && (
                            <section className="print-section font-black text-black pt-6">
                                <h2 className="text-[10px] mb-6 uppercase font-black tracking-tighter border-l-4 border-black pl-2">04. 첨부 증빙 자료</h2>
                                <div className="space-y-8 font-black">
                                    {attachmentSignedUrls.map((file, i) => (
                                        <div key={i} className="border border-black bg-white p-3 shadow-sm font-black">
                                            <div className="flex justify-between items-center mb-3 px-1 no-print">
                                                <p className="text-[10px] text-black font-black uppercase tracking-tighter flex items-center gap-2">
                                                    {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={14} className="text-blue-600" /> : <FileText size={14} className="text-slate-400" />} 
                                                    파일 {i+1}: {file.name}
                                                </p>
                                                <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="text-blue-600 font-black text-[10px] flex items-center gap-1 hover:underline">
                                                    <Download size={12} /> 다운로드
                                                </a>
                                            </div>
                                            {/* 인쇄 시에도 보여야 하는 제목 */}
                                            <p className="hidden print:block text-[9px] text-slate-400 mb-2 font-mono uppercase tracking-tighter">Attachment {i+1}: {file.name}</p>
                                            
                                            {/* 이미지면 원본 노출, 아니면 아이콘박스 노출 */}
                                            {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                <img src={file.url} alt={file.name} className="w-full h-auto block border border-slate-100" />
                                            ) : (
                                                <div className="w-full py-12 bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-3">
                                                    <FileText size={48} className="text-slate-300" />
                                                    <span className="text-[11px] font-black text-slate-500">이 파일은 미리보기를 지원하지 않습니다. (다운로드하여 확인)</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className="pt-16 text-center space-y-6 print-section font-black text-black font-black">
                            <p className="text-[13px] font-black font-black">위와 같이 시말서를 제출하며, 향후 재발 방지를 약속합니다.</p>
                            <div className="space-y-4 font-black">
                                <p className="text-[15px] font-black underline underline-offset-8 decoration-1 font-mono font-black font-black">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : '-'}</p>
                                <p className="text-2xl font-black uppercase tracking-[0.4em] mt-6 font-black font-black">제출인: {doc.requester_name} (인)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-5 no-print font-black">
                    {/* ... (오른쪽 사이드바 결재 프로세스 및 의견란 기존 유지) ... */}
                    {isReferrer && (
                        <div className="bg-white border border-black p-6 shadow-sm font-black text-black font-black">
                            <div className="flex gap-2 font-black font-black">
                                <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value)} className="flex-1 border border-black px-3 py-1.5 text-[11px] outline-none font-black text-black focus:bg-slate-50" placeholder="문서번호 입력" />
                                <button onClick={handleUpdateDocNumber} className="bg-black text-white px-4 py-1.5 text-[10px] font-black hover:bg-slate-800 transition-all font-black">반영</button>
                            </div>
                        </div>
                    )}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2 text-black font-black">
                            <Users size={16} /><h2 className="text-[11px] uppercase font-black text-black font-black">결재 프로세스</h2>
                        </div>
                        <div className="space-y-2 mb-5 font-black text-black">
                            {approvalHistory?.map((step, idx) => (
                                <div key={step.id} className={`p-3 rounded-xl border flex justify-between items-center ${step.status === '승인' || step.status === '완료' ? 'bg-slate-50 border-black' : 'bg-white opacity-60'} font-black`}>
                                    <div className="text-[12px] font-black">{step.approver?.full_name} <span className="text-[9px] text-slate-400 ml-1 font-black">{idx + 1}차</span></div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${step.status === '승인' || step.status === '완료' ? 'bg-black text-white' : 'bg-amber-400 text-white'} font-black`}>{step.status === 'pending' ? '대기' : step.status}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t border-dashed border-slate-200 font-black">
                            <p className="text-[9px] uppercase mb-2 font-black text-blue-600 tracking-widest font-black">Official CC (참조)</p>
                            <div className="text-[11px] font-black text-blue-900 bg-blue-50/50 p-3 rounded-xl leading-relaxed font-black">
                                {referrerHistory?.length > 0 ? referrerHistory.map(r => r.referrer?.full_name || r.referrer_name).join(', ') : '지정된 참조인 없음'}
                            </div>
                        </div>
                    </div>
                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-2xl p-6 shadow-xl text-white font-black">
                            <h3 className="text-[11px] uppercase mb-4 font-black text-slate-400 font-black">결재 의견 작성</h3>
                            <textarea 
                                value={approvalComment} 
                                onChange={(e) => setApprovalComment(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] font-black outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500 font-black" 
                                placeholder="승인 또는 반려 의견을 입력하십시오." 
                            />
                            <div className="grid grid-cols-2 gap-3 font-black">
                                <button onClick={() => handleApprovalAction('승인')} className="bg-white text-black py-3 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 font-black">
                                    <CheckCircle size={14}/> 승인
                                </button>
                                <button onClick={() => handleApprovalAction('반려')} className="bg-rose-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2 font-black">
                                    <XCircle size={14}/> 반려
                                </button>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}