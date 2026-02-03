'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
    Printer, Download, Eye, Hash, 
    Paperclip, FileIcon, CheckCircle2, CheckCircle,
    Settings, Users, MapPin, Calendar, Car, ChevronRight, ImageIcon, ExternalLink, XCircle, FileText
} from 'lucide-react';

export default function ExpenseSettlementView({ doc, employee, approvalHistory, referrerHistory }) {
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalComment, setApprovalComment] = useState('');
    const [currentStep, setCurrentStep] = useState(null);
    const [mapUrls, setMapUrls] = useState([]); // 01번 주유 증빙 (네비, 지도)
    const [receiptUrls, setReceiptUrls] = useState([]); // 02번 비용 증빙 (영수증)
    const [manualDocNumber, setManualDocNumber] = useState('');

    const displayApprovals = approvalHistory || doc?.approval_document_approvers || [];
    const displayReferrers = referrerHistory || doc?.approval_document_referrers || [];
    
    const isReferrer = displayReferrers.some(ref => ref.referrer_id === employee?.id || ref.referrer?.id === employee?.id);
    const isMyTurn = employee && currentStep && currentStep.approver?.id === employee.id && (currentStep.status === 'pending' || currentStep.status === '대기');

    useEffect(() => {
        const setupPage = async () => {
            if (doc) {
                try {
                    const parsedContent = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content || {};
                    setFormData(parsedContent);
                    setManualDocNumber(doc.document_number || '');
                    setCurrentStep(displayApprovals.find(step => step.status === 'pending' || step.status === '대기'));

                    // 🚀 [카이 방식] 항목별 파일 로드 및 서명된 URL 생성
                    const loadUrls = async (files) => {
                        if (!files || !Array.isArray(files)) return [];
                        const promises = files.map(async f => {
                            if (!f || !f.path) return null;
                            const cleanPath = f.path.replace('approval_attachments/', '').replace('settlement_proofs/', '').trim();
                            const { data } = await supabase.storage.from('approval_attachments').createSignedUrl(cleanPath, 3600);
                            return data?.signedUrl ? { url: data.signedUrl, name: f.name || cleanPath } : null;
                        });
                        return (await Promise.all(promises)).filter(x => x !== null);
                    };

                    if (parsedContent.mapAttachments) setMapUrls(await loadUrls(parsedContent.mapAttachments));
                    if (parsedContent.receiptAttachments) setReceiptUrls(await loadUrls(parsedContent.receiptAttachments));

                } catch (e) { console.error("로드 오류:", e); } finally { setLoading(false); }
            }
        };
        setupPage();
    }, [doc, displayApprovals]);

    const handleApprovalAction = async (newStatus) => {
        if (!currentStep) return;
        if (newStatus === '반려' && !approvalComment.trim()) return toast.error("반려 사유 필수");
        setActionLoading(true);
        try {
            await supabase.from('approval_document_approvers').update({ status: newStatus, comment: approvalComment, approved_at: new Date().toISOString() }).eq('id', currentStep.id);
            const nextStep = displayApprovals.find(step => step.sequence === currentStep.sequence + 1);
            if (newStatus === '반려' || !nextStep) {
                await supabase.from('approval_documents').update({ status: newStatus === '반려' ? '반려' : '완료', completed_at: new Date().toISOString() }).eq('id', doc.id);
            } else {
                await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('id', nextStep.id);
            }
            window.location.reload();
        } catch (error) { toast.error("처리 실패"); } finally { setActionLoading(false); }
    };

    const handleUpdateDocNumber = async () => {
        if (!manualDocNumber.trim()) return toast.error("문서 번호 입력 필요");
        setActionLoading(true);
        try {
            await supabase.from('approval_documents').update({ document_number: manualDocNumber }).eq('id', doc.id);
            toast.success("반영되었습니다.");
            router.refresh();
        } catch (error) { toast.error("반영 실패"); } finally { setActionLoading(false); }
    };

    if (loading) return <div className="p-20 text-center font-black text-black text-xs font-sans animate-pulse italic uppercase">HANSUNG ERP LOADING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none print:bg-white print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; }
                    .no-print { display: none !important; }
                    .print-container { width: 210mm !important; margin: 0 auto !important; padding: 25mm 20mm !important; border: none !important; box-shadow: none !important; box-sizing: border-box !important; }
                    ::-webkit-scrollbar { display: none !important; }
                }
                ::-webkit-scrollbar { width: 0px; } 
            `}} />
            
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Expense Settlement Viewer</span>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-slate-800 text-[11px] transition-all font-black shadow-lg"><Printer size={14} /> 인쇄 및 PDF 저장</button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black text-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative print-container text-black font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black print-section">
                        <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1">
                                <p className="text-[9px] tracking-widest text-slate-400 font-black uppercase">Hansung Landscape & Construction</p>
                                <h1 className="text-3xl font-black tracking-tighter uppercase">출 장 여 비 정 산 서</h1>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] font-black">
                            {/* 🚀 [수정] 문서번호 고정 문구 처리 */}
                            <span>문서번호 : {doc?.document_number || '관리부 추후 부여'}</span>
                            <span>작성일자 : {doc?.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                        </div>
                    </header>

                    <div className="space-y-12 text-black font-black">
                        <table className="w-full border-collapse border border-black text-[11px] font-black print-section font-black">
                            <tbody>
                                <tr className="border-b border-black text-black font-black">
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">성명/직위</th>
                                    <td className="p-4 border-r border-black font-black">{doc?.requester_name} {doc?.requester_position}</td>
                                    <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase">소속부서</th>
                                    <td className="p-4 font-black">{doc?.requester_department}</td>
                                </tr>
                                <tr className="border-b border-black text-black font-black">
                                    <th className="bg-slate-50 p-4 text-left border-r border-black font-black uppercase font-black">출장기간</th>
                                    <td className="p-4 border-r border-black font-mono font-black" colSpan={3}>{formData.startDate} ~ {formData.endDate}</td>
                                </tr>
                                <tr className="border-b border-black text-black font-black">
                                    <th className="bg-slate-50 p-4 text-left border-r border-black font-black uppercase font-black">차량번호</th>
                                    <td className="p-4 border-r border-black font-mono font-black">{formData.carNumber || '-'}</td>
                                    <th className="bg-slate-50 p-4 text-left border-r border-black font-black uppercase font-black">행선지</th>
                                    <td className="p-4 font-black">{formData.startLocation} → {formData.endLocation}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* 01. 주유비 섹션 + 네비/지도 증빙 (다운로드 지원) */}
                        <section className="print-section font-black text-black">
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black font-black">01. 주유비 및 감가상각비 산출 상세</h2>
                            <table className="w-full border-collapse border border-black text-[11px] font-black">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-black font-black uppercase font-black">
                                        <th className="p-3 border-r border-black font-black">유종</th><th className="p-3 border-r border-black font-black">단가</th><th className="p-3 border-r border-black font-black text-blue-600">거리</th><th className="p-3 font-black">연비</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="text-center font-black">
                                        <td className="p-4 border-r border-black font-black">{formData.fuelType}</td>
                                        <td className="p-4 border-r border-black font-mono font-black">₩{Number(formData.fuelPrice || 0).toLocaleString()}</td>
                                        <td className="p-4 border-r border-black font-mono font-black">{formData.distance} KM</td>
                                        <td className="p-4 font-mono font-black">{formData.fuelEfficiency} km/ℓ</td>
                                    </tr>
                                    <tr className="border-t border-black font-black">
                                        <td colSpan={4} className="p-4 bg-slate-50/20 text-right font-black">
                                            <span className="text-[13px] font-black underline underline-offset-4 decoration-2 font-black">주유 정산 소계 : ₩ {formData.fuelAndDepreciation?.toLocaleString()}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            {/* 🚀 파일 리스트 (카이 스타일) */}
                            {mapUrls.map((file, i) => (
                                <div key={i} className="mt-4 border border-black bg-white shadow-sm font-black overflow-hidden">
                                    <div className="flex justify-between items-center p-2 bg-slate-50 border-b border-black no-print">
                                        <div className="flex items-center gap-2 truncate flex-1">
                                            {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={14} className="text-blue-500" /> : <FileText size={14} className="text-slate-400" />}
                                            <span className="text-[10px] font-black truncate">{file.name}</span>
                                        </div>
                                        <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-100 p-1 rounded bg-white border border-blue-200">
                                            <Download size={14} />
                                        </a>
                                    </div>
                                    <p className="hidden print:block text-[8px] text-slate-400 p-1 uppercase font-mono">Map Evidence {i+1}: {file.name}</p>
                                    {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                        <img src={file.url} className="w-full h-auto block" />
                                    ) : (
                                        <div className="w-full py-8 flex flex-col items-center justify-center gap-2 bg-slate-50 border-t border-black/5">
                                            <FileText size={32} className="text-slate-300" />
                                            <span className="text-[10px] font-black text-slate-500">PDF/문서 파일 (다운로드 확인)</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </section>

                        {/* 02. 기타 비용 섹션 + 영수증 증빙 (다운로드 지원) */}
                        <section className="print-section font-black text-black">
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">02. 기타 업무 지출 상세 내역 (식대 외)</h2>
                            <table className="w-full border-collapse border border-black text-[11px] font-black">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-black font-black uppercase font-black font-black"><th className="p-3 border-r border-black text-left font-black">항목</th><th className="p-3 border-r border-black text-right font-black">금액</th><th className="p-3 text-center w-24 font-black">증빙</th></tr>
                                </thead>
                                <tbody>
                                    {formData.otherExpenses?.map((exp, i) => (
                                        <tr key={i} className="border-b border-black last:border-b-0 font-black">
                                            <td className="p-3 border-r border-black font-black">{exp.item}</td>
                                            <td className="p-3 border-r border-black text-right font-mono text-blue-600 font-black">₩{Number(exp.amount || 0).toLocaleString()}</td>
                                            <td className="p-3 text-center text-[10px] font-black">{exp.receipt === 'O' ? '영수증' : '미첨부'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {receiptUrls.map((file, i) => (
                                <div key={i} className="mt-4 border border-black bg-white shadow-sm font-black overflow-hidden">
                                    <div className="flex justify-between items-center p-2 bg-slate-50 border-b border-black no-print">
                                        <div className="flex items-center gap-2 truncate flex-1">
                                            {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={14} className="text-blue-500" /> : <FileText size={14} className="text-slate-400" />}
                                            <span className="text-[10px] font-black truncate">{file.name}</span>
                                        </div>
                                        <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-100 p-1 rounded bg-white border border-blue-200">
                                            <Download size={14} />
                                        </a>
                                    </div>
                                    <p className="hidden print:block text-[8px] text-slate-400 p-1 uppercase font-mono">Receipt Evidence {i+1}: {file.name}</p>
                                    {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                        <img src={file.url} className="w-full h-auto block" />
                                    ) : (
                                        <div className="w-full py-8 flex flex-col items-center justify-center gap-2 bg-slate-50 border-t border-black/5">
                                            <FileText size={32} className="text-slate-300" />
                                            <span className="text-[10px] font-black text-slate-500">영수증 파일 (다운로드 확인)</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </section>

                        {/* 03. 정산 금액 섹션 */}
                        <section className="print-section font-black text-black">
                            <h2 className="text-[10px] mb-3 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">03. 최종 정산액 및 수령 정보</h2>
                            <table className="w-full border-collapse border border-black text-[11px] font-black font-black">
                                <tbody>
                                    <tr className="border-b border-black font-black font-black">
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase tracking-widest font-black">BANK</th>
                                        <td className="p-4 border-r border-black font-black">{formData.bankName} / {formData.accountNumber}</td>
                                        <th className="bg-slate-50 p-4 w-28 text-left border-r border-black font-black uppercase tracking-widest font-black">TOTAL</th>
                                        <td className="p-4 text-right text-[18px] underline underline-offset-4 decoration-2 font-black text-blue-700">
                                            ₩ {formData.totalAmount?.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr className="bg-slate-50/10 font-black">
                                        <th className="p-3 text-[9px] text-slate-400 font-black text-left border-r border-black">산출 근거</th>
                                        <td className="p-3 text-[9px] text-slate-400 font-black font-black" colSpan={3}>
                                            주유비(₩{formData.fuelAndDepreciation?.toLocaleString()}) + 기타지출(₩{formData.otherTotal?.toLocaleString()})
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <div className="pt-20 text-center space-y-6 print-section font-black text-black">
                            <div className="space-y-4 font-black">
                                <p className="text-[15px] font-black underline underline-offset-8 decoration-1 font-mono font-black">{doc?.created_at ? new Date(doc.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}) : '-'}</p>
                                <p className="text-2xl font-black uppercase tracking-[0.4em] mt-6 font-black font-black">기안자: {doc?.requester_name} (인)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-5 no-print font-black">
                    {/* 🚀 [수정] 관리자 입력창 문구 처리 */}
                    {isReferrer && (
                        <div className="bg-white border border-black p-6 shadow-sm font-black text-black">
                            <div className="flex flex-col gap-2 font-black font-black">
                                <p className="text-[9px] text-slate-400 mb-1 font-black uppercase">※ 관리부 승인 후 문서번호를 부여해 주십시오.</p>
                                <div className="flex gap-2 font-black font-black">
                                    <input type="text" value={manualDocNumber} onChange={(e) => setManualDocNumber(e.target.value)} className="flex-1 border border-black px-3 py-1.5 text-[11px] outline-none font-black text-black focus:bg-slate-50 font-black font-black" placeholder="관리부 추후 부여" />
                                    <button onClick={handleUpdateDocNumber} className="bg-black text-white px-4 py-1.5 text-[10px] font-black hover:bg-slate-800 transition-all font-black font-black">반영</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-black font-black">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2 text-black font-black">
                            <Users size={16} /><h2 className="text-[11px] uppercase font-black text-black font-black">결재 프로세스</h2>
                        </div>
                        <div className="space-y-2 mb-5 font-black text-black font-black">
                            {displayApprovals.map((step, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center ${step.status === '승인' || step.status === '완료' ? 'bg-slate-50 border-black' : 'bg-white opacity-60'} font-black`}>
                                    <div className="text-[12px] font-black font-black">{step.approver?.full_name || step.approver_name} <span className="text-[9px] text-slate-400 ml-1 font-black font-black">{idx + 1}차</span></div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${step.status === '승인' || step.status === '완료' ? 'bg-black text-white' : 'bg-amber-400 text-white'} font-black font-black`}>{step.status === 'pending' ? '대기' : step.status}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t border-dashed border-slate-200 font-black">
                            <p className="text-[9px] uppercase mb-2 font-black text-blue-600 tracking-widest font-black">Official CC (참조)</p>
                            <div className="text-[11px] font-black text-blue-900 bg-blue-50/50 p-3 rounded-xl leading-relaxed font-black font-black">
                                {displayReferrers.length > 0 ? displayReferrers.map(r => r.referrer?.full_name || r.referrer_name).join(', ') : '지정된 참조인 없음'}
                            </div>
                        </div>
                    </div>

                    {isMyTurn && (
                        <div className="bg-slate-900 border border-black rounded-2xl p-6 shadow-xl text-white font-black">
                            <h3 className="text-[11px] uppercase mb-4 font-black text-slate-400 font-black">결재 의견 작성</h3>
                            <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-[12px] font-black outline-none mb-4 h-28 focus:border-white transition-all text-white placeholder-slate-500 font-black font-black" placeholder="승인 또는 반려 의견을 입력하십시오." />
                            <div className="grid grid-cols-2 gap-3 font-black">
                                <button onClick={() => handleApprovalAction('승인')} className="bg-white text-black py-3 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 font-black font-black"><CheckCircle size={14}/> 승인</button>
                                <button onClick={() => handleApprovalAction('반려')} className="bg-rose-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-rose-700 transition-all flex items-center justify-center gap-2 font-black font-black"><XCircle size={14}/> 반려</button>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}