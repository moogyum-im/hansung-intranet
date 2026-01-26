'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
    Printer, FileText, CheckCircle, XCircle, Hash, 
    UserCheck, Users, Loader2, ChevronRight, Settings, Download, Paperclip, ImageIcon, ExternalLink
} from 'lucide-react';

export default function BusinessTripView({ doc, employee, approvalHistory, referrerHistory }) {
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
                    // 1. 문서 데이터 파싱
                    const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
                    setFormData(content);
                    setManualDocNumber(doc.document_number || '');
                    
                    const activeStep = approvalHistory?.find(s => s.status === '대기');
                    setCurrentStep(activeStep || null);

                    // 2. [강력 수리] 첨부파일 경로 정규화 및 서명된 URL 생성
                    let rawAttachments = doc.attachments;
                    if (typeof rawAttachments === 'string') {
                        try { rawAttachments = JSON.parse(rawAttachments); } catch (e) { rawAttachments = []; }
                    }

                    if (rawAttachments && Array.isArray(rawAttachments) && rawAttachments.length > 0) {
                        const signedUrlPromises = rawAttachments.map(async (file) => {
                            if (!file) return null;
                            
                            // 객체 형태({path: '...'}) 또는 문자열 형태 모두 대응
                            const rawPath = typeof file === 'object' ? file.path : file;
                            if (!rawPath) return null;

                            /**
                             * [핵심 수리] 
                             * DB에 저장된 path에서 버킷 이름이 포함되어 있을 경우를 대비하여 
                             * 순수 파일 경로만 추출합니다.
                             */
                            const cleanPath = rawPath.replace('approval_attachments/', '').trim();
                            
                            const { data, error } = await supabase.storage
                                .from('approval_attachments')
                                .createSignedUrl(cleanPath, 3600); // 1시간 유효 링크

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

    const handleUpdateDocNumber = async () => {
        if (!manualDocNumber.trim()) return toast.error("문서 번호를 입력하세요.");
        setActionLoading(true);
        try {
            const { error } = await supabase.from('approval_documents').update({ document_number: manualDocNumber }).eq('id', doc.id);
            if (error) throw error;
            toast.success("반영되었습니다.");
            router.refresh();
        } catch (e) { 
            toast.error("반영 실패"); 
        } finally { 
            setActionLoading(false); 
        }
    };

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
        } catch (e) { 
            toast.error("처리 중 오류 발생"); 
        } finally { 
            setActionLoading(false); 
        }
    };

    if (loading) return <div className="p-20 text-center font-black text-black text-xs font-sans italic animate-pulse">HANSUNG ERP LOADING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 15mm 20mm; -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-container { width: 100% !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
                    table { border-collapse: collapse !important; border: 1px solid black !important; width: 100% !important; }
                    th, td { border: 1px solid black !important; padding: 12px !important; }
                    .print-break { page-break-inside: avoid; break-inside: avoid; }
                    header { margin-bottom: 20px !important; }
                }
            `}} />
            
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">Document Management System</span>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg">
                    <Printer size={14} /> 인쇄 및 PDF 저장
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container text-black font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black">
                        <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1">
                                <p className="text-[9px] tracking-widest text-slate-400 font-black uppercase">Hansung Landscape & Construction</p>
                                <h1 className="text-3xl font-black tracking-tighter uppercase">출 장 신 청 서</h1>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] font-black">
                            <span>문서번호 : {doc.document_number || '미발급'}</span>
                            <span>작성일자 : {doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                        </div>
                    </header>

                    <div className="space-y-12 text-black font-black">
                        <table className="w-full border-collapse border border-black text-[11px] font-black print-break">
                            <tbody>
                                <tr className="border-b border-black text-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">소속부서</th>
                                    <td className="p-4 border-r border-black font-black">{doc.requester_department}</td>
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">성명/직위</th>
                                    <td className="p-4 font-black">{doc.requester_name} {doc.requester_position}</td>
                                </tr>
                                <tr className="border-b border-black text-black">
                                    <th className="bg-slate-50 p-4 text-left border-r border-black font-black uppercase">보존기한</th>
                                    <td className="p-4 border-r border-black font-black">{formData.preservationPeriod || '5년'}</td>
                                    <th className="bg-slate-50 p-4 text-left border-r border-black font-black uppercase">문서상태</th>
                                    <td className="p-4 font-black underline underline-offset-4 decoration-1">{doc.status}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="print-break font-black text-black">
                            <h2 className="text-[10px] mb-3 uppercase font-black tracking-tighter border-l-4 border-black pl-2">01. 출장 세부 계획</h2>
                            <table className="w-full border-collapse border border-black text-[11px] font-black">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black">출장기간</th>
                                        <td className="p-4 font-mono font-black">{formData.startDate} ~ {formData.endDate} ({formData.duration}일간)</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black">행선지</th>
                                        <td className="p-4 font-black">{formData.destination} (비상연락처: {formData.contact})</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black">출장목적</th>
                                        <td className="p-4 h-32 align-top whitespace-pre-wrap leading-relaxed font-black">{formData.purpose}</td>
                                    </tr>
                                    <tr>
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black">교통수단</th>
                                        <td className="p-4 font-black">{formData.transportation} {formData.transportation === '차량' && ` (${formData.transportDetail}${formData.transportMemo ? `: ${formData.transportMemo}` : ''})`}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <div className="pt-20 text-center space-y-10 print-break font-black text-black">
                            <p className="text-[13px] font-black">위와 같이 출장신청서를 제출하오니 승인하여 주시기 바랍니다.</p>
                            <div className="space-y-3 font-black">
                                <p className="text-[15px] font-black underline underline-offset-8 decoration-1 font-mono">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : '-'}</p>
                                <p className="text-2xl font-black uppercase tracking-[0.3em] mt-6">신청인: {doc.requester_name} (인)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-5 no-print font-black">
                    {isReferrer && (
                        <div className="bg-white border border-black p-6 shadow-sm font-black text-black">
                            <div className="flex gap-2 font-black">
                                <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value)} className="flex-1 border border-black px-3 py-1.5 text-[11px] outline-none font-black text-black focus:bg-slate-50" placeholder="문서번호 입력" />
                                <button onClick={handleUpdateDocNumber} className="bg-black text-white px-4 py-1.5 text-[10px] font-black hover:bg-slate-800 transition-all">반영</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2 text-black font-black">
                            <Users size={16} /><h2 className="text-[11px] uppercase font-black text-black">결재 프로세스</h2>
                        </div>
                        <div className="space-y-2 mb-5 font-black text-black">
                            {approvalHistory?.map((step, idx) => (
                                <div key={step.id} className={`p-3 rounded-xl border flex justify-between items-center ${step.status === '승인' || step.status === '완료' ? 'bg-slate-50 border-black' : 'bg-white opacity-60'}`}>
                                    <div className="text-[12px] font-black">{step.approver?.full_name} <span className="text-[9px] text-slate-400 ml-1 font-black">{idx + 1}차</span></div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${step.status === '승인' || step.status === '완료' ? 'bg-black text-white' : 'bg-amber-400 text-white'}`}>{step.status === 'pending' ? '대기' : step.status}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t border-dashed border-slate-200 font-black">
                            <p className="text-[9px] uppercase mb-2 font-black text-blue-600 tracking-widest">Official CC (참조)</p>
                            <div className="text-[11px] font-black text-blue-900 bg-blue-50/50 p-3 rounded-xl leading-relaxed">{referrerHistory?.length > 0 ? referrerHistory.map(r => r.referrer?.full_name || r.referrer_name).join(', ') : '지정된 참조인 없음'}</div>
                        </div>
                    </div>

                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-2xl p-6 shadow-xl text-white font-black">
                            <h3 className="text-[11px] uppercase mb-4 font-black text-slate-400">결재 의견 작성</h3>
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] font-black outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500" placeholder="승인 또는 반려 의견을 입력하십시오." />
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleApprovalAction('승인')} className="bg-white text-black py-3 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2"><CheckCircle size={14}/> 승인</button>
                                <button onClick={() => handleApprovalAction('반려')} className="bg-rose-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2"><XCircle size={14}/> 반려</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 font-black text-black">
                            <h2 className="text-[11px] uppercase font-black flex items-center gap-2"><ImageIcon size={14} /> 증빙 갤러리</h2>
                            <span className="text-[10px] text-slate-400 font-black">{attachmentSignedUrls.length} Files</span>
                        </div>
                        
                        {attachmentSignedUrls.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3 font-black">
                                {attachmentSignedUrls.map((file, i) => (
                                    <div key={i} className="group relative aspect-square bg-slate-50 border border-slate-100 rounded-lg overflow-hidden hover:border-black transition-all font-black">
                                        <img src={file.url} alt={file.name} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-300 font-black" />
                                        <a href={file.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white p-2 font-black">
                                            <ExternalLink size={16} />
                                            <span className="text-[8px] text-center line-clamp-2 font-black">{file.name}</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-xl font-black">
                                <Paperclip size={20} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-[10px] text-slate-300 font-black italic">NO ATTACHMENTS</p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}