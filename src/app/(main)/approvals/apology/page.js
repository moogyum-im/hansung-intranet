'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, FileIcon, ChevronRight, Users, Calendar, MapPin, Plane, ImageIcon } from 'lucide-react';

export default function ApologyPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({
        incidentDate: '',
        incidentDetails: '',
        cause: '',
        solution: '',
        apologyContent: '',
    });
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);

    // 1. [보존] 로컬 스토리지 데이터 복구
    useEffect(() => {
        const saved = localStorage.getItem('apology_write_backup');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.attachments) setAttachments(parsed.attachments);
                if (parsed.formData) setFormData(parsed.formData);
                if (parsed.approvers) setApprovers(parsed.approvers);
                if (parsed.referrers) setReferrers(parsed.referrers);
            } catch (e) {
                console.error("복구 실패", e);
            }
        }
    }, []);

    // 2. [저장] 상태 변경 시 로컬 스토리지 실시간 백업
    useEffect(() => {
        const dataToSave = { attachments, formData, approvers, referrers };
        localStorage.setItem('apology_write_backup', JSON.stringify(dataToSave));
    }, [attachments, formData, approvers, referrers]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position');
            setAllEmployees(data || []);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            const saved = localStorage.getItem('apology_write_backup');
            if (!saved && employee.team_leader_id && employee.id !== employee.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id }]);
            }
        }
    }, [employee, employeeLoading]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // [성공 매커니즘] 파일 업로드 시 부모 상태 강제 동기화
    const handleUploadComplete = useCallback((uploadedFiles) => {
        if (Array.isArray(uploadedFiles)) {
            const formattedFiles = uploadedFiles.map(file => ({
                name: file.name.normalize('NFC'),
                path: file.path,
                size: file.size
            }));
            
            setAttachments(prev => {
                const updated = [...prev, ...formattedFiles];
                // 타이밍 이슈 방지를 위해 로컬 스토리지 별도 즉시 업데이트
                localStorage.setItem('apology_temp_attachments', JSON.stringify(updated));
                return updated;
            });
            setIsUploading(false);
        }
    }, []);

    const removeAttachment = (idx) => {
        setAttachments(prev => {
            const updated = prev.filter((_, i) => i !== idx);
            localStorage.setItem('apology_temp_attachments', JSON.stringify(updated));
            return updated;
        });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let finalAttachments = attachments;
        if (finalAttachments.length === 0) {
            const backup = localStorage.getItem('apology_temp_attachments');
            if (backup) finalAttachments = JSON.parse(backup);
        }

        if (isUploading) return toast.error("파일 업로드가 완료될 때까지 기다려주세요.");
        if (approvers.length === 0 || approvers.some(app => !app.id)) return toast.error("결재자를 지정해주세요.");

        if (finalAttachments.length === 0) {
            const confirmNone = window.confirm("첨부된 사진 데이터가 인식되지 않았습니다. 그대로 상신할까요?");
            if (!confirmNone) return;
        }

        setLoading(true);
        try {
            const submissionData = {
                title: `시말서 (${employee?.full_name})`,
                content: JSON.stringify({
                    ...formData,
                    requesterName: employee.full_name,
                    requesterDepartment: employee.department,
                    requesterPosition: employee.position,
                }),
                document_type: 'apology',
                approver_ids: approvers.map(app => ({
                    id: app.id,
                    full_name: allEmployees.find(emp => emp.id === app.id)?.full_name || '',
                    position: allEmployees.find(emp => emp.id === app.id)?.position || '',
                })),
                referrer_ids: referrers.filter(r => r.id).map(ref => ({
                    id: ref.id,
                    full_name: allEmployees.find(emp => emp.id === ref.id)?.full_name || '',
                    position: allEmployees.find(emp => emp.id === ref.id)?.position || '',
                })),
                requester_id: employee.id,
                requester_name: employee.full_name,
                requester_department: employee.department,
                requester_position: employee.position,
                attachments: finalAttachments,
            };

            const response = await fetch('/api/submit-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!response.ok) throw new Error('상신 실패');
            
            localStorage.removeItem('apology_write_backup');
            localStorage.removeItem('apology_temp_attachments');
            toast.success("정상 상신되었습니다.");
            router.push('/mypage');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return <div className="p-10 text-black font-black text-xs h-screen flex flex-col items-center justify-center font-sans uppercase tracking-widest animate-pulse">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <div className="flex items-center gap-2 text-slate-400">
                    <Database size={14} className="text-black" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-black font-black">HANSUNG DOCUMENT SYSTEM</span>
                </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={loading || isUploading} 
                    className={`flex items-center gap-2 px-6 py-2 border border-black text-[11px] shadow-lg transition-all active:scale-95 font-black ${
                        isUploading ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-black text-white hover:bg-slate-800'
                    }`}
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "업로드 중..." : <><CheckCircle size={14} /> 시말서 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative text-black font-black font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 text-black font-black font-black">
                        <p className="text-[9px] tracking-widest text-slate-400 uppercase font-black font-black">Hansung Landscape & Construction</p>
                        <h1 className="text-3xl tracking-tighter uppercase font-black font-black">시 말 서 작 성</h1>
                    </header>

                    <div className="space-y-10 text-black font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black font-black">소속부서</th>
                                    <td className="p-3 font-black font-black">{employee?.department}</td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black font-black">성명/직위</th>
                                    <td className="p-3 font-black font-black">{employee?.full_name} {employee?.position}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black font-black font-black">작성일자</th>
                                    <td className="p-3 font-mono font-black font-black font-black">{new Date().toLocaleDateString('ko-KR')}</td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black font-black font-black font-black">발생일시</th>
                                    <td className="p-3 font-black font-black font-black">
                                        <input type="datetime-local" name="incidentDate" value={formData.incidentDate} onChange={handleChange} className="w-full outline-none bg-transparent font-black font-mono text-[11px] font-black font-black" required />
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="font-black font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black">01. 사건 내용 및 경위</h2>
                            <textarea name="incidentDetails" value={formData.incidentDetails} onChange={handleChange} className="w-full border border-black p-4 text-[12px] leading-relaxed min-h-[150px] outline-none focus:bg-slate-50 transition-all font-black font-black font-black" placeholder="사건의 발생 경위를 상세히 기술하십시오." required />
                        </section>

                        <section className="font-black font-black font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black font-black">02. 발생 원인</h2>
                            <textarea name="cause" value={formData.cause} onChange={handleChange} className="w-full border border-black p-4 text-[12px] leading-relaxed min-h-[100px] outline-none focus:bg-slate-50 transition-all font-black font-black font-black" placeholder="본인의 과실 및 외부 원인을 분석하여 기술하십시오." required />
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 font-black font-black font-black">
                            <div>
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black font-black font-black">03. 대책 및 처리</h2>
                                <textarea name="solution" value={formData.solution} onChange={handleChange} className="w-full border border-black p-4 text-[12px] leading-relaxed min-h-[120px] outline-none focus:bg-slate-50 transition-all font-black font-black font-black" placeholder="재발 방지를 위한 구체적인 대책" required />
                            </div>
                            <div>
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black font-black font-black">04. 시말 내용</h2>
                                <textarea name="apologyContent" value={formData.apologyContent} onChange={handleChange} className="w-full border border-black p-4 text-[12px] leading-relaxed min-h-[120px] outline-none focus:bg-slate-50 transition-all font-black font-black font-black font-black" placeholder="반성 및 다짐의 내용" required />
                            </div>
                        </section>

                        {/* 위치 이동: 제출 서명 바로 위로 "05. 증빙자료" 배치 */}
                        <section className="font-black font-black font-black border-t border-black/5 pt-6">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black font-black font-black font-black">05. 증빙 자료 첨부 (EVIDENCE)</h2>
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
                            
                            {attachments.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 font-black no-print">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 border border-black/10 rounded-lg group">
                                            <div className="flex items-center gap-2 text-[10px] font-black overflow-hidden text-black font-black"><ImageIcon size={14} className="text-blue-600 flex-shrink-0 font-black" /><span className="truncate font-black">{file.name} (동기화됨)</span></div>
                                            <X size={16} className="cursor-pointer text-slate-300 hover:text-red-500 transition-colors font-black" onClick={() => removeAttachment(idx)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="pt-16 text-center space-y-8 font-black font-black font-black">
                            <p className="text-[13px] font-black">위와 같이 시말서를 제출하며, 향후 재발 방지를 약속합니다.</p>
                            <div className="space-y-2 font-black font-black">
                                <p className="text-[14px] font-black underline underline-offset-4 decoration-1 font-mono font-black">{new Date().toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'})}</p>
                                <p className="text-xl font-black uppercase tracking-widest mt-4 font-black font-black font-black">제출자: {employee?.full_name} (인)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black font-black font-black">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black text-black font-black font-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 font-black text-black font-black font-black font-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black font-black font-black"><Users size={14}/> 결재선 지정</h2><button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black text-black font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black text-black font-black font-black font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black"><span className="text-[10px] text-slate-400 w-4 font-black font-black font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black font-black font-black font-black font-black"><option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name}</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black text-black font-black font-black font-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black font-black font-black font-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black font-black font-black font-black"><Users size={14}/> 참조인 지정</h2><button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black text-black font-black font-black font-black font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black text-black font-black font-black font-black font-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black font-black font-black font-black font-black font-black"><option value="">참조인 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name}</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black font-black font-black" onClick={() => removeReferrer(i)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}