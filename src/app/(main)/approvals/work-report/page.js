'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, ChevronRight, Users, Calendar, Camera, Trash2, ArrowLeft, ImageIcon, Info } from 'lucide-react';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function WorkReportPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [selectedImg, setSelectedImg] = useState(null);

    const timeSlots = [
        '08:30 - 09:30', '09:30 - 10:30', '10:30 - 11:30', '11:30 - 12:00', 
        '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:30'
    ];

    const [visibleSections, setVisibleSections] = useState({
        hourlyTasks: true,
        todayPlan: true,
        achievements: true,
        issues: true,
        nextPlan: true,
        gallery: true 
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
        galleryItems: [] 
    });
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);

    // 🚀 부서별 직원 그룹화 및 정렬 로직 (재직자 대상)
    const groupedEmployees = useMemo(() => {
        const groups = allEmployees.reduce((acc, emp) => {
            const dept = emp.department || '기타';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(emp);
            return acc;
        }, {});

        const priority = {
            '최고 경영진': 1,
            '전략기획부': 4,
            '공무부': 2,
            '관리부': 3
        };

        return Object.keys(groups)
            .sort((a, b) => (priority[a] || 999) - (priority[b] || 999) || a.localeCompare(b))
            .reduce((acc, key) => { acc[key] = groups[key]; return acc; }, {});
    }, [allEmployees]);

    useEffect(() => {
        const saved = localStorage.getItem('work_report_draft_backup');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const safeFormData = {
                    ...parsed.formData,
                    galleryItems: Array.isArray(parsed.formData?.galleryItems) ? parsed.formData.galleryItems : []
                };
                setFormData(prev => ({ ...prev, ...safeFormData }));
                setApprovers(parsed.approvers || []);
                setReferrers(parsed.referrers || []);
                setAttachments(parsed.attachments || []);
                setVisibleSections(parsed.visibleSections || visibleSections);
            } catch (e) { 
                console.error("복구 실패", e);
                localStorage.removeItem('work_report_draft_backup');
            }
        }
    }, []);

    useEffect(() => {
        const dataToSave = { formData, approvers, referrers, attachments, visibleSections };
        localStorage.setItem('work_report_draft_backup', JSON.stringify(dataToSave));
    }, [formData, approvers, referrers, attachments, visibleSections]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, department, position')
                .eq('employment_status', '재직'); // 🚀 퇴사자 제외
            
            if (data) setAllEmployees(data);
        };
        if (!employeeLoading && employee) { fetchEmployees(); }
    }, [employee, employeeLoading]);

    const handleGalleryCapture = async (idx, type, file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast.error("이미지 파일만 업로드 가능합니다.");
            return;
        }
        setIsUploading(true);
        toast.loading("사진 업로드 중...", { id: 'gallery-upload' });

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_gallery_${idx}_${type}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('images').upload(`work_report/${fileName}`, file);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`work_report/${fileName}`);
            setFormData(prev => {
                const nextItems = [...prev.galleryItems];
                nextItems[idx][type] = { url: publicUrl }; 
                return { ...prev, galleryItems: nextItems };
            });
            toast.success("업로드 완료", { id: 'gallery-upload' });
        } else {
            toast.error("업로드 실패", { id: 'gallery-upload' });
        }
        setIsUploading(false);
    };

    const handleDrop = (e, idx, type) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleGalleryCapture(idx, type, file);
    };

    const handleDragOver = (e) => e.preventDefault();
    const handleVisibilityChange = (section) => setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleHourlyChange = (time, value) => setFormData(prev => ({ ...prev, hourlyTasks: { ...prev.hourlyTasks, [time]: value } }));
    const handleQuillChange = (value) => setFormData(prev => ({ ...prev, achievements: value }));

    const addGalleryItem = () => {
        setFormData(prev => ({
            ...prev,
            galleryItems: [...prev.galleryItems, { before: { url: '' }, after: { url: '' }, description: '' }]
        }));
    };

    const removeGalleryItem = (index) => {
        setFormData(prev => ({ ...prev, galleryItems: prev.galleryItems.filter((_, i) => i !== index) }));
    };

    const handleGalleryTextChange = (index, value) => {
        const nextItems = [...formData.galleryItems];
        nextItems[index].description = value;
        setFormData(prev => ({ ...prev, galleryItems: nextItems }));
    };

    const handleUploadComplete = useCallback((uploadedFiles) => {
        if (Array.isArray(uploadedFiles)) {
            const formattedFiles = uploadedFiles.map(file => ({
                name: file.name.normalize('NFC'), path: file.path, size: file.size
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
        if (approvers.length === 0 || approvers.some(app => !app.id)) return toast.error("결재자를 지정해주세요.");
        
        setLoading(true);
        try {
            const submissionData = {
                title: `${formData.reportType} (${employee.full_name})`,
                content: JSON.stringify({
                    ...formData,
                    visibleSections: visibleSections,
                    requesterName: employee.full_name,
                    requesterDepartment: employee.department,
                    requesterPosition: employee.position,
                }),
                document_type: 'work_report',
                approver_ids: approvers,
                referrer_ids: referrers.filter(r => r.id),
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

    if (employeeLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center animate-pulse font-sans">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none relative font-black">
            {selectedImg && (
                <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out no-print" onClick={() => setSelectedImg(null)}>
                    <img src={selectedImg} alt="zoom" className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-10 right-10 text-white font-black"><X size={40}/></button>
                </div>
            )}

            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-black hover:bg-white/50 p-2 rounded-full transition-all font-black"><ArrowLeft size={24}/></button>
                </div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin font-black" /> : <><CheckCircle size={14} /> 업무보고서 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative font-black">
                    
                    {/* 🚀 상단 헤더 및 실시간 결재 박스 UI */}
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8 font-black font-black">
                        <div className="space-y-4 font-black">
                            <h1 className="text-4xl font-black tracking-tighter uppercase font-black font-black">업 무 보 고 서</h1>
                            <div className="flex flex-col text-[11px] space-y-1 font-black">
                                <span>기안부서 : {employee?.department}</span>
                                <span>기안자 : {employee?.full_name} {employee?.position}</span>
                            </div>
                        </div>

                        <div className="flex font-black font-black">
                            <table className="border-collapse border border-black text-[11px] font-black font-black">
                                <tbody>
                                    <tr className="font-black">
                                        <th rowSpan="2" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvers.map((app, i) => (
                                            <th key={i} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black font-black">
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

                    <div className="mb-8 p-5 bg-slate-50 border border-black font-black">
                        <p className="text-[10px] font-black text-slate-400 mb-4 uppercase font-black">REPORT SECTION CONFIGURATION</p>
                        <div className="flex flex-wrap gap-6 font-black font-black">
                            {['hourlyTasks', 'todayPlan', 'achievements', 'gallery', 'issues', 'nextPlan'].map((id) => (
                                <label key={id} className="flex items-center gap-2 cursor-pointer font-black font-black">
                                    <input type="checkbox" checked={visibleSections[id]} onChange={() => handleVisibilityChange(id)} className="accent-black" />
                                    <span className="text-[11px] font-black uppercase font-black">
                                        {id === 'hourlyTasks' ? '시간별 내역' : id === 'todayPlan' ? '금일 계획' : id === 'achievements' ? '상세 실적' : id === 'gallery' ? '전/후 비교' : id === 'issues' ? '특이사항' : '향후 계획'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-10 text-black font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black font-black">보고유형 <HelpTooltip text="보고서의 성격(일일/주간/월간)을 선택하십시오." /></th>
                                    <td className="p-3 font-black">
                                        <select name="reportType" value={formData.reportType} onChange={handleChange} className="w-full bg-transparent outline-none font-black"><option>일일보고</option><option>주간보고</option><option>월간보고</option><option>기타</option></select>
                                    </td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black font-black">보고일자</th>
                                    <td className="p-3 font-mono font-black font-black"><input type="date" name="reportDate" value={formData.reportDate} onChange={handleChange} className="w-full bg-transparent outline-none font-black" /></td>
                                </tr>
                            </tbody>
                        </table>

                        {visibleSections.hourlyTasks && (
                            <section className="font-black font-black font-black">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black">01. 시간별 주요 업무 내역 <HelpTooltip text="시간대별로 진행한 업무의 핵심 내용을 기재하십시오." /></h2>
                                <div className="border border-black font-black">
                                    {timeSlots.map(time => (
                                        <div key={time} className="flex border-b border-black last:border-0 divide-x divide-black font-black font-black">
                                            <div className="bg-slate-50 w-32 p-2 text-center text-[10px] font-mono font-black">{time}</div>
                                            <input type="text" value={formData.hourlyTasks[time]} onChange={(e) => handleHourlyChange(time, e.target.value)} className="flex-1 px-4 py-2 outline-none text-[11px] font-black bg-transparent font-black font-black" placeholder="업무 내용 입력" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {visibleSections.todayPlan && (
                            <section className="font-black font-black">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black">02. 금일 주요 업무 계획</h2>
                                <textarea name="todayPlan" value={formData.todayPlan} onChange={handleChange} className="w-full border border-black p-5 text-[12px] leading-relaxed min-h-[100px] outline-none font-black bg-transparent font-black font-black" placeholder="금일 주요 추진 업무 계획" />
                            </section>
                        )}

                        {visibleSections.achievements && (
                            <section className="font-black font-black font-black font-black">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black">03. 상세 업무 진행 실적 <HelpTooltip text="수치, 결과물 등 구체적인 업무 성과를 기술하십시오." /></h2>
                                <div className="border border-black font-black font-black font-black font-black">
                                    <ReactQuill theme="snow" value={formData.achievements} onChange={handleQuillChange} className="h-64 mb-10 font-black font-black font-black" />
                                </div>
                            </section>
                        )}

                        {visibleSections.gallery && (
                            <section className="font-black font-black">
                                <div className="flex justify-between items-center mb-3 font-black">
                                    <h2 className="text-[10px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black"><Camera size={14} /> 04. 전/후 과정 비교 <HelpTooltip text="현장의 변화 과정이나 조치 전후를 사진으로 기록하십시오." /></h2>
                                    <button type="button" onClick={addGalleryItem} className="text-[10px] bg-black text-white px-4 py-1.5 rounded-sm flex items-center gap-2 hover:bg-slate-800 transition-all font-black font-black font-black font-black"><Plus size={14} /> 행 추가</button>
                                </div>
                                <div className="space-y-6 font-black font-black font-black font-black">
                                    {formData.galleryItems.map((item, idx) => (
                                        <div key={idx} className="border-2 border-black p-5 bg-white relative font-black">
                                            <button type="button" onClick={() => removeGalleryItem(idx)} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1 shadow-lg z-20 no-print font-black font-black"><X size={16}/></button>
                                            <div className="grid grid-cols-2 gap-4 mb-4 font-black">
                                                <div className="space-y-2 text-center relative group font-black font-black font-black">
                                                    <p className="text-[9px] uppercase text-slate-400 font-black">BEFORE</p>
                                                    <div className="aspect-[4/3] bg-slate-50 border border-black rounded flex flex-col items-center justify-center relative overflow-hidden transition-all hover:bg-slate-100 font-black" onDrop={(e) => handleDrop(e, idx, 'before')} onDragOver={handleDragOver}>
                                                        {item.before?.url ? (
                                                            <img src={item.before.url} className="w-full h-full object-cover cursor-zoom-in font-black" onClick={() => setSelectedImg(item.before.url)} />
                                                        ) : (
                                                            <label className="cursor-pointer flex flex-col items-center hover:text-blue-600 transition-colors font-black">
                                                                <Camera size={24} className="text-slate-300 mb-1 font-black" />
                                                                <span className="text-[8px] font-black uppercase text-slate-400 font-black">UPLOAD</span>
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e)=>handleGalleryCapture(idx, 'before', e.target.files[0])} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2 text-center relative group font-black font-black font-black">
                                                    <p className="text-[9px] uppercase text-blue-600 font-black font-black font-black">AFTER</p>
                                                    <div className="aspect-[4/3] bg-slate-50 border border-black rounded flex flex-col items-center justify-center relative overflow-hidden transition-all hover:bg-slate-100 font-black" onDrop={(e) => handleDrop(e, idx, 'after')} onDragOver={handleDragOver}>
                                                        {item.after?.url ? (
                                                            <img src={item.after.url} className="w-full h-full object-cover cursor-zoom-in font-black font-black font-black font-black font-black" onClick={() => setSelectedImg(item.after.url)} />
                                                        ) : (
                                                            <label className="cursor-pointer flex flex-col items-center hover:text-blue-600 transition-colors font-black font-black font-black">
                                                                <Camera size={24} className="text-slate-300 mb-1 font-black font-black font-black" />
                                                                <span className="text-[8px] font-black uppercase text-slate-400 font-black font-black">UPLOAD</span>
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e)=>handleGalleryCapture(idx, 'after', e.target.files[0])} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <textarea value={item.description} onChange={(e) => handleGalleryTextChange(idx, e.target.value)} className="w-full p-3 text-[11px] outline-none bg-slate-50 border border-black/10 resize-none min-h-[60px] font-black font-black font-black" placeholder="현장 조치 내역 입력" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {visibleSections.issues && (
                            <section className="font-black font-black font-black font-black">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black text-red-600">05. 특이사항 및 문제점</h2>
                                <textarea name="issues" value={formData.issues} onChange={handleChange} className="w-full border border-black p-5 text-[12px] leading-relaxed min-h-[100px] outline-none bg-red-50/5 font-black font-black font-black" placeholder="문제점 및 건의사항 입력" />
                            </section>
                        )}

                        {visibleSections.nextPlan && (
                            <section className="font-black font-black font-black font-black">
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black">06. 향후 업무 추진 계획</h2>
                                <textarea name="nextPlan" value={formData.nextPlan} onChange={handleChange} className="w-full border border-black p-5 text-[12px] leading-relaxed min-h-[100px] outline-none font-black bg-transparent font-black font-black font-black" placeholder="명일 또는 차주 업무 계획 입력" />
                            </section>
                        )}

                        <section className="border-t border-black/5 pt-6 font-black font-black">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black font-black font-black font-black font-black font-black">07. 증빙 자료 첨부 <HelpTooltip text="보고 내용과 관련된 영수증, 공문, 도면 등을 첨부하십시오." /></h2>
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
                        </section>

                        <div className="pt-10 text-center font-black font-black font-black font-black font-black">
                            <p className="text-xl font-black uppercase tracking-widest font-black font-black font-black font-black font-black font-black">보고인: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black font-black font-black font-black font-black">
                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm font-black text-black">
                        <div className="flex items-center justify-between mb-4 border-b-2 border-black/5 pb-2 font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black font-black font-black"><Users size={14}/> 결재선 지정</h2>
                            <button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black font-black font-black font-black font-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-3 font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black">
                                    <span className="text-[10px] text-slate-400 w-4 font-black font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black font-black font-black font-black font-black" required>
                                        <option value="">결재자 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-red-500 font-black font-black font-black font-black font-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm font-black text-black font-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black"><Users size={14}/> 참조인 지정</h2>
                            <button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                                        <option value="">참조인 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
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