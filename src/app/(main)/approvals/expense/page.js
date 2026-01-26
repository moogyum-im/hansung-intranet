'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, FileIcon, ChevronRight, Users, Calendar, Wallet, ImageIcon, CreditCard, Hash } from 'lucide-react';

export default function ExpenseReportPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({
        title: '지출결의서',
        expenseDate: new Date().toISOString().split('T')[0],
        accountType: '교통비',
        paymentMethod: '법인카드',
        amount: '',
        description: '',
        cardNumberLastFour: '',
        document_number: '', // [추가] 문서 번호 필드
    });
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]); // [복구] 참조인 상태
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false); 
    const [attachments, setAttachments] = useState([]);

    // 1. [보존] 로컬 스토리지 데이터 복구
    useEffect(() => {
        const saved = localStorage.getItem('expense_write_backup');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.attachments) setAttachments(parsed.attachments);
                if (parsed.formData) setFormData(parsed.formData);
                if (parsed.approvers) setApprovers(parsed.approvers);
                if (parsed.referrers) setReferrers(parsed.referrers);
            } catch (e) { console.error("복구 실패", e); }
        }
    }, []);

    // 2. [저장] 상태 변경 시마다 실시간 백업
    useEffect(() => {
        const dataToSave = { attachments, formData, approvers, referrers };
        localStorage.setItem('expense_write_backup', JSON.stringify(dataToSave));
    }, [attachments, formData, approvers, referrers]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position');
            if (data) setAllEmployees(data);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            const saved = localStorage.getItem('expense_write_backup');
            if (!saved && employee?.team_leader_id && employee.id !== employee.team_leader_id) {
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
            const formattedFiles = uploadedFiles.map(file => ({
                name: file.name.normalize('NFC'),
                path: file.path,
                size: file.size
            }));
            
            setAttachments(prev => {
                const updated = [...prev, ...formattedFiles];
                localStorage.setItem('expense_temp_attachments', JSON.stringify(updated));
                return updated;
            });
            setIsUploading(false);
        }
    }, []);

    const removeAttachment = (idx) => {
        setAttachments(prev => {
            const updated = prev.filter((_, i) => i !== idx);
            localStorage.setItem('expense_temp_attachments', JSON.stringify(updated));
            return updated;
        });
    };

    const addApprover = () => setApprovers([...approvers, { id: '' }]);
    const handleApproverChange = (index, id) => {
        const newApprovers = [...approvers];
        const emp = allEmployees.find(e => e.id === id);
        newApprovers[index] = { id, full_name: emp?.full_name || '', position: emp?.position || '' };
        setApprovers(newApprovers);
    };
    const removeApprover = (index) => setApprovers(approvers.filter((_, i) => i !== index));

    // [복구] 참조인 추가/변경/삭제 로직
    const addReferrer = () => setReferrers([...referrers, { id: '' }]);
    const handleReferrerChange = (index, id) => {
        const newReferrers = [...referrers];
        const emp = allEmployees.find(e => e.id === id);
        newReferrers[index] = { id, full_name: emp?.full_name || '', position: emp?.position || '' };
        setReferrers(newReferrers);
    };
    const removeReferrer = (index) => setReferrers(referrers.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.paymentMethod === '법인카드' && !formData.cardNumberLastFour) {
            return toast.error("법인카드 번호(뒷 4자리)를 입력해주세요.");
        }

        let finalAttachments = attachments;
        if (finalAttachments.length === 0) {
            const backup = localStorage.getItem('expense_temp_attachments');
            if (backup) finalAttachments = JSON.parse(backup);
        }

        if (isUploading) return toast.error("파일 업로드가 완료될 때까지 기다려주세요.");
        if (finalAttachments.length === 0) return toast.error("증빙 자료(영수증)가 첨부되지 않았습니다.");
        if (approvers.length === 0 || approvers.some(app => !app.id)) return toast.error("결재자를 지정해주세요.");

        setLoading(true);
        try {
            const submissionData = {
                title: `지출결의서 (${employee?.full_name})`,
                document_number: formData.document_number, // 문서번호 전송
                content: JSON.stringify({
                    ...formData,
                    requesterName: employee.full_name,
                    requesterDepartment: employee.department,
                    requesterPosition: employee.position,
                }),
                document_type: 'expense_report',
                approver_ids: approvers.map(app => ({ id: app.id, full_name: app.full_name, position: app.position })),
                referrer_ids: referrers.filter(r => r.id).map(ref => ({ id: ref.id, full_name: ref.full_name, position: ref.position })),
                attachments: finalAttachments,
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
            
            localStorage.removeItem('expense_write_backup');
            localStorage.removeItem('expense_temp_attachments');
            toast.success("지출결의서가 상신되었습니다.");
            router.push('/mypage');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center font-sans animate-pulse tracking-widest uppercase font-black">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none font-black">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <div className="flex items-center gap-2 text-slate-400 font-black">
                    <Database size={14} className="text-black" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-black">HANSUNG ERP SYSTEM</span>
                </div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "업로드 중..." : <><CheckCircle size={14} /> 지출결의서 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative text-black font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black">
                        <p className="text-[9px] tracking-widest text-slate-400 uppercase font-black">Hansung Landscape & Construction</p>
                        <h1 className="text-3xl tracking-tighter uppercase font-black">지 출 결 의 서 작 성</h1>
                    </header>

                    <div className="space-y-10 font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black text-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안부서</th>
                                    <td className="p-3 font-black text-black">{employee?.department}</td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안자</th>
                                    <td className="p-3 font-black text-black">{employee?.full_name} {employee?.position}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black text-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase tracking-tighter">문서번호</th>
                                    <td className="p-3">
                                        <input 
                                            type="text" 
                                            name="document_number" 
                                            value={formData.document_number} 
                                            onChange={handleChange} 
                                            placeholder="문서번호 입력" 
                                            className="w-full outline-none bg-transparent font-black font-mono" 
                                        />
                                    </td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase">기안일자</th>
                                    <td className="p-3 font-mono font-black text-black">{new Date().toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black">01. 지출 정보 상세</h2>
                            <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                                <tbody>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black">
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">지출일자</th>
                                        <td className="p-3"><input type="date" name="expenseDate" value={formData.expenseDate} onChange={handleChange} className="w-full outline-none bg-transparent font-black font-mono font-black text-black" required /></td>
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black">지출금액</th>
                                        <td className="p-3 font-black"><div className="flex items-center gap-1 font-black"><span className="text-slate-400 font-black">₩</span><input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0" className="w-full outline-none bg-transparent font-black text-blue-700 font-black" required /></div></td>
                                    </tr>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black">
                                        <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black">계정과목</th>
                                        <td className="p-3 font-black"><select name="accountType" value={formData.accountType} onChange={handleChange} className="w-full outline-none bg-transparent font-black text-black"><option>교통비</option><option>식비</option><option>비품구매</option><option>접대비</option><option>기타</option></select></td>
                                        <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black">결제수단</th>
                                        <td className="p-3 font-black">
                                            <div className="flex flex-col gap-2 font-black">
                                                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full outline-none bg-transparent font-black text-black font-black">
                                                    <option value="법인카드">법인카드</option>
                                                    <option value="개인카드">개인카드</option>
                                                    <option value="현금">현금</option>
                                                </select>
                                                {formData.paymentMethod === '법인카드' && (
                                                    <div className="flex items-center gap-1 border-t border-black/5 pt-1 font-black">
                                                        <CreditCard size={10} className="text-blue-600 font-black" />
                                                        <input 
                                                            type="text" 
                                                            name="cardNumberLastFour" 
                                                            value={formData.cardNumberLastFour} 
                                                            onChange={handleChange} 
                                                            maxLength="4"
                                                            placeholder="뒷 4자리" 
                                                            className="w-full outline-none bg-slate-50 text-[10px] p-1 font-mono font-black"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black">02. 상세 내역 (적요)</h2>
                            <textarea name="description" value={formData.description} onChange={handleChange} className="w-full border border-black p-6 text-[12px] leading-relaxed min-h-[250px] outline-none focus:bg-slate-50 transition-all font-black text-black" placeholder="상세 사용 내역 기술" required />
                        </section>

                        <section className="font-black border-t border-black/5 pt-6 font-black font-black">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black font-black font-black">03. 증빙 자료 첨부 (EVIDENCE)</h2>
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
                            
                            {attachments.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 no-print font-black">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 border border-black/10 rounded-lg group font-black">
                                            <div className="flex items-center gap-2 text-[10px] font-black overflow-hidden font-black"><ImageIcon size={14} className="text-blue-600 flex-shrink-0 font-black" /><span className="truncate font-black text-black">{file.name}</span></div>
                                            <X size={16} className="cursor-pointer text-slate-300 hover:text-red-500 transition-colors font-black" onClick={() => removeAttachment(idx)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="pt-16 text-center space-y-8 font-black font-black">
                            <p className="text-[14px] font-black underline underline-offset-4 decoration-1 font-black text-black">{new Date().toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'})}</p>
                            <p className="text-xl font-black uppercase tracking-widest font-black text-black">기안자: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black">
                    {/* 결재선 지정 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 font-black text-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black"><Users size={14}/> 결재선 지정</h2><button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black"><span className="text-[10px] text-slate-400 w-4 font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black font-black"><option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name}</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* [복구] 참조인 지정 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 font-black text-blue-600"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black text-black font-black font-black"><Users size={14}/> 참조인 지정</h2><button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black">+ 추가</button></div>
                        <div className="space-y-2 font-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black font-black"><option value="">참조인 선택</option>
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