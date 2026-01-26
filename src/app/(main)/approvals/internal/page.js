'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import dynamic from 'next/dynamic';
import { X, Plus, Loader2, Database, CheckCircle, FileIcon, ChevronRight, Users, ImageIcon } from 'lucide-react';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function InternalApprovalPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);

    // 1. [데이터 보존] 로컬 스토리지 복구
    useEffect(() => {
        const saved = localStorage.getItem('internal_draft_backup');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(parsed.formData || { title: '', content: '' });
                setApprovers(parsed.approvers || []);
                setReferrers(parsed.referrers || []);
                setAttachments(parsed.attachments || []);
            } catch (e) { console.error("복구 실패", e); }
        }
    }, []);

    // 2. [실시간 저장] 상태 변경 시 백업
    useEffect(() => {
        const dataToSave = { formData, approvers, referrers, attachments };
        localStorage.setItem('internal_draft_backup', JSON.stringify(dataToSave));
    }, [formData, approvers, referrers, attachments]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position');
            setAllEmployees(data || []);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            const saved = localStorage.getItem('internal_draft_backup');
            if (!saved && employee.team_leader_id && employee.id !== employee.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id }]);
            }
        }
    }, [employee, employeeLoading]);

    const handleUploadComplete = useCallback((uploadedFiles) => {
        if (Array.isArray(uploadedFiles)) {
            const formattedFiles = uploadedFiles.map(file => ({
                name: file.name.normalize('NFC'),
                path: file.path,
                size: file.size
            }));
            setAttachments(prev => [...prev, ...formattedFiles]);
            setIsUploading(false);
        }
    }, []);

    const removeAttachment = (idx) => {
        setAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const addApprover = () => setApprovers([...approvers, { id: '' }]);
    const removeApprover = (index) => setApprovers(approvers.filter((_, i) => i !== index));

    const addReferrer = () => setReferrers([...referrers, { id: '' }]);
    const removeReferrer = (index) => setReferrers(referrers.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isUploading) return toast.error("파일 업로드가 완료될 때까지 기다려주세요.");
        if (!formData.title || !formData.content) return toast.error("제목과 내용을 입력해주세요.");
        if (approvers.length === 0 || approvers.some(app => !app.id)) return toast.error("결재자를 지정해주세요.");

        setLoading(true);
        try {
            const submissionData = {
                title: `내부결재: ${formData.title} (${employee?.full_name})`,
                content: JSON.stringify({
                    ...formData,
                    requesterName: employee.full_name,
                    requesterDepartment: employee.department,
                    requesterPosition: employee.position,
                }),
                document_type: 'internal_approval',
                approver_ids: approvers.map(app => ({
                    id: app.id,
                    full_name: allEmployees.find(e => e.id === app.id)?.full_name || '',
                    position: allEmployees.find(e => e.id === app.id)?.position || '',
                })),
                referrer_ids: referrers.filter(r => r.id).map(ref => ({
                    id: ref.id,
                    full_name: allEmployees.find(e => e.id === ref.id)?.full_name || '',
                })),
                requester_id: employee.id,
                requester_name: employee.full_name,
                requester_department: employee.department,
                requester_position: employee.position,
                attachments: attachments,
            };

            const response = await fetch('/api/submit-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!response.ok) throw new Error('상신 실패');
            localStorage.removeItem('internal_draft_backup');
            toast.success("내부결재 상신 완료");
            router.push('/mypage');
        } catch (error) { toast.error(error.message); } finally { setLoading(false); }
    };

    const quillModules = {
        toolbar: [[{ 'header': [1, 2, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['clean']],
    };

    if (employeeLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center font-sans animate-pulse">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <div className="flex items-center gap-2 text-slate-400">
                    <Database size={14} className="text-black" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-black">HANSUNG INTERNAL DOCUMENT</span>
                </div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "업로드 중..." : <><CheckCircle size={14} /> 내부결재 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative text-black font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black">
                        <p className="text-[9px] tracking-widest text-slate-400 uppercase font-black">Hansung Landscape & Construction</p>
                        <h1 className="text-3xl tracking-tighter uppercase font-black">내 부 결 재 서 작 성</h1>
                    </header>

                    <div className="space-y-10 font-black text-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안부서</th>
                                    <td className="p-3 font-black">{employee?.department}</td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안자</th>
                                    <td className="p-3 font-black">{employee?.full_name} {employee?.position}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase">기안일자</th>
                                    <td className="p-3 font-mono font-black">{new Date().toLocaleDateString('ko-KR')}</td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase tracking-tighter">문서번호</th>
                                    <td className="p-3 text-slate-400 font-black italic">상신 후 부여</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">01. 결재 건명</h2>
                            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="제목을 입력하십시오." className="w-full border border-black p-4 text-[12px] font-black outline-none focus:bg-slate-50 transition-all bg-transparent" required />
                        </section>

                        <section className="font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">02. 결재 상세 내용</h2>
                            <div className="border border-black font-black">
                                <ReactQuill value={formData.content} onChange={(content) => setFormData({...formData, content})} modules={quillModules} placeholder="내용을 입력하십시오." className="h-[400px] mb-12 font-black" />
                            </div>
                        </section>

                        {/* 위치 픽스: 서명란 위 4번 증빙 자료 */}
                        <section className="font-black border-t border-black/5 pt-6">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black">03. 증빙 자료 첨부 (EVIDENCE)</h2>
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
                            {attachments.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 font-black">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 border border-black/10 rounded-lg group">
                                            <div className="flex items-center gap-2 text-[10px] font-black overflow-hidden text-black"><ImageIcon size={14} className="text-blue-600 flex-shrink-0" /><span className="truncate">{file.name}</span></div>
                                            <X size={16} className="cursor-pointer text-slate-300 hover:text-red-500 font-black" onClick={() => removeAttachment(idx)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="pt-16 text-center space-y-6 font-black text-black">
                            <p className="text-[14px] font-black underline underline-offset-4 decoration-1 font-mono">{new Date().toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'})}</p>
                            <p className="text-xl font-black uppercase tracking-widest">기안자: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 font-black text-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black"><Users size={14}/> 결재선 지정</h2><button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black">
                                    <span className="text-[10px] text-slate-400 w-4 font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => { const n = [...approvers]; n[i].id = e.target.value; setApprovers(n); }} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black" required>
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name}</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black"><Users size={14}/> 참조인 지정</h2><button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black text-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black">
                                    <select value={ref.id} onChange={(e) => { const n = [...referrers]; n[i].id = e.target.value; setReferrers(n); }} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black">
                                        <option value="">참조인 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name}</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black" onClick={() => removeReferrer(i)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}