'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, FileIcon, ChevronRight, Users, Calendar, MapPin, Plane, ImageIcon } from 'lucide-react';

export default function BusinessTripWritePage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({
        title: '출장 신청서',
        preservationPeriod: '5년',
        startDate: '',
        endDate: '',
        destination: '',
        contact: '',
        purpose: '',
        transportation: '차량', 
        transportDetail: '자차', 
        transportMemo: '',       
        remarks: '',
    });
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);

    // 1. [보존] 로컬 스토리지 데이터 복구
    useEffect(() => {
        const saved = localStorage.getItem('bt_write_backup');
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

    // 2. [저장] 상태 변경 시마다 로컬 스토리지에 즉시 백업
    useEffect(() => {
        const dataToSave = { attachments, formData, approvers, referrers };
        localStorage.setItem('bt_write_backup', JSON.stringify(dataToSave));
    }, [attachments, formData, approvers, referrers]);

    const duration = useMemo(() => {
        if (!formData.startDate || !formData.endDate) return 0;
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const diff = end.getTime() - start.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
        return days > 0 ? days : 0;
    }, [formData.startDate, formData.endDate]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position');
            setAllEmployees(data || []);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            const saved = localStorage.getItem('bt_write_backup');
            if (!saved && employee.team_leader_id && employee.id !== employee.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id }]);
            }
        }
    }, [employee, employeeLoading]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 업로드 완료 시 상태 업데이트
    const handleUploadComplete = (uploadedFiles) => {
        if (Array.isArray(uploadedFiles)) {
            const formattedFiles = uploadedFiles.map(file => ({
                name: file.name.normalize('NFC'),
                path: file.path,
                size: file.size
            }));
            setAttachments(prev => [...prev, ...formattedFiles]);
            setIsUploading(false);
        }
    };

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

        // 사진 체크 경고
        if (attachments.length === 0) {
            const confirmNone = window.confirm("첨부된 사진이 없습니다. 그대로 상신할까요?");
            if (!confirmNone) return;
        }

        setLoading(true);

        try {
            const submissionData = {
                title: `${formData.title} (${employee?.full_name})`,
                content: JSON.stringify({ ...formData, duration }),
                document_type: 'business_trip',
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
                attachments: attachments,
            };

            const response = await fetch('/api/submit-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!response.ok) throw new Error('상신 실패');
            
            localStorage.removeItem('bt_write_backup');
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
                    <span className="text-[10px] uppercase tracking-widest font-black text-black">HANSUNG DOCUMENT SYSTEM</span>
                </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={loading || isUploading} 
                    className={`flex items-center gap-2 px-6 py-2 border border-black text-[11px] shadow-lg transition-all active:scale-95 font-black ${
                        isUploading ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-black text-white hover:bg-slate-800'
                    }`}
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "업로드 중..." : <><CheckCircle size={14} /> 출장신청서 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative text-black font-black">
                    <header className="mb-10 border-b-4 border-black pb-6 text-black font-black">
                        <p className="text-[9px] tracking-widest text-slate-400 uppercase font-black">Hansung Landscape & Construction</p>
                        <h1 className="text-3xl tracking-tighter uppercase font-black">출 장 신 청 서 작 성</h1>
                    </header>

                    <div className="space-y-10 text-black font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">소속부서</th>
                                    <td className="p-3 font-black">{employee?.department}</td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">성명/직위</th>
                                    <td className="p-3 font-black">{employee?.full_name} {employee?.position}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase tracking-tighter">보존기한</th>
                                    <td className="p-3 font-black">
                                        <select name="preservationPeriod" value={formData.preservationPeriod} onChange={handleChange} className="w-full outline-none bg-transparent font-black">
                                            <option>1년</option><option>3년</option><option>5년</option><option>영구</option>
                                        </select>
                                    </td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase">작성일자</th>
                                    <td className="p-3 font-mono font-black">{new Date().toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">01. 출장 세부 계획</h2>
                            <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                                <tbody>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black text-black">
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">출장기간</th>
                                        <td className="p-3 font-black">
                                            <div className="flex items-center gap-3 font-black">
                                                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="border-b border-slate-200 outline-none focus:border-black py-0.5 font-black" required />
                                                <span className="text-slate-300 font-black">~</span>
                                                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="border-b border-slate-200 outline-none focus:border-black py-0.5 font-black" required />
                                                <span className="ml-2 text-blue-600 font-black">({duration}일간)</span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black">
                                        <th className="bg-slate-50 p-3 text-left border-black font-black uppercase">출장지</th>
                                        <td className="p-3 font-black text-black">
                                            <input type="text" name="destination" value={formData.destination} onChange={handleChange} placeholder="방문지 및 업체명 입력" className="w-full outline-none bg-transparent font-black" required />
                                        </td>
                                    </tr>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black text-black">
                                        <th className="bg-slate-50 p-3 text-left border-black font-black uppercase">연락처</th>
                                        <td className="p-3 font-black">
                                            <input type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="비상 시 연락 가능한 번호" className="w-full outline-none bg-transparent font-black" required />
                                        </td>
                                    </tr>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black text-black">
                                        <th className="bg-slate-50 p-3 text-left border-black font-black uppercase">출장목적</th>
                                        <td className="p-3 font-black">
                                            <textarea name="purpose" value={formData.purpose} onChange={handleChange} className="w-full h-32 outline-none bg-transparent font-black leading-relaxed resize-none pt-1" placeholder="출장의 목적 및 주요 업무 내용을 기술하십시오." required />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        {/* [복구] 02. 교통수단 및 기타 섹션 */}
                        <section className="font-black text-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">02. 교통수단 및 기타</h2>
                            <div className="border border-black p-5 font-black">
                                <div className="flex flex-wrap gap-6 mb-5 font-black">
                                    {['항공', '고속버스', 'KTX', 'SRT', '차량'].map((t) => (
                                        <label key={t} className="flex items-center gap-2 cursor-pointer text-[11px] font-black group">
                                            <input type="radio" name="transportation" value={t} checked={formData.transportation === t} onChange={handleChange} className="accent-black font-black" /> 
                                            <span className="group-hover:underline underline-offset-4 decoration-1 font-black">{t}</span>
                                        </label>
                                    ))}
                                </div>
                                {formData.transportation === '차량' && (
                                    <div className="pt-4 border-t border-dashed border-slate-200 space-y-4 font-black">
                                        <div className="flex flex-wrap gap-6 font-black">
                                            {['자차', '회사차량', '대중교통', '기타'].map((v) => (
                                                <label key={v} className="flex items-center gap-2 cursor-pointer text-[11px] font-black">
                                                    <input type="radio" name="transportDetail" value={v} checked={formData.transportDetail === v} onChange={handleChange} className="accent-black" /> {v}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="pt-6 font-black border-t border-black/5">
                            <p className="text-[10px] mb-4 uppercase tracking-widest text-slate-400 font-black">03. EVIDENCE ATTACHMENT</p>
                            <FileUploadDnd 
                                onUploadComplete={handleUploadComplete} 
                                onUploadingStateChange={setIsUploading}
                            />
                        </div>
                        
                        {attachments.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 font-black">
                                {attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 border border-black/10 rounded-lg group font-black">
                                        <div className="flex items-center gap-2 text-[10px] font-black overflow-hidden text-black">
                                            <ImageIcon size={14} className="text-blue-600 flex-shrink-0" />
                                            <span className="truncate font-black">{file.name} (동기화됨)</span>
                                        </div>
                                        <X 
                                            size={16} 
                                            className="cursor-pointer text-slate-300 hover:text-red-500 transition-colors" 
                                            onClick={() => removeAttachment(idx)} 
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black text-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 font-black text-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black"><Users size={14}/> 결재선 지정</h2>
                            <button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black text-black">+ 추가</button>
                        </div>
                        <div className="space-y-2 font-black text-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black">
                                    <span className="text-[10px] text-slate-400 w-4 font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black">
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name}</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black text-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black"><Users size={14}/> 참조인 지정</h2>
                            <button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black text-black">+ 추가</button>
                        </div>
                        <div className="space-y-2 font-black text-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black">
                                        <option value="">참조인 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name}</option>))}
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