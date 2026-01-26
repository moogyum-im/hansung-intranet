'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
    Printer, FileText, CheckCircle, XCircle, Hash, 
    UserCheck, Users, Loader2, Download, ChevronRight, Settings, Paperclip, ImageIcon
} from 'lucide-react';

export default function ResignationView({ doc, employee, approvalHistory, referrerHistory }) { 
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [currentStep, setCurrentStep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalComment, setApprovalComment] = useState('');
    const [attachmentSignedUrls, setAttachmentSignedUrls] = useState([]);
    const [manualDocNumber, setManualDocNumber] = useState('');

    const isReferrer = referrerHistory?.some(ref => ref.referrer_id === employee?.id || ref.referrer?.id === employee?.id);
    const isMyTurn = employee && currentStep && currentStep.approver?.id === employee.id && (currentStep.status === 'pending' || currentStep.status === '대기');

    useEffect(() => {
        const setupPage = async () => {
            if (doc) {
                try {
                    let parsedContent = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content || {};
                    setFormData(parsedContent);
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
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0 font-black">
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
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Resignation Approval Viewer</span>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg font-black"><Printer size={14} /> 인쇄 및 PDF 저장</button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black text-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black print-section">
                        <h1 className="text-4xl font-black text-center mb-6 tracking-[1.5rem] uppercase">사직서</h1>
                        <div className="flex justify-between text-[10px] mt-4 font-black">
                            <span>문서번호 : {doc.document_number || '미발급'}</span>
                            <span>작성일자 : {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                        </div>
                    </header>

                    <div className="space-y-12 text-black font-black">
                        <table className="w-full border-collapse border border-black text-[11px] font-black print-section">
                            <tbody>
                                <tr className="border-b border-black text-black font-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">기안부서</th>
                                    <td className="p-4 border-r border-black font-black">{doc.requester_department}</td>
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">성명/직위</th>
                                    <td className="p-4 font-black">{doc.requester_name} {doc.requester_position}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="print-section font-black text-black font-black">
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">01. 퇴직 상세 사유</h2>
                            <div className="border border-black p-5 text-[12px] leading-relaxed min-h-[150px] whitespace-pre-wrap font-black">{formData.resignationReason}</div>
                        </section>

                        <section className="border-4 border-double border-black p-8 space-y-6 font-black bg-slate-50/30 print-section font-black">
                            <h3 className="font-black text-center text-lg underline underline-offset-8">서 약 서</h3>
                            <div className="space-y-4 text-[11px] leading-relaxed font-black">
                                <p>1. 본인은 퇴직에 따른 사무 인수, 인계의 절차로 최종 퇴사 시까지 책임과 의무를 완수하고, 재직 시 업무상 취득한 비밀사항을 타인에게 누설하지 않겠습니다.</p>
                                <p>2. 퇴직금 수령 등 환불품(금)은 퇴직일 전일까지 반환하겠습니다.</p>
                                <p>3. 기타 회사와 관련한 제반 사항은 회사 규정에 의거 퇴직일 전일까지 처리하겠습니다.</p>
                                <p>4. 만일 본인이 상기 사항을 위반하였을 때에는 이유 여하를 막론하고 민, 형사상의 책임을 지며 손해배상의 의무를 지겠습니다.</p>
                            </div>
                        </section>

                        <section className="print-section font-black text-black">
                            <table className="w-full border-collapse border border-black text-[11px] font-black">
                                <tbody>
                                    <tr className="border-b border-black font-black">
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">퇴사예정일</th>
                                        <td className="p-4 border-r border-black font-mono text-lg font-black">{formData.resignationDate}</td>
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">주민번호</th>
                                        <td className="p-4 font-mono font-black">{formData.residentId}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        {/* [픽스] 서명란 위 증빙 자료 갤러리 */}
                        {attachmentSignedUrls.length > 0 && (
                            <section className="print-section font-black text-black pt-6">
                                <h2 className="text-[10px] mb-6 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">03. 첨부 증빙 자료</h2>
                                <div className="space-y-8 font-black">
                                    {attachmentSignedUrls.map((file, i) => (
                                        <div key={i} className="print-break border border-slate-200 p-2 bg-white rounded-sm print-section font-black">
                                            <p className="text-[9px] text-slate-400 mb-2 font-mono uppercase font-black">Evidence File {i+1}: {file.name}</p>
                                            <img src={file.url} alt={file.name} className="w-full h-auto block shadow-sm font-black" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className="pt-20 text-center space-y-6 print-section font-black text-black">
                            <div className="space-y-4 font-black">
                                <p className="text-[15px] font-black underline underline-offset-8 decoration-1 font-mono">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : '-'}</p>
                                <p className="text-2xl font-black uppercase tracking-[0.4em] mt-6 font-black">기안자: {doc.requester_name} (인)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-5 no-print font-black font-black">
                    {isReferrer && (
                        <div className="bg-white border border-black p-6 shadow-sm font-black text-black">
                            <div className="flex gap-2 font-black font-black">
                                <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value)} className="flex-1 border border-black px-3 py-1.5 text-[11px] outline-none font-black text-black focus:bg-slate-50 font-black" placeholder="문서번호 입력" />
                                <button onClick={handleUpdateDocNumber} className="bg-black text-white px-4 py-1.5 text-[10px] font-black hover:bg-slate-800 transition-all font-black">반영</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black font-black">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2 text-black font-black">
                            <Users size={16} /><h2 className="text-[11px] uppercase font-black text-black font-black">결재 프로세스</h2>
                        </div>
                        <div className="space-y-2 mb-5 font-black text-black font-black">
                            {approvalHistory?.map((step, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center ${step.status === '승인' || step.status === '완료' ? 'bg-slate-50 border-black' : 'bg-white opacity-60'} font-black`}>
                                    <div className="text-[12px] font-black font-black">{step.approver?.full_name || step.approver_name} <span className="text-[9px] text-slate-400 ml-1 font-black">{idx + 1}차</span></div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black font-black ${step.status === '승인' || step.status === '완료' ? 'bg-black text-white' : 'bg-amber-400 text-white'} font-black`}>{step.status === 'pending' ? '대기' : step.status}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t border-dashed border-slate-200 font-black font-black">
                            <p className="text-[9px] uppercase mb-2 font-black text-blue-600 tracking-widest font-black font-black">Official CC (참조)</p>
                            <div className="text-[11px] font-black text-blue-900 bg-blue-50/50 p-3 rounded-xl leading-relaxed font-black font-black">
                                {referrerHistory?.length > 0 ? (
                                    <div className="flex flex-col gap-1.5 font-black font-black">
                                        {referrerHistory.map((r, i) => {
                                            const dept = r.referrer?.department || r.department || "소속불명";
                                            const name = r.referrer?.full_name || r.referrer_name || "이름없음";
                                            const pos = r.referrer?.position || r.position || "직급없음";
                                            return <span key={i} className="font-black text-[10px]">[{dept}] {name} {pos}</span>
                                        })}
                                    </div>
                                ) : '지정된 참조인 없음'}
                            </div>
                        </div>
                    </div>

                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-2xl p-6 shadow-xl text-white font-black font-black">
                            <h3 className="text-[11px] uppercase mb-4 font-black text-slate-400 font-black font-black">결재 의견 작성</h3>
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] font-black font-black outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500 font-black" placeholder="의견을 입력하십시오." />
                            <div className="grid grid-cols-2 gap-3 font-black font-black">
                                <button onClick={() => handleApprovalAction('승인')} className="bg-white text-black py-3 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 font-black font-black"><CheckCircle size={14}/> 승인</button>
                                <button onClick={() => handleApprovalAction('반려')} className="bg-rose-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2 font-black font-black font-black"><XCircle size={14}/> 반려</button>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}