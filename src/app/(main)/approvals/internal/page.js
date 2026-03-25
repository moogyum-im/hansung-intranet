'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, Users, ImageIcon, Info, Bold, Palette, Highlighter } from 'lucide-react';

// 🚀 [핵심 수정 1] 사내 맞춤형 초경량 리치 텍스트 에디터 (글자색, 배경색, 굵게)
const SimpleRichTextEditor = ({ value, onChange, placeholder, minHeight = "400px" }) => {
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
        <div className="border border-black flex flex-col font-black font-black">
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
                className="p-6 text-[13px] leading-relaxed outline-none focus:bg-slate-50/50 transition-all font-black whitespace-pre-wrap"
                contentEditable
                onInput={() => onChange(editorRef.current.innerHTML)}
                placeholder={placeholder}
            />
        </div>
    );
};

export default function InternalApprovalPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({ 
        document_number: '', // 🚀 문서 번호 추가
        title: '', 
        content: '' 
    });
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);

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
        const saved = localStorage.getItem('internal_draft_backup');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(parsed.formData || { document_number: '', title: '', content: '' });
                setApprovers(parsed.approvers || []);
                setReferrers(parsed.referrers || []);
                setAttachments(parsed.attachments || []);
            } catch (e) { console.error("복구 실패", e); }
        }
    }, []);

    useEffect(() => {
        const dataToSave = { formData, approvers, referrers, attachments };
        localStorage.setItem('internal_draft_backup', JSON.stringify(dataToSave));
    }, [formData, approvers, referrers, attachments]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position').eq('employment_status', '재직');
            if (data) setAllEmployees(data);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            const saved = localStorage.getItem('internal_draft_backup');
            if (!saved && employee.team_leader_id && employee.id !== employee.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id, full_name: '', position: '' }]);
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

    const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

    const addApprover = () => {
        if (approvers.length >= 4) return toast.error("결재선은 최대 4명까지 가능합니다.");
        setApprovers([...approvers, { id: '', full_name: '', position: '' }]);
    };

    const handleApproverChange = (index, id) => {
        const newApprovers = [...approvers];
        const emp = allEmployees.find(e => e.id === id);
        newApprovers[index] = { id, full_name: emp?.full_name || '', position: emp?.position || '' };
        setApprovers(newApprovers);
    };

    const removeApprover = (index) => setApprovers(approvers.filter((_, i) => i !== index));

    const addReferrer = () => setReferrers([...referrers, { id: '', full_name: '', position: '' }]);
    const handleReferrerChange = (index, id) => {
        const newReferrers = [...referrers];
        const emp = allEmployees.find(e => e.id === id);
        newReferrers[index] = { id, full_name: emp?.full_name || '', position: emp?.position || '' };
        setReferrers(newReferrers);
    };
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
                document_number: formData.document_number, // 🚀 문서번호 파라미터 추가
                content: JSON.stringify({ ...formData, requesterName: employee.full_name, requesterDepartment: employee.department, requesterPosition: employee.position }),
                document_type: 'internal_approval',
                approver_ids: approvers,
                referrer_ids: referrers.filter(r => r.id),
                requester_id: employee.id,
                requester_name: employee.full_name,
                requester_department: employee.department,
                requester_position: employee.position,
                attachments: attachments,
            };
            const response = await fetch('/api/submit-approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionData) });
            if (!response.ok) throw new Error('상신 실패');
            localStorage.removeItem('internal_draft_backup');
            toast.success("상신 완료");
            router.push('/mypage');
        } catch (error) { toast.error(error.message); } finally { setLoading(false); }
    };

    const HelpTooltip = ({ text }) => (
        <div className="group relative inline-block ml-1.5 align-middle">
            <Info size={14} className="text-slate-300 hover:text-blue-500 cursor-help transition-colors" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-medium leading-relaxed font-black">
                {text}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-800 font-black"></div>
            </div>
        </div>
    );

    if (employeeLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center font-sans animate-pulse font-black uppercase">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none font-black font-black">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <div className="flex items-center gap-2"></div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin font-black" /> : isUploading ? "업로드 중..." : <><CheckCircle size={14} /> 내부결재 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative text-black font-black font-black">
                    
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8 font-black font-black font-black">
                        <div className="space-y-4 font-black">
                            <h1 className="text-4xl font-black tracking-tighter uppercase font-black font-black">내 부 결 재 서</h1>
                            <div className="flex flex-col text-[11px] space-y-1 font-black">
                                <span>기안부서 : {employee?.department}</span>
                                <span>기안자 : {employee?.full_name} {employee?.position}</span>
                            </div>
                        </div>

                        <div className="flex font-black font-black font-black">
                            <table className="border-collapse border border-black text-[11px] font-black font-black font-black">
                                <tbody>
                                    <tr className="font-black">
                                        <th rowSpan="2" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight font-black">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvers.map((app, i) => (
                                            <th key={i} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black font-black font-black">
                                                {app.position || '결재'}
                                            </th>
                                        ))}
                                        {approvers.length < 1 && <th className="w-24 h-8 bg-slate-50 border border-dashed border-slate-200 font-black font-black"></th>}
                                    </tr>
                                    <tr className="h-20 font-black text-black">
                                        <td className="border border-black p-1 text-center align-middle font-black font-black">
                                            <div className="text-slate-300 font-black border-2 border-slate-200 rounded-full w-10 h-10 flex items-center justify-center mx-auto text-[7px] leading-tight uppercase font-black">Draft</div>
                                            <div className="mt-1 font-black text-[9px] font-black">{employee?.full_name}</div>
                                        </td>
                                        {approvers.map((app, i) => (
                                            <td key={i} className="border border-black p-1 text-center align-middle font-black font-black">
                                                <div className="text-slate-100 font-black border-2 border-slate-100 border-dashed rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] leading-tight uppercase italic font-black font-black">Sign</div>
                                                <div className="mt-1 font-black text-[10px] font-black">{app.full_name || '미지정'}</div>
                                            </td>
                                        ))}
                                        {approvers.length < 1 && <td className="border border-dashed border-slate-100 font-black font-black"></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-10 text-black font-black font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black font-black font-black font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black font-black font-black">
                                    {/* 🚀 [핵심 수정 2] 문서번호 수동 입력 칸 */}
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black font-black">문서번호 <HelpTooltip text="기안자가 직접 문서 번호를 기입하십시오." /></th>
                                    <td className="p-3 font-black">
                                        <input type="text" value={formData.document_number} onChange={(e) => setFormData({...formData, document_number: e.target.value})} placeholder="예: INT-202603-001" className="w-full outline-none bg-transparent font-black font-mono font-black" />
                                    </td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black font-black">기안일자</th>
                                    <td className="p-3 font-mono font-black font-black font-black">{new Date().toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="font-black font-black font-black font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black">01. 결재 건명 <HelpTooltip text="결재가 필요한 건의 핵심 내용을 제목으로 작성하십시오." /></h2>
                            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="제목을 입력하십시오." className="w-full border border-black p-4 text-[12px] font-black outline-none focus:bg-slate-50 transition-all bg-transparent font-black font-black" required />
                        </section>

                        <section className="font-black font-black font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black">02. 결재 상세 내용 <HelpTooltip text="구체적인 사유, 기대 효과, 관련 법규 등을 상세히 기술하십시오. (글자색, 형광펜 강조 가능)" /></h2>
                            {/* 🚀 [핵심 수정 1] 리치 텍스트 에디터 적용 */}
                            <SimpleRichTextEditor value={formData.content} onChange={(content) => setFormData({...formData, content})} placeholder="내용을 입력하십시오." />
                        </section>

                        <section className="font-black border-t border-black/5 pt-6 font-black font-black">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black font-black font-black">03. 증빙 자료 첨부 <HelpTooltip text="관련 도면, 공문, 비교 견적서 등 결재에 필요한 참고 자료를 첨부하십시오." /></h2>
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
                        </section>

                        <div className="pt-16 text-center space-y-6 font-black text-black font-black font-black">
                            <p className="text-[14px] font-black underline underline-offset-4 decoration-1 font-mono font-black">{new Date().toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'})}</p>
                            <p className="text-xl font-black uppercase tracking-widest font-black font-black">기안자: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black font-black font-black">
                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm font-black text-black">
                        <div className="flex items-center justify-between mb-4 border-b-2 border-black/5 pb-2 font-black font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black"><Users size={14}/> 결재선 지정</h2>
                            <button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black font-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-3 font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black font-black">
                                    <span className="text-[10px] text-slate-400 w-4 font-black font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black font-black" required>
                                        <option value="">결재자 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-red-500 font-black font-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm font-black text-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black font-black font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black font-black font-black font-black font-black font-black"><Users size={14}/> 참조인 지정</h2>
                            <button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black font-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-2 font-black font-black font-black font-black font-black font-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black font-black font-black font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black font-black">
                                        <option value="">참조인 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black font-black font-black font-black font-black font-black" onClick={() => removeReferrer(i)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}