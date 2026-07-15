'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, CheckCircle, Users, Loader2, FileText } from 'lucide-react';

function PdfUploadPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

    const groupedEmployees = useMemo(() => {
        const groups = allEmployees.reduce((acc, emp) => {
            const dept = emp.department || '기타';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(emp);
            return acc;
        }, {});
        const priority = { '최고 경영진': 1, '공무부': 2, '관리부': 3, '전략기획부': 4 };
        return Object.keys(groups)
            .sort((a, b) => (priority[a] || 999) - (priority[b] || 999) || a.localeCompare(b))
            .reduce((acc, key) => { acc[key] = groups[key]; return acc; }, {});
    }, [allEmployees]);

    useEffect(() => {
        if (!employeeLoading && employee) {
            supabase.from('profiles').select('id, full_name, department, position').eq('employment_status', '재직')
                .then(({ data }) => setAllEmployees(data || []));
        }
    }, [employee, employeeLoading]);

    const handleUploadComplete = useCallback(async (uploadedFiles) => {
        if (Array.isArray(uploadedFiles)) {
            const formatted = uploadedFiles.map(f => ({ name: f.name.normalize('NFC'), path: f.path, size: f.size }));
            setAttachments(prev => {
                const existing = new Set(prev.map(f => typeof f === 'object' ? f.path : f));
                return [...prev, ...formatted.filter(f => !existing.has(f.path))];
            });
            setIsUploading(false);

            const firstPdf = formatted.find(f => f.name?.toLowerCase().endsWith('.pdf')) || formatted[0];
            if (firstPdf && !pdfPreviewUrl) {
                const cleanPath = firstPdf.path.replace('approval_attachments/', '').trim();
                const { data } = await supabase.storage.from('approval_attachments').createSignedUrl(cleanPath, 3600);
                if (data?.signedUrl) setPdfPreviewUrl(data.signedUrl);
            }
        }
    }, [pdfPreviewUrl]);

    const removeAttachment = (idx) => {
        setAttachments(prev => {
            const next = prev.filter((_, i) => i !== idx);
            if (next.length === 0) setPdfPreviewUrl(null);
            return next;
        });
    };

    const addApprover = () => {
        if (approvers.length >= 4) return toast.error('결재선은 최대 4명까지 가능합니다.');
        setApprovers(prev => [...prev, { id: '', full_name: '', position: '' }]);
    };
    const handleApproverChange = (index, id) => {
        const emp = allEmployees.find(e => e.id === id);
        setApprovers(prev => prev.map((a, i) => i === index ? { id, full_name: emp?.full_name || '', position: emp?.position || '' } : a));
    };
    const removeApprover = (index) => setApprovers(prev => prev.filter((_, i) => i !== index));

    const addReferrer = () => setReferrers(prev => [...prev, { id: '', full_name: '', position: '' }]);
    const handleReferrerChange = (index, id) => {
        const emp = allEmployees.find(e => e.id === id);
        setReferrers(prev => prev.map((r, i) => i === index ? { id, full_name: emp?.full_name || '', position: emp?.position || '' } : r));
    };
    const removeReferrer = (index) => setReferrers(prev => prev.filter((_, i) => i !== index));

    const handleSubmit = async () => {
        if (!title.trim()) return toast.error('문서 제목을 입력해주세요.');
        if (attachments.length === 0) return toast.error('PDF 파일을 첨부해주세요.');
        if (isUploading) return toast.error('파일 업로드가 완료될 때까지 기다려주세요.');
        if (approvers.length === 0 || approvers.some(a => !a.id)) return toast.error('결재자를 지정해주세요.');

        setLoading(true);
        try {
            const res = await fetch('/api/submit-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content: JSON.stringify({ title, note }),
                    document_type: 'pdf_form',
                    approver_ids: approvers,
                    referrer_ids: referrers.filter(r => r.id),
                    requester_id: employee.id,
                    requester_name: employee.full_name,
                    requester_department: employee.department,
                    requester_position: employee.position,
                    attachments,
                }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || '상신 실패'); }
            toast.success('문서가 상신되었습니다.');
            router.push('/mypage');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return (
        <div className="min-h-screen flex items-center justify-center text-xs font-black animate-pulse uppercase tracking-widest">
            HANSUNG ERP SYNCING...
        </div>
    );

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none">
            {/* 상단 버튼 */}
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center px-2">
                <div />
                <button onClick={handleSubmit} disabled={loading || isUploading}
                    className="flex items-center gap-2 px-6 py-2 bg-black text-white hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? '파일 업로드 중...' : <><CheckCircle size={14} /> 결재 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 왼쪽: 문서 본문 */}
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm">
                    {/* 헤더 */}
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black tracking-tighter uppercase">서 식 결 재</h1>
                            <div className="flex flex-col text-[11px] space-y-1">
                                <span>기안부서 : {employee?.department}</span>
                                <span>작성일자 : {new Date().toLocaleDateString('ko-KR')}</span>
                            </div>
                        </div>
                        <table className="border-collapse border border-black text-[11px]">
                            <tbody>
                                <tr>
                                    <th rowSpan="2" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight">결<br/>재</th>
                                    <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                    {approvers.map((a, i) => (
                                        <th key={i} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black">
                                            {a.position || '결재'}
                                        </th>
                                    ))}
                                    {approvers.length === 0 && <th className="w-24 h-8 bg-slate-50 border border-dashed border-slate-200" />}
                                </tr>
                                <tr className="h-20">
                                    <td className="border border-black p-1 text-center align-middle">
                                        <div className="text-slate-300 border-2 border-slate-200 rounded-full w-10 h-10 flex items-center justify-center mx-auto text-[7px] leading-tight uppercase font-black">Draft</div>
                                        <div className="mt-1 text-[9px] font-black">{employee?.full_name}</div>
                                    </td>
                                    {approvers.map((a, i) => (
                                        <td key={i} className="border border-black p-1 text-center align-middle">
                                            <div className="text-slate-100 border-2 border-slate-100 border-dashed rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] italic uppercase font-black">Sign</div>
                                            <div className="mt-1 text-[10px] font-black">{a.full_name || '미지정'}</div>
                                        </td>
                                    ))}
                                    {approvers.length === 0 && <td className="border border-dashed border-slate-100" />}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-10">
                        {/* 기안자 정보 */}
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <tbody>
                                <tr className="border-b border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안부서</th>
                                    <td className="p-3">{employee?.department}</td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안자</th>
                                    <td className="p-3">{employee?.full_name} {employee?.position}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* 제목 */}
                        <section>
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">01. 문서 제목 <span className="text-red-500">*</span></h2>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="예: 무급휴가신청서 (홍길동)"
                                className="w-full border border-black p-4 text-[13px] font-black outline-none focus:bg-slate-50"
                            />
                        </section>

                        {/* PDF 첨부 + 즉시 뷰어 */}
                        <section>
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">02. PDF 서류 첨부 <span className="text-red-500">*</span></h2>
                            {!pdfPreviewUrl ? (
                                <>
                                    <div className="mb-3 flex items-center gap-2 text-[11px] text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                        <FileText size={13} className="text-blue-500 shrink-0" />
                                        서식함에서 내려받은 서식을 작성 후 PDF로 저장하여 첨부해주세요.
                                    </div>
                                    <FileUploadDnd
                                        onUploadComplete={handleUploadComplete}
                                        onUploadingStateChange={setIsUploading}
                                    />
                                </>
                            ) : (
                                <div className="border border-black">
                                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-black/10">
                                        <span className="text-[11px] font-black truncate">{attachments[0] ? (typeof attachments[0] === 'object' ? attachments[0].name : attachments[0]) : 'PDF'}</span>
                                        <button onClick={() => { setAttachments([]); setPdfPreviewUrl(null); }}
                                            className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1 font-black shrink-0 ml-3">
                                            <X size={12} /> 파일 변경
                                        </button>
                                    </div>
                                    <iframe
                                        src={`${pdfPreviewUrl}#navpanes=0&scrollbar=1&view=FitH`}
                                        className="w-full"
                                        style={{ height: '72vh' }}
                                        title="PDF 미리보기"
                                    />
                                </div>
                            )}
                        </section>

                        {/* 비고 */}
                        <section>
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter border-l-4 border-black pl-2 font-black">03. 비고 / 전달 사항 <span className="text-slate-400 normal-case font-medium">(선택)</span></h2>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="결재자에게 전달할 사항이 있으면 입력하세요."
                                rows={4}
                                className="w-full border border-black p-4 text-[12px] outline-none focus:bg-slate-50 resize-none font-medium"
                            />
                        </section>

                        <div className="pt-10 text-center">
                            <p className="text-xl font-black uppercase tracking-widest">기안자: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                {/* 오른쪽: 결재선/참조인 */}
                <aside className="lg:col-span-4 space-y-4">
                    {/* 결재선 */}
                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4 border-b-2 border-black/5 pb-2">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black">
                                <Users size={14} /> 결재선 지정
                            </h2>
                            <button type="button" onClick={addApprover}
                                className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black">
                                + 추가
                            </button>
                        </div>
                        <div className="space-y-3">
                            {approvers.map((a, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 w-4">{i + 1}</span>
                                    <select value={a.id} onChange={e => handleApproverChange(i, e.target.value)}
                                        className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black">
                                        <option value="">결재자 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-red-500" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                            {approvers.length === 0 && (
                                <p className="text-[10px] text-slate-300 text-center py-3 italic">결재자를 추가해주세요</p>
                            )}
                        </div>
                    </div>

                    {/* 참조인 */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black">
                                <Users size={14} /> 참조인 지정
                            </h2>
                            <button type="button" onClick={addReferrer}
                                className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black">
                                + 추가
                            </button>
                        </div>
                        <div className="space-y-2">
                            {referrers.map((r, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <select value={r.id} onChange={e => handleReferrerChange(i, e.target.value)}
                                        className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black">
                                        <option value="">참조인 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black" onClick={() => removeReferrer(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 p-5 rounded-2xl shadow-lg">
                        <p className="text-[10px] text-white/50 leading-relaxed uppercase tracking-tight">
                            ※ 서식함에서 내려받은 서류를 작성·PDF 변환 후 위에 첨부하여 결재를 요청하는 메뉴입니다.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default function PdfUploadPageWrapper() {
    return (
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">HANSUNG ERP SYNCING...</div>}>
            <PdfUploadPage />
        </React.Suspense>
    );
}
