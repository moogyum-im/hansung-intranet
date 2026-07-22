'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, FileIcon, ChevronRight, Users, Calendar, AlertCircle, ImageIcon, Save } from 'lucide-react';
import { saveApprovalDraft, loadApprovalDraft } from '@/lib/approvalDraft';

function ResignationPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('editId');
    const draftId = searchParams.get('draftId');
    const [editLoading, setEditLoading] = useState(!!searchParams.get('editId') || !!searchParams.get('draftId'));
    const [savingDraft, setSavingDraft] = useState(false);
    const [allEmployees, setAllEmployees] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [formData, setFormData] = useState({
        title: '사직서',
        resignationDate: '',
        residentId: '',
        resignationReason: '',
    });
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);

    // 1. [데이터 보존] 로컬 스토리지 복구 (수정/임시저장 모드에서는 건너뜀)
    useEffect(() => {
        if (editId || draftId) return;
        const saved = localStorage.getItem('resignation_draft_backup');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(parsed.formData || { title: '사직서', resignationDate: '', residentId: '', resignationReason: '' });
                setApprovers(parsed.approvers || []);
                setReferrers(parsed.referrers || []);
                setAttachments(parsed.attachments || []);
            } catch (e) { console.error("복구 실패", e); }
        }
    }, [editId, draftId]);

    // 2. [실시간 저장] 상태 변경 시 백업 (수정/임시저장 모드에서는 건너뜀)
    useEffect(() => {
        if (editId || draftId) return;
        const dataToSave = { formData, approvers, referrers, attachments };
        localStorage.setItem('resignation_draft_backup', JSON.stringify(dataToSave));
    }, [editId, draftId, formData, approvers, referrers, attachments]);

    // 임시저장 문서 로드
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

    // 수정 모드: 기존 문서 데이터 로드
    useEffect(() => {
        if (!editId) return;
        const loadDocument = async () => {
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
        loadDocument();
    }, [editId]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position');
            setAllEmployees(data || []);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            const saved = localStorage.getItem('resignation_draft_backup');
            if (!saved && employee?.team_leader_id && employee.id !== employee.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id }]);
            }
        }
    }, [employee, employeeLoading]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUploadComplete = useCallback((uploadedFiles) => {
        if (Array.isArray(uploadedFiles)) {
            const formattedFiles = uploadedFiles.map(file => ({
                name: file.name.normalize('NFC'),
                path: file.path,
                size: file.size
            }));
            setAttachments(prev => {
                const existingPaths = new Set(prev.map(f => typeof f === 'object' ? f.path : f));
                return [...prev, ...formattedFiles.filter(f => !existingPaths.has(f.path))];
            });
            setIsUploading(false);
        }
    }, []);

    const removeAttachment = (idx) => {
        setAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const handleRemoveExistingAttachment = (path) => {
        setExistingAttachments(prev => prev.filter(f => (typeof f === 'object' ? f.path : f) !== path));
        setAttachments(prev => prev.filter(f => (typeof f === 'object' ? f.path : f) !== path));
    };

    const addApprover = () => setApprovers([...approvers, { id: '' }]);
    const handleApproverChange = (index, id) => {
        const newApprovers = [...approvers];
        newApprovers[index] = { id };
        setApprovers(newApprovers);
    };
    const removeApprover = (index) => setApprovers(approvers.filter((_, i) => i !== index));

    const addReferrer = () => setReferrers([...referrers, { id: '' }]);
    const handleReferrerChange = (index, id) => {
        const newReferrers = [...referrers];
        newReferrers[index] = { id };
        setReferrers(newReferrers);
    };
    const removeReferrer = (index) => setReferrers(referrers.filter((_, i) => i !== index));

    const handleSaveDraft = async () => {
        setSavingDraft(true);
        try {
            const { id } = await saveApprovalDraft({
                draftId,
                document_type: 'resignation',
                title: `사직서 (${employee?.full_name})`,
                content: formData,
                attachments,
                approvers: approvers.map(app => {
                    const emp = allEmployees.find(e => e.id === app.id);
                    return { id: app.id, full_name: emp?.full_name, position: emp?.position };
                }),
                referrers: referrers.filter(r => r.id).map(ref => {
                    const emp = allEmployees.find(e => e.id === ref.id);
                    return { id: ref.id, full_name: emp?.full_name, position: emp?.position };
                }),
            });
            toast.success("임시저장 되었습니다.");
            if (!draftId) router.replace(`/approvals/resignation?draftId=${id}`);
        } catch (e) { toast.error(e.message); } finally { setSavingDraft(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isUploading) return toast.error("파일 업로드가 완료될 때까지 기다려주세요.");
        if (approvers.length === 0 || approvers.some(app => !app.id)) return toast.error("결재자를 지정해주세요.");

        setLoading(true);
        try {
            const submissionData = {
                title: `사직서 (${employee?.full_name})`,
                content: JSON.stringify({
                    ...formData,
                    requesterName: employee.full_name,
                    requesterDepartment: employee.department,
                    requesterPosition: employee.position,
                }),
                document_type: 'resignation',
                approver_ids: approvers.map(app => {
                    const emp = allEmployees.find(e => e.id === app.id);
                    return { id: app.id, full_name: emp?.full_name, position: emp?.position };
                }),
                referrer_ids: referrers.filter(r => r.id).map(ref => {
                    const emp = allEmployees.find(e => e.id === ref.id);
                    return { id: ref.id, full_name: emp?.full_name, position: emp?.position, department: emp?.department };
                }),
                requester_id: employee.id,
                requester_name: employee.full_name,
                requester_department: employee.department,
                requester_position: employee.position,
                attachments: attachments,
            };

            if (editId) {
                const res = await fetch('/api/update-approval', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: editId, ...submissionData }) });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || '수정 실패'); }
                toast.success("문서가 수정되었습니다.");
                router.push(`/approvals/${editId}`);
            } else {
                const response = await fetch('/api/submit-approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...submissionData, draftId: draftId || undefined }) });
                if (!response.ok) throw new Error('상신 실패');
                localStorage.removeItem('resignation_draft_backup');
                toast.success("사직서가 정상 상신되었습니다.");
                router.push('/mypage');
            }
        } catch (error) { toast.error(error.message); } finally { setLoading(false); }
    };

    if (employeeLoading || editLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center font-sans animate-pulse">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none font-black">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2">
                <div className="flex items-center gap-2 text-slate-400">
                    <Database size={14} className="text-black" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-black">HANSUNG ERP SYSTEM</span>
                </div>
                <div className="flex items-center gap-2">
                    {!editId && (
                        <button onClick={handleSaveDraft} disabled={savingDraft || loading} className="flex items-center gap-2 px-5 py-2 bg-white text-black border border-black text-[11px] shadow-sm transition-all active:scale-95 font-black disabled:opacity-60">
                            {savingDraft ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> 임시저장</>}
                        </button>
                    )}
                    <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "업로드 중..." : editId ? <><CheckCircle size={14} /> 수정 저장</>  : <><CheckCircle size={14} /> 사직서 상신하기</>}
                    </button>
                </div>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative text-black font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black">
                        <p className="text-[9px] tracking-widest text-slate-400 uppercase">Hansung Landscape & Construction</p>
                        <h1 className="text-3xl tracking-tighter uppercase font-black">사 직 서 작 성</h1>
                    </header>

                    <div className="space-y-10 text-black font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안부서</th>
                                    <td className="p-3 font-black">{employee?.department}</td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안자</th>
                                    <td className="p-3 font-black">{employee?.full_name} {employee?.position}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase">작성일자</th>
                                    <td className="p-3 font-mono font-black" colSpan={3}>{new Date().toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">01. 퇴직 사유 상세</h2>
                            <textarea name="resignationReason" value={formData.resignationReason} onChange={handleChange} className="w-full border border-black p-6 text-[12px] leading-relaxed min-h-[150px] outline-none focus:bg-slate-50 transition-all font-black" placeholder="퇴사 사유를 상세히 기술하십시오." required />
                        </section>

                        <section className="border-4 border-double border-black p-8 space-y-6 font-black bg-slate-50/30 font-black">
                            <h3 className="font-black text-center text-lg underline underline-offset-8">서 약 서</h3>
                            <div className="space-y-4 text-[11px] leading-relaxed font-black">
                                <p>본인은 퇴직에 따른 사무 인수, 인계의 절차로 최종 퇴사 시까지 책임과 의무를 완수하고, 재직 시 업무상 취득한 비밀사항을 타인에게 누설하여 귀사의 경영에 막대한 손해와 피해를 준다는 사실을 지각하고 일체 어느 누구에게도 누설하지 않겠습니다.</p>
                                <p>기타 회사와 관련한 제반 사항은 회사 규정에 의거 퇴직일 전일까지 처리하겠으며, 만일 본인이 상기 사항을 위반하였을 때에는 민, 형사상의 책임을 지며 손해배상의 의무를 지겠습니다.</p>
                            </div>
                        </section>

                        <section className="font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">02. 퇴직 예정 정보</h2>
                            <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                                <tbody>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black">
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">퇴사예정일</th>
                                        <td className="p-3"><input type="date" name="resignationDate" value={formData.resignationDate} onChange={handleChange} className="w-full outline-none bg-transparent font-black font-mono font-black" required /></td>
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">주민번호</th>
                                        <td className="p-3"><input type="text" name="residentId" value={formData.residentId} onChange={handleChange} placeholder="생년월일-뒷자리 첫째" className="w-full outline-none bg-transparent font-black font-mono font-black" required /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="font-black border-t border-black/5 pt-6 font-black">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black">03. 증빙 자료 첨부 (EVIDENCE)</h2>
                            <FileUploadDnd
                                onUploadComplete={handleUploadComplete}
                                onUploadingStateChange={setIsUploading}
                                initialFiles={editId ? existingAttachments : []}
                                onRemoveInitialFile={editId ? handleRemoveExistingAttachment : undefined}
                            />
                            {attachments.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 no-print font-black">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 border border-black/10 rounded-lg group">
                                            <div className="flex items-center gap-2 text-[10px] font-black overflow-hidden text-black font-black"><ImageIcon size={14} className="text-blue-600 flex-shrink-0" /><span className="truncate font-black">{file.name}</span></div>
                                            <X size={16} className="cursor-pointer text-slate-300 hover:text-red-500 transition-colors font-black" onClick={() => removeAttachment(idx)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="pt-10 text-center font-black">
                            <p className="text-xl font-black uppercase tracking-widest">기안자: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 font-black text-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black"><Users size={14}/> 결재선 지정</h2><button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black"><span className="text-[10px] text-slate-400 w-4 font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black font-black"><option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name}</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black font-black font-black"><Users size={14}/> 참조인 지정</h2><button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black"><option value="">참조인 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name}</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black" onClick={() => removeReferrer(i)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default function ResignationPageWrapper() {
  return <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">HANSUNG ERP SYNCING...</div>}><ResignationPage /></React.Suspense>;
}