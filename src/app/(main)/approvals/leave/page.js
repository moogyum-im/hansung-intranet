'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, Users, Calendar, Plane, ImageIcon, UserPlus, Info } from 'lucide-react';

export default function LeaveRequestPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({
        title: '휴가 신청서',
        document_number: '', // 🚀 문서 번호 수동 기입 필드 추가
        leaveType: '연차',
        startDate: '',
        endDate: '',
        reason: '',
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

        const priority = { 
            '최고 경영진': 1, 
            '공무부': 2, 
            '관리부': 3, 
            '전략기획부': 4 
        };

        return Object.keys(groups)
            .sort((a, b) => (priority[a] || 999) - (priority[b] || 999) || a.localeCompare(b))
            .reduce((acc, key) => { acc[key] = groups[key]; return acc; }, {});
    }, [allEmployees]);

    useEffect(() => {
        const saved = localStorage.getItem('leave_draft_backup');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(parsed.formData || { title: '휴가 신청서', document_number: '', leaveType: '연차', startDate: '', endDate: '', reason: '' });
                setApprovers(parsed.approvers || []);
                setReferrers(parsed.referrers || []);
                setAttachments(parsed.attachments || []);
            } catch (e) { console.error("복구 실패", e); }
        }
    }, []);

    useEffect(() => {
        const dataToSave = { formData, approvers, referrers, attachments };
        localStorage.setItem('leave_draft_backup', JSON.stringify(dataToSave));
    }, [formData, approvers, referrers, attachments]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position').eq('employment_status', '재직');
            setAllEmployees(data || []);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            const saved = localStorage.getItem('leave_draft_backup');
            if (!saved && employee.team_leader_id && employee.id !== employee.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id, full_name: '', position: '' }]);
            }
        }
    }, [employee, employeeLoading]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUploadComplete = useCallback((uploadedFiles) => {
        if (Array.isArray(uploadedFiles)) {
            const formattedFiles = uploadedFiles.map(file => ({ name: file.name.normalize('NFC'), path: file.path, size: file.size }));
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
        if (approvers.length === 0 || approvers.some(app => !app.id)) return toast.error("결재자를 지정해주세요.");

        setLoading(true);
        try {
            const submissionData = {
                title: `휴가신청서 (${employee?.full_name})`,
                document_number: formData.document_number, // 🚀 문서 번호 저장
                content: JSON.stringify({
                    ...formData,
                    requesterName: employee.full_name,
                    requesterDepartment: employee.department,
                    requesterPosition: employee.position,
                }),
                document_type: 'leave_request',
                approver_ids: approvers,
                referrer_ids: referrers.filter(r => r.id).map(ref => ({ id: ref.id, full_name: ref.full_name, position: ref.position })),
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
            localStorage.removeItem('leave_draft_backup');
            toast.success("휴가 신청서 상신 완료!");
            router.push('/mypage');
        } catch (error) { toast.error(error.message); } finally { setLoading(false); }
    };

    const HelpTooltip = ({ text }) => (
        <div className="group relative inline-block ml-1.5 align-middle">
            <Info size={14} className="text-slate-300 hover:text-blue-500 cursor-help transition-colors" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-medium leading-relaxed">
                {text}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-800"></div>
            </div>
        </div>
    );

    if (employeeLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center font-sans animate-pulse uppercase tracking-widest font-black">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none font-black">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <div className="flex items-center gap-2 font-black"></div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "파일 업로드 중..." : <><CheckCircle size={14} /> 휴가 신청 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative font-black font-black">
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8 font-black font-black">
                        <div className="space-y-4 font-black font-black">
                            <h1 className="text-4xl font-black tracking-tighter uppercase font-black">휴 가 신 청 서</h1>
                            <div className="flex flex-col text-[11px] space-y-1 font-black">
                                <span>기안부서 : {employee?.department}</span>
                                <span>작성일자 : {new Date().toLocaleDateString('ko-KR')}</span>
                            </div>
                        </div>

                        <div className="flex font-black font-black">
                            <table className="border-collapse border border-black text-[11px] font-black font-black">
                                <tbody>
                                    <tr className="font-black">
                                        <th rowSpan="2" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvers.map((app, i) => (
                                            <th key={i} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black">
                                                {app.position || '결재'}
                                            </th>
                                        ))}
                                        {approvers.length < 1 && <th className="w-24 h-8 bg-slate-50 border border-dashed border-slate-200"></th>}
                                    </tr>
                                    <tr className="h-20 font-black text-black">
                                        <td className="border border-black p-1 text-center align-middle font-black">
                                            <div className="text-slate-300 font-black border-2 border-slate-200 rounded-full w-10 h-10 flex items-center justify-center mx-auto text-[7px] leading-tight uppercase font-black font-black">Draft</div>
                                            <div className="mt-1 font-black text-[9px] font-black font-black">{employee?.full_name}</div>
                                        </td>
                                        {approvers.map((app, i) => (
                                            <td key={i} className="border border-black p-1 text-center align-middle font-black">
                                                <div className="text-slate-100 font-black border-2 border-slate-100 border-dashed rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] leading-tight uppercase italic font-black font-black font-black">Sign</div>
                                                <div className="mt-1 font-black text-[10px] font-black font-black font-black">{app.full_name || '미지정'}</div>
                                            </td>
                                        ))}
                                        {approvers.length < 1 && <td className="border border-dashed border-slate-100 font-black font-black"></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-10 text-black font-black font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black font-black">소속부서</th>
                                    <td className="p-3 font-black font-black">{employee?.department}</td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black font-black">성명/직위</th>
                                    <td className="p-3 font-black font-black">{employee?.full_name} {employee?.position}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                    {/* 🚀 [핵심 수정 1] 문서번호 수동 입력 칸 */}
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase tracking-tighter w-24">문서번호 <HelpTooltip text="기안자가 직접 문서 번호를 기입하십시오." /></th>
                                    <td className="p-3 font-black">
                                        <input type="text" name="document_number" value={formData.document_number} onChange={handleChange} placeholder="예: LEA-202603-001 (직접 입력)" className="w-full outline-none bg-transparent font-black font-mono font-black" />
                                    </td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black w-24">보존기한</th>
                                    <td className="p-3 font-black font-black">5년 (기본설정)</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="font-black font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black">01. 휴가 세부 계획</h2>
                            <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black font-black">
                                <tbody>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black text-black">
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black font-black">휴가종류 <HelpTooltip text="오전/오후 반차의 경우 정해진 시간을 확인하여 주십시오." /></th>
                                        <td className="p-3 font-black font-black">
                                            <select name="leaveType" value={formData.leaveType} onChange={handleChange} className="w-full bg-transparent outline-none font-black font-black">
                                                <option value="연차">연차</option>
                                                <option value="오전 반차 (09:00~12:00)">오전 반차 (09:00~12:00)</option>
                                                <option value="오후 반차 (13:00~18:00)">오후 반차 (13:00~18:00)</option>
                                                <option value="병가">병가</option>
                                                <option value="경조사">경조사</option>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black font-black font-black">기간설정 <HelpTooltip text="휴가 시작일과 종료일을 정확히 입력해 주십시오." /></th>
                                        <td className="p-3 font-black font-black">
                                            <div className="flex items-center gap-3 font-black font-black font-black">
                                                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="border-b border-slate-200 outline-none focus:border-black py-0.5 font-black" required />
                                                <span className="text-slate-300 font-black font-black">~</span>
                                                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="border-b border-slate-200 outline-none focus:border-black py-0.5 font-black" required />
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="font-black font-black font-black font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black font-black">02. 상세 사유 <HelpTooltip text="휴가 사유를 간략히 작성해 주세요. (예: 개인사정, 병원진료 등)" /></h2>
                            {/* 진중한 기본 입력창 유지 */}
                            <textarea name="reason" value={formData.reason} onChange={handleChange} className="w-full border border-black p-6 text-[12px] leading-relaxed min-h-[200px] outline-none focus:bg-slate-50 transition-all font-black font-black font-black" placeholder="상세 사유 기술 (필요 시 증빙자료 첨부)" required />
                        </section>

                        <section className="font-black border-t border-black/5 pt-6 font-black font-black font-black font-black">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black font-black font-black">03. 증빙 자료 첨부 <HelpTooltip text="경조사나 병가의 경우 증빙 서류를 스캔하여 첨부해 주십시오." /></h2>
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
                        </section>

                        <div className="pt-10 text-center font-black font-black font-black">
                            <p className="text-xl font-black uppercase tracking-widest font-black font-black">신청인: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black font-black font-black">
                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm font-black text-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b-2 border-black/5 pb-2 font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black">
                                <Users size={14}/> 결재선 지정
                                <HelpTooltip text="최대 4명까지 지정 가능하며 부서 정렬 순서에 따라 명단이 나열됩니다." />
                            </h2>
                            <button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-3 font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black">
                                    <span className="text-[10px] text-slate-400 w-4 font-black font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black" required>
                                        <option value="">결재자 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-red-500 font-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm font-black text-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black font-black font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black font-black font-black">
                                <Users size={14}/> 참조인 지정
                                <HelpTooltip text="해당 휴가 소식을 공유받아야 할 팀원을 지정하십시오." />
                            </h2>
                            <button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black text-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-2 font-black text-black font-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black">
                                        <option value="">참조인 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black" onClick={() => removeReferrer(i)} />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 p-5 rounded-2xl shadow-lg font-black font-black">
                        <p className="text-[10px] text-white/50 leading-relaxed font-black uppercase tracking-tight font-black font-black">※ 지정한 결재선은 상단 문서 서식에 실시간으로 반영됩니다.</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}