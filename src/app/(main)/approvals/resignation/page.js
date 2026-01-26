'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, FileIcon, ChevronRight, Users, Calendar, AlertCircle, ImageIcon } from 'lucide-react';

export default function ResignationPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();
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

    // 1. [데이터 보존] 로컬 스토리지 복구
    useEffect(() => {
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
    }, []);

    // 2. [실시간 저장] 상태 변경 시 백업
    useEffect(() => {
        const dataToSave = { formData, approvers, referrers, attachments };
        localStorage.setItem('resignation_draft_backup', JSON.stringify(dataToSave));
    }, [formData, approvers, referrers, attachments]);

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

            const response = await fetch('/api/submit-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });
            if (!response.ok) throw new Error('상신 실패');
            localStorage.removeItem('resignation_draft_backup');
            toast.success("사직서가 정상 상신되었습니다.");
            router.push('/mypage');
        } catch (error) { toast.error(error.message); } finally { setLoading(false); }
    };

    if (employeeLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center font-sans animate-pulse">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none font-black">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2">
                <div className="flex items-center gap-2 text-slate-400">
                    <Database size={14} className="text-black" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-black">HANSUNG ERP SYSTEM</span>
                </div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "업로드 중..." : <><CheckCircle size={14} /> 사직서 상신하기</>}
                </button>
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
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
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