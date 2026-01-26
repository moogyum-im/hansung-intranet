'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, FileIcon, ChevronRight, Users, Calendar, Layout, ImageIcon } from 'lucide-react';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function WorkReportPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);

    const timeSlots = [
        '08:30 - 09:30', '09:30 - 10:30', '10:30 - 11:30', '11:30 - 12:00', 
        '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:30'
    ];

    const [visibleSections, setVisibleSections] = useState({
        hourlyTasks: true,
        todayPlan: true,
        achievements: true,
        issues: true,
        nextPlan: true
    });

    const [formData, setFormData] = useState({
        title: '업무 보고서',
        reportType: '일일보고',
        reportDate: new Date().toISOString().split('T')[0],
        achievements: '',
        todayPlan: '',
        issues: '',
        nextPlan: '',
        hourlyTasks: timeSlots.reduce((acc, time) => ({ ...acc, [time]: '' }), {}),
    });
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);

    // 1. [데이터 보존] 로컬 스토리지 복구
    useEffect(() => {
        const saved = localStorage.getItem('work_report_draft_backup');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(parsed.formData || formData);
                setApprovers(parsed.approvers || []);
                setReferrers(parsed.referrers || []);
                setAttachments(parsed.attachments || []);
                setVisibleSections(parsed.visibleSections || visibleSections);
            } catch (e) { console.error("복구 실패", e); }
        }
    }, []);

    // 2. [실시간 저장] 상태 변경 시 백업
    useEffect(() => {
        const dataToSave = { formData, approvers, referrers, attachments, visibleSections };
        localStorage.setItem('work_report_draft_backup', JSON.stringify(dataToSave));
    }, [formData, approvers, referrers, attachments, visibleSections]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position');
            setAllEmployees(data || []);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            const saved = localStorage.getItem('work_report_draft_backup');
            if (!saved && employee?.team_leader_id && employee.id !== employee.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id }]);
            }
        }
    }, [employee, employeeLoading]);

    const handleVisibilityChange = (section) => setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleHourlyChange = (time, value) => setFormData(prev => ({ ...prev, hourlyTasks: { ...prev.hourlyTasks, [time]: value } }));
    const handleQuillChange = (value) => setFormData(prev => ({ ...prev, achievements: value }));

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
    const handleApproverChange = (index, id) => {
        const newApprovers = [...approvers];
        newApprovers[index].id = id;
        setApprovers(newApprovers);
    };
    const removeApprover = (index) => setApprovers(approvers.filter((_, i) => i !== index));

    const addReferrer = () => setReferrers([...referrers, { id: '' }]);
    const handleReferrerChange = (index, id) => {
        const newReferrers = [...referrers];
        newReferrers[index].id = id;
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
                title: `${formData.reportType} (${employee.full_name})`,
                content: JSON.stringify({
                    ...formData,
                    visibleSections,
                    requesterName: employee.full_name,
                    requesterDepartment: employee.department,
                    requesterPosition: employee.position,
                }),
                document_type: 'work_report',
                approver_ids: approvers.map(app => {
                    const emp = allEmployees.find(e => e.id === app.id);
                    return { id: app.id, full_name: emp?.full_name, position: emp?.position };
                }),
                referrer_ids: referrers.filter(r => r.id).map(ref => {
                    const emp = allEmployees.find(e => e.id === ref.id);
                    return { id: ref.id, full_name: emp?.full_name, position: emp?.position, department: emp?.department };
                }),
                attachments: attachments,
                requester_id: employee.id,
                requester_name: employee.full_name,
                requester_department: employee.department,
                requester_position: employee.position,
            };

            const response = await fetch('/api/submit-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });
            if (!response.ok) throw new Error('상신 실패');
            
            localStorage.removeItem('work_report_draft_backup');
            toast.success("업무보고서 상신 완료!");
            router.push('/mypage');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const quillModules = useMemo(() => ({
        toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['clean']],
    }), []);

    if (employeeLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center font-sans animate-pulse">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none font-black">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <div className="flex items-center gap-2 text-slate-400 font-black">
                    <Database size={14} className="text-black" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-black">HANSUNG ERP DOCUMENT SYSTEM</span>
                </div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "업로드 중..." : <><CheckCircle size={14} /> 업무보고서 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black font-black">
                        <p className="text-[9px] tracking-widest text-slate-400 uppercase font-black">Hansung Landscape & Construction</p>
                        <h1 className="text-3xl tracking-tighter uppercase font-black font-black">업 무 보 고 서 작 성</h1>
                    </header>

                    <div className="mb-8 p-5 bg-slate-50 border border-black font-black">
                        <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-tighter font-black">REPORT SECTION CONFIGURATION</p>
                        <div className="flex flex-wrap gap-6 font-black font-black font-black font-black">
                            {['hourlyTasks', 'todayPlan', 'achievements', 'issues', 'nextPlan'].map((key) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer font-black font-black">
                                    <input type="checkbox" checked={visibleSections[key]} onChange={() => handleVisibilityChange(key)} className="accent-black font-black" />
                                    <span className="text-[11px] font-black uppercase font-black">{key === 'hourlyTasks' ? '시간별 내역' : key === 'todayPlan' ? '금일 계획' : key === 'achievements' ? '상세 실적' : key === 'issues' ? '특이사항' : '향후 계획'}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-10 text-black font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black">기안부서</th>
                                    <td className="p-3 font-black">{employee?.department}</td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black">기안자</th>
                                    <td className="p-3 font-black">{employee?.full_name} {employee?.position}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black">보고유형</th>
                                    <td className="p-3 font-black">
                                        <select name="reportType" value={formData.reportType} onChange={handleChange} className="w-full bg-transparent outline-none font-black font-black"><option>일일보고</option><option>주간보고</option><option>월간보고</option><option>기타</option></select>
                                    </td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black font-black">보고일자</th>
                                    <td className="p-3 font-black font-mono"><input type="date" name="reportDate" value={formData.reportDate} onChange={handleChange} className="w-full bg-transparent outline-none font-black" /></td>
                                </tr>
                            </tbody>
                        </table>

                        {visibleSections.hourlyTasks && (
                            <section className="font-black font-black">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black">01. 시간별 주요 업무 내역</h2>
                                <div className="border border-black font-black font-black">
                                    {timeSlots.map(time => (
                                        <div key={time} className="flex border-b border-black last:border-0 divide-x divide-black font-black font-black">
                                            <div className="bg-slate-50 w-32 p-2 text-center text-[10px] font-mono font-black font-black">{time}</div>
                                            <input type="text" value={formData.hourlyTasks[time]} onChange={(e) => handleHourlyChange(time, e.target.value)} className="flex-1 px-4 py-2 outline-none text-[11px] font-black bg-transparent font-black" placeholder="업무 내용을 입력하십시오." />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {visibleSections.todayPlan && (
                            <section className="font-black font-black">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black">02. 금일 주요 업무 계획</h2>
                                <textarea name="todayPlan" value={formData.todayPlan} onChange={handleChange} className="w-full border border-black p-5 text-[12px] leading-relaxed min-h-[100px] outline-none font-black bg-transparent font-black font-black" placeholder="금일 진행 예정인 업무를 입력하십시오." />
                            </section>
                        )}

                        {visibleSections.achievements && (
                            <section className="font-black font-black">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black">03. 상세 업무 진행 실적</h2>
                                <div className="border border-black font-black font-black font-black">
                                    <ReactQuill theme="snow" value={formData.achievements} onChange={handleQuillChange} modules={quillModules} className="h-64 mb-10 font-black" />
                                </div>
                            </section>
                        )}

                        {visibleSections.issues && (
                            <section className="font-black font-black">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black text-red-600 font-black">04. 특이사항 및 문제점</h2>
                                <textarea name="issues" value={formData.issues} onChange={handleChange} className="w-full border border-black p-5 text-[12px] leading-relaxed min-h-[100px] outline-none bg-red-50/5 font-black font-black" placeholder="특이사항을 기술하십시오." />
                            </section>
                        )}

                        <section className="font-black border-t border-black/5 pt-6 font-black">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black font-black">05. 증빙 자료 첨부 (EVIDENCE)</h2>
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
                            {attachments.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 no-print font-black font-black">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 border border-black/10 rounded-lg group font-black font-black">
                                            <div className="flex items-center gap-2 text-[10px] font-black overflow-hidden text-black font-black font-black font-black"><ImageIcon size={14} className="text-blue-600 flex-shrink-0 font-black font-black" /><span className="truncate font-black">{file.name}</span></div>
                                            <X size={16} className="cursor-pointer text-slate-300 hover:text-red-500 transition-colors font-black font-black" onClick={() => removeAttachment(idx)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="pt-10 text-center font-black font-black font-black">
                            <p className="text-xl font-black uppercase tracking-widest font-black">보고인: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black font-black">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black font-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 font-black font-black font-black font-black font-black font-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black"><Users size={14}/> 결재선 지정</h2><button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black"><span className="text-[10px] text-slate-400 w-4 font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black" required>
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black font-black font-black font-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black font-black font-black font-black"><Users size={14}/> 참조인 지정</h2><button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                                        <option value="">참조인 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black" onClick={() => removeReferrer(i)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}