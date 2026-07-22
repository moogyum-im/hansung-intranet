'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, CheckCircle, Users, ArrowLeft, Bold, Palette, Highlighter, Save } from 'lucide-react';
import { saveApprovalDraft, loadApprovalDraft } from '@/lib/approvalDraft';

const SimpleRichTextEditor = ({ value, onChange, placeholder, minHeight = "160px" }) => {
    const editorRef = useRef(null);
    useEffect(() => {
        if (editorRef.current && value && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, []);
    const execCmd = (cmd, arg = null) => {
        document.execCommand(cmd, false, arg);
        editorRef.current.focus();
        onChange(editorRef.current.innerHTML);
    };
    return (
        <div className="border border-black flex flex-col font-black">
            <div className="bg-slate-50 border-b border-black p-2 flex gap-3 items-center">
                <button type="button" onClick={(e) => { e.preventDefault(); execCmd('bold'); }} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 hover:bg-slate-200 text-[10px] font-black rounded-sm transition-colors">
                    <Bold size={12} /> 굵게
                </button>
                <label className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 hover:bg-slate-200 text-[10px] font-black cursor-pointer rounded-sm transition-colors">
                    <Palette size={12} /> 글자색
                    <input type="color" onChange={(e) => execCmd('foreColor', e.target.value)} className="w-4 h-4 p-0 border-0 cursor-pointer ml-1" />
                </label>
                <button type="button" onClick={(e) => { e.preventDefault(); execCmd('hiliteColor', 'yellow'); }} className="flex items-center gap-1 px-2 py-1 bg-yellow-100 border border-yellow-400 text-yellow-800 hover:bg-yellow-200 text-[10px] font-black rounded-sm transition-colors">
                    <Highlighter size={12} /> 형광펜
                </button>
            </div>
            <div
                ref={editorRef}
                style={{ minHeight }}
                className="p-5 text-[12px] leading-relaxed outline-none focus:bg-slate-50/50 transition-all font-black whitespace-pre-wrap"
                contentEditable
                onInput={() => onChange(editorRef.current.innerHTML)}
                placeholder={placeholder}
            />
        </div>
    );
};

function MeetingMinutesPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('editId');
    const draftId = searchParams.get('draftId');
    const [editLoading, setEditLoading] = useState(!!editId || !!draftId);
    const [savingDraft, setSavingDraft] = useState(false);

    const [allEmployees, setAllEmployees] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);

    const [formData, setFormData] = useState({
        document_number: '',
        meeting_title: '',
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_time: '10:00',
        meeting_location: '',
        attendees: [{ company: '', name: '', position: '' }],
        agenda_items: [{ title: '', discussion: '', decisions: '' }],
        next_steps: '',
    });

    const groupedEmployees = useMemo(() => {
        const groups = allEmployees.reduce((acc, emp) => {
            const dept = emp.department || '기타';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(emp);
            return acc;
        }, {});
        const priority = { '최고 경영진': 1, '전략기획부': 4, '공무부': 2, '관리부': 3 };
        return Object.keys(groups)
            .sort((a, b) => (priority[a] || 999) - (priority[b] || 999) || a.localeCompare(b))
            .reduce((acc, key) => { acc[key] = groups[key]; return acc; }, {});
    }, [allEmployees]);

    useEffect(() => {
        if (!employeeLoading && employee) {
            supabase.from('profiles').select('id, full_name, department, position').eq('employment_status', '재직')
                .then(({ data }) => { if (data) setAllEmployees(data); });
        }
    }, [employee, employeeLoading]);

    useEffect(() => {
        if (!draftId) return;
        const load = async () => {
            try {
                const d = await loadApprovalDraft(draftId);
                setFormData(prev => ({ ...prev, ...d.content }));
                setApprovers(d.approvers);
                setReferrers(d.referrers);
                setAttachments(d.attachments);
            } catch (e) { toast.error(e.message); } finally { setEditLoading(false); }
        };
        load();
    }, [draftId]);

    useEffect(() => {
        if (!editId) return;
        const load = async () => {
            const { data: doc } = await supabase.from('approval_documents').select('*').eq('id', editId).single();
            const { data: approversData } = await supabase.from('approval_document_approvers').select('*, approver:profiles!approver_id(id, full_name, department, position)').eq('document_id', editId).order('sequence', { ascending: true });
            const { data: referrersData } = await supabase.from('approval_document_referrers').select('*, referrer:profiles!referrer_id(id, full_name, department, position)').eq('document_id', editId);
            if (doc) {
                const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content || {};
                setFormData(prev => ({ ...prev, ...content }));
                setAttachments(doc.attachments || []);
                setExistingAttachments(doc.attachments || []);
            }
            if (approversData) setApprovers(approversData.map(a => ({ id: a.approver_id, full_name: a.approver?.full_name, position: a.approver?.position })));
            if (referrersData) setReferrers(referrersData.map(r => ({ id: r.referrer_id, full_name: r.referrer?.full_name, position: r.referrer?.position })));
            setEditLoading(false);
        };
        load();
    }, [editId]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // 참석자 관리
    const updateAttendee = (idx, field, val) => {
        const next = [...formData.attendees];
        next[idx] = { ...next[idx], [field]: val };
        setFormData(prev => ({ ...prev, attendees: next }));
    };
    const addAttendee = () => setFormData(prev => ({ ...prev, attendees: [...prev.attendees, { company: '', name: '', position: '' }] }));
    const removeAttendee = (idx) => setFormData(prev => ({ ...prev, attendees: prev.attendees.filter((_, i) => i !== idx) }));

    // 안건 관리
    const updateAgenda = (idx, field, val) => {
        const next = [...formData.agenda_items];
        next[idx] = { ...next[idx], [field]: val };
        setFormData(prev => ({ ...prev, agenda_items: next }));
    };
    const addAgenda = () => setFormData(prev => ({ ...prev, agenda_items: [...prev.agenda_items, { title: '', discussion: '', decisions: '' }] }));
    const removeAgenda = (idx) => setFormData(prev => ({ ...prev, agenda_items: prev.agenda_items.filter((_, i) => i !== idx) }));

    // 결재선
    const addApprover = () => {
        if (approvers.length >= 4) return toast.error("결재선은 최대 4명까지 가능합니다.");
        setApprovers([...approvers, { id: '', full_name: '', position: '' }]);
    };
    const handleApproverChange = (idx, id) => {
        const next = [...approvers];
        const emp = allEmployees.find(e => e.id === id);
        next[idx] = { id, full_name: emp?.full_name || '', position: emp?.position || '' };
        setApprovers(next);
    };
    const removeApprover = (idx) => setApprovers(approvers.filter((_, i) => i !== idx));

    const addReferrer = () => setReferrers([...referrers, { id: '', full_name: '', position: '' }]);
    const handleReferrerChange = (idx, id) => {
        const next = [...referrers];
        const emp = allEmployees.find(e => e.id === id);
        next[idx] = { id, full_name: emp?.full_name || '', position: emp?.position || '' };
        setReferrers(next);
    };
    const removeReferrer = (idx) => setReferrers(referrers.filter((_, i) => i !== idx));

    const handleUploadComplete = useCallback((uploadedFiles) => {
        if (Array.isArray(uploadedFiles)) {
            const formatted = uploadedFiles.map(f => ({ name: f.name.normalize('NFC'), path: f.path, size: f.size }));
            setAttachments(prev => {
                const existing = new Set(prev.map(f => f.path));
                return [...prev, ...formatted.filter(f => !existing.has(f.path))];
            });
            setIsUploading(false);
        }
    }, []);

    const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));
    const handleRemoveExistingAttachment = (path) => {
        setExistingAttachments(prev => prev.filter(f => (typeof f === 'object' ? f.path : f) !== path));
        setAttachments(prev => prev.filter(f => (typeof f === 'object' ? f.path : f) !== path));
    };

    const handleSaveDraft = async () => {
        setSavingDraft(true);
        try {
            const { id } = await saveApprovalDraft({
                draftId,
                document_type: 'meeting_minutes',
                title: `[회의록] ${formData.meeting_title}`,
                content: formData,
                attachments,
                approvers,
                referrers: referrers.filter(r => r.id),
            });
            toast.success("임시저장 되었습니다.");
            if (!draftId) router.replace(`/approvals/meeting-minutes?draftId=${id}`);
        } catch (e) { toast.error(e.message); } finally { setSavingDraft(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isUploading) return toast.error("파일 업로드가 완료될 때까지 기다려주세요.");
        if (approvers.length === 0 || approvers.some(a => !a.id)) return toast.error("결재자를 지정해주세요.");
        if (!formData.meeting_title.trim()) return toast.error("회의명을 입력해주세요.");

        setLoading(true);
        try {
            const submissionData = {
                title: `[회의록] ${formData.meeting_title}`,
                document_number: formData.document_number,
                content: JSON.stringify({
                    ...formData,
                    requesterName: employee.full_name,
                    requesterDepartment: employee.department,
                    requesterPosition: employee.position,
                }),
                document_type: 'meeting_minutes',
                approver_ids: approvers,
                referrer_ids: referrers.filter(r => r.id),
                attachments,
                requester_id: employee.id,
                requester_name: employee.full_name,
                requester_department: employee.department,
                requester_position: employee.position,
            };

            if (editId) {
                const res = await fetch('/api/update-approval', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: editId, ...submissionData }) });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || '수정 실패'); }
                toast.success("문서가 수정되었습니다.");
                router.push(`/approvals/${editId}`);
            } else {
                const res = await fetch('/api/submit-approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...submissionData, draftId: draftId || undefined }) });
                if (!res.ok) throw new Error('상신 실패');
                toast.success("회의록 상신 완료");
                router.push('/mypage');
            }
        } catch (err) { toast.error(err.message); } finally { setLoading(false); }
    };

    if (employeeLoading || editLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center animate-pulse">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none">

            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2">
                <button onClick={() => router.back()} className="text-black hover:bg-white/50 p-2 rounded-full transition-all"><ArrowLeft size={24}/></button>
                <div className="flex items-center gap-2">
                    {!editId && (
                        <button onClick={handleSaveDraft} disabled={savingDraft || loading} className="flex items-center gap-2 px-5 py-2 bg-white text-black border border-black text-[11px] shadow-sm transition-all active:scale-95 font-black disabled:opacity-60">
                            {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> 임시저장</>}
                        </button>
                    )}
                    <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : editId ? <><CheckCircle size={14} /> 수정 저장</> : <><CheckCircle size={14} /> 회의록 상신</>}
                    </button>
                </div>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 본문 */}
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm">

                    {/* 헤더 */}
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black tracking-tighter uppercase">회 의 록</h1>
                            <div className="flex flex-col text-[11px] space-y-1 font-black">
                                <span>작성부서 : {employee?.department}</span>
                                <span>작성자 : {employee?.full_name} {employee?.position}</span>
                            </div>
                        </div>
                        <div className="flex">
                            <table className="border-collapse border border-black text-[11px] font-black">
                                <tbody>
                                    <tr>
                                        <th rowSpan="2" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvers.map((app, i) => (
                                            <th key={i} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black">{app.position || '결재'}</th>
                                        ))}
                                        {approvers.length < 1 && <th className="w-24 h-8 bg-slate-50 border border-dashed border-slate-200"></th>}
                                    </tr>
                                    <tr className="h-20 font-black text-black">
                                        <td className="border border-black p-1 text-center align-middle">
                                            <div className="text-slate-300 font-black border-2 border-slate-200 rounded-full w-10 h-10 flex items-center justify-center mx-auto text-[7px] leading-tight uppercase">Draft</div>
                                            <div className="mt-1 font-black text-[9px]">{employee?.full_name}</div>
                                        </td>
                                        {approvers.map((app, i) => (
                                            <td key={i} className="border border-black p-1 text-center align-middle">
                                                <div className="text-slate-100 font-black border-2 border-slate-100 border-dashed rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] leading-tight uppercase italic">Sign</div>
                                                <div className="mt-1 font-black text-[10px]">{app.full_name || '미지정'}</div>
                                            </td>
                                        ))}
                                        {approvers.length < 1 && <td className="border border-dashed border-slate-100"></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 기본 정보 테이블 */}
                    <div className="space-y-10 text-black font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 text-left font-black uppercase w-28">문서번호</th>
                                    <td className="p-3 font-black" colSpan="3">
                                        <input type="text" name="document_number" value={formData.document_number} onChange={handleChange} placeholder="예: MM-202606-001 (직접 입력)" className="w-full outline-none bg-transparent font-black font-mono" />
                                    </td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 text-left font-black uppercase">회의명</th>
                                    <td className="p-3 font-black" colSpan="3">
                                        <input type="text" name="meeting_title" value={formData.meeting_title} onChange={handleChange} placeholder="회의 제목 입력" className="w-full outline-none bg-transparent font-black" />
                                    </td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 text-left font-black uppercase">일시</th>
                                    <td className="p-3 font-black">
                                        <div className="flex gap-3 items-center">
                                            <input type="date" name="meeting_date" value={formData.meeting_date} onChange={handleChange} className="outline-none bg-transparent font-black font-mono" />
                                            <input type="time" name="meeting_time" value={formData.meeting_time} onChange={handleChange} className="outline-none bg-transparent font-black font-mono" />
                                        </div>
                                    </td>
                                    <th className="bg-slate-50 p-3 text-left font-black uppercase">장소</th>
                                    <td className="p-3 font-black">
                                        <input type="text" name="meeting_location" value={formData.meeting_location} onChange={handleChange} placeholder="회의 장소" className="w-full outline-none bg-transparent font-black" />
                                    </td>
                                </tr>
                                <tr className="border-b border-r border-black">
                                    <th className="bg-slate-50 p-3 text-left font-black uppercase align-top pt-4">참석자</th>
                                    <td className="p-3 font-black" colSpan="3">
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-3 gap-2 pb-1 border-b border-slate-100">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">회사명</span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase">이름</span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase">직책</span>
                                            </div>
                                            {formData.attendees.map((att, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="grid grid-cols-3 gap-2 flex-1">
                                                        <input type="text" value={att.company || ''} onChange={(e) => updateAttendee(idx, 'company', e.target.value)} placeholder="회사명" className="outline-none bg-transparent font-black border-b border-slate-200 pb-1 text-[12px]" />
                                                        <input type="text" value={att.name || ''} onChange={(e) => updateAttendee(idx, 'name', e.target.value)} placeholder="이름" className="outline-none bg-transparent font-black border-b border-slate-200 pb-1 text-[12px]" />
                                                        <input type="text" value={att.position || ''} onChange={(e) => updateAttendee(idx, 'position', e.target.value)} placeholder="직책" className="outline-none bg-transparent font-black border-b border-slate-200 pb-1 text-[12px]" />
                                                    </div>
                                                    {formData.attendees.length > 1 && (
                                                        <button type="button" onClick={() => removeAttendee(idx)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0"><X size={14}/></button>
                                                    )}
                                                </div>
                                            ))}
                                            <button type="button" onClick={addAttendee} className="text-[10px] text-slate-400 hover:text-black transition-colors flex items-center gap-1 mt-1 font-black">
                                                <Plus size={12} /> 참석자 추가
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* 안건별 섹션 */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-[10px] uppercase tracking-tighter font-black">회의 안건 및 논의 내용</h2>
                                <button type="button" onClick={addAgenda} className="text-[10px] bg-black text-white px-4 py-1.5 flex items-center gap-2 hover:bg-slate-800 transition-all font-black">
                                    <Plus size={14} /> 안건 추가
                                </button>
                            </div>
                            <div className="space-y-8">
                                {formData.agenda_items.map((item, idx) => (
                                    <div key={idx} className="border border-black relative">
                                        {formData.agenda_items.length > 1 && (
                                            <button type="button" onClick={() => removeAgenda(idx)} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1 shadow-lg z-10 no-print"><X size={14}/></button>
                                        )}
                                        <div className="bg-slate-50 border-b border-black px-4 py-2 flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-400 shrink-0">{idx + 1}.</span>
                                            <input
                                                type="text"
                                                value={item.title}
                                                onChange={(e) => updateAgenda(idx, 'title', e.target.value)}
                                                placeholder="안건 제목"
                                                className="flex-1 outline-none bg-transparent font-black text-[12px]"
                                            />
                                        </div>
                                        <div className="border-b border-black">
                                            <div className="bg-slate-50/50 border-b border-slate-200 px-4 py-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">논의 내용</span>
                                            </div>
                                            <SimpleRichTextEditor
                                                value={item.discussion}
                                                onChange={(val) => updateAgenda(idx, 'discussion', val)}
                                                placeholder="논의된 내용을 상세히 기록하십시오."
                                                minHeight="120px"
                                            />
                                        </div>
                                        <div>
                                            <div className="bg-slate-50/50 border-b border-slate-200 px-4 py-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">결정사항</span>
                                            </div>
                                            <textarea
                                                value={item.decisions}
                                                onChange={(e) => updateAgenda(idx, 'decisions', e.target.value)}
                                                placeholder="합의 및 결정된 사항을 입력하십시오."
                                                className="w-full p-4 text-[12px] leading-relaxed min-h-[80px] outline-none font-black bg-transparent resize-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 후속조치 */}
                        <section>
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">후속 조치 사항</h2>
                            <textarea
                                name="next_steps"
                                value={formData.next_steps}
                                onChange={handleChange}
                                placeholder="회의 후 진행해야 할 조치 사항, 담당자, 기한 등을 입력하십시오."
                                className="w-full border border-black p-5 text-[12px] leading-relaxed min-h-[100px] outline-none font-black bg-transparent resize-none"
                            />
                        </section>

                        {/* 첨부파일 */}
                        <section className="border-t border-black/5 pt-6">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black">첨부 자료</h2>
                            <FileUploadDnd
                                onUploadComplete={handleUploadComplete}
                                onUploadingStateChange={setIsUploading}
                                initialFiles={editId ? existingAttachments : []}
                                onRemoveInitialFile={editId ? handleRemoveExistingAttachment : undefined}
                            />
                            {attachments.length > 0 && (
                                <ul className="mt-3 space-y-1">
                                    {attachments.map((file, i) => (
                                        <li key={i} className="flex items-center justify-between text-[11px] font-black bg-slate-50 border border-slate-200 px-3 py-2">
                                            <span className="truncate">{file.name}</span>
                                            <button type="button" onClick={() => removeAttachment(i)} className="text-red-400 hover:text-red-600 ml-2"><X size={12}/></button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <div className="pt-10 text-center font-black">
                            <p className="text-xl font-black uppercase tracking-widest">작성자: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                {/* 사이드바 */}
                <aside className="lg:col-span-4 space-y-4 no-print font-black">
                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm text-black">
                        <div className="flex items-center justify-between mb-4 border-b-2 border-black/5 pb-2">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black"><Users size={14}/> 결재선 지정</h2>
                            <button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black">+ 추가</button>
                        </div>
                        <div className="space-y-3">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 w-4 font-black">{i + 1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black" required>
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
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm text-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black"><Users size={14}/> 참조인 지정</h2>
                            <button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black text-black">+ 추가</button>
                        </div>
                        <div className="space-y-2">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black">
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
                </aside>
            </div>
        </div>
    );
}

export default function MeetingMinutesPageWrapper() {
    return (
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">HANSUNG ERP SYNCING...</div>}>
            <MeetingMinutesPage />
        </React.Suspense>
    );
}
