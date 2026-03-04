'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, ChevronRight, Users, Calendar, Camera, Trash2, ArrowLeft, ImageIcon } from 'lucide-react';

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
        galleryItems: [] // 기본 빈 배열
    });
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState([]);

    // 🚀 [수정] 데이터 복구 시 방어 로직 강화
    useEffect(() => {
        const saved = localStorage.getItem('work_report_draft_backup');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // 갤러리 아이템이 배열인지 확인하고, 아니면 빈 배열로 초기화 (에러 원인 차단)
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
                console.error("복구 실패 - 데이터를 초기화합니다.", e);
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
            const { data } = await supabase.from('profiles').select('id, full_name, department, position');
            setAllEmployees(data || []);
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
                    visibleSections: visibleSections,
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
        } catch (error) { toast.error(error.message); } finally { setLoading(false); }
    };

    if (employeeLoading) return <div className="p-10 text-black font-black text-xs h-screen flex items-center justify-center animate-pulse font-sans">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none relative">
            {selectedImg && (
                <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out no-print" onClick={() => setSelectedImg(null)}>
                    <img src={selectedImg} alt="zoom" className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-10 right-10 text-white"><X size={40}/></button>
                </div>
            )}

            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-black hover:bg-white/50 p-2 rounded-full transition-all"><ArrowLeft size={24}/></button>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Database size={14} className="text-black" />
                        <span className="text-[10px] uppercase tracking-widest font-black text-black">HANSUNG ERP DOCUMENT SYSTEM</span>
                    </div>
                </div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="px-6 py-2 bg-black text-white border border-black text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} className="inline mr-2" /> 업무보고서 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative font-black font-sans">
                    <header className="mb-10 border-b-4 border-black pb-6 font-black">
                        <p className="text-[9px] tracking-widest text-slate-400 uppercase font-black">Hansung Landscape & Construction</p>
                        <h1 className="text-3xl tracking-tighter uppercase font-black">업 무 보 고 서 작 성</h1>
                    </header>

                    <div className="mb-8 p-5 bg-slate-50 border border-black font-black">
                        <p className="text-[10px] font-black text-slate-400 mb-4 uppercase">REPORT SECTION CONFIGURATION</p>
                        <div className="flex flex-wrap gap-6">
                            {['hourlyTasks', 'todayPlan', 'achievements', 'gallery', 'issues', 'nextPlan'].map((id) => (
                                <label key={id} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={visibleSections[id]} onChange={() => handleVisibilityChange(id)} className="accent-black" />
                                    <span className="text-[11px] font-black uppercase">
                                        {id === 'hourlyTasks' ? '시간별 내역' : id === 'todayPlan' ? '금일 계획' : id === 'achievements' ? '상세 실적' : id === 'gallery' ? '전/후 과정 비교' : id === 'issues' ? '특이사항' : '향후 계획'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-10 text-black font-black font-sans">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px]">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안부서</th>
                                    <td className="p-3">{employee?.department}</td>
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">기안자</th>
                                    <td className="p-3">{employee?.full_name} {employee?.position}</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase">보고유형</th>
                                    <td className="p-3">
                                        <select name="reportType" value={formData.reportType} onChange={handleChange} className="w-full bg-transparent outline-none font-black"><option>일일보고</option><option>주간보고</option><option>월간보고</option><option>기타</option></select>
                                    </td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase">보고일자</th>
                                    <td className="p-3 font-mono"><input type="date" name="reportDate" value={formData.reportDate} onChange={handleChange} className="w-full bg-transparent outline-none font-black" /></td>
                                </tr>
                            </tbody>
                        </table>

                        {visibleSections.hourlyTasks && (
                            <section>
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">01. 시간별 주요 업무 내역</h2>
                                <div className="border border-black">
                                    {timeSlots.map(time => (
                                        <div key={time} className="flex border-b border-black last:border-0 divide-x divide-black font-black">
                                            <div className="bg-slate-50 w-32 p-2 text-center text-[10px] font-mono font-black">{time}</div>
                                            <input type="text" value={formData.hourlyTasks[time]} onChange={(e) => handleHourlyChange(time, e.target.value)} className="flex-1 px-4 py-2 outline-none text-[11px] font-black bg-transparent" placeholder="업무 내용을 입력하십시오." />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {visibleSections.todayPlan && (
                            <section>
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">02. 금일 주요 업무 계획</h2>
                                <textarea name="todayPlan" value={formData.todayPlan} onChange={handleChange} className="w-full border border-black p-5 text-[12px] leading-relaxed min-h-[100px] outline-none font-black bg-transparent" placeholder="금일 진행 예정인 업무를 입력하십시오." />
                            </section>
                        )}

                        {visibleSections.achievements && (
                            <section>
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">03. 상세 업무 진행 실적</h2>
                                <div className="border border-black">
                                    <ReactQuill theme="snow" value={formData.achievements} onChange={handleQuillChange} className="h-64 mb-10 font-black font-sans" />
                                </div>
                            </section>
                        )}

                        {visibleSections.gallery && (
                            <section>
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-[10px] uppercase tracking-tighter flex items-center gap-2 font-black"><Camera size={14} /> 04. 전/후 과정 비교</h2>
                                    <button type="button" onClick={addGalleryItem} className="text-[10px] bg-black text-white px-4 py-1.5 rounded-sm flex items-center gap-2 hover:bg-slate-800 transition-all font-black"><Plus size={14} /> 비교 행 추가</button>
                                </div>
                                <div className="space-y-6">
                                    {Array.isArray(formData.galleryItems) && formData.galleryItems.map((item, idx) => (
                                        <div key={idx} className="border-2 border-black p-5 bg-white relative font-black">
                                            <button type="button" onClick={() => removeGalleryItem(idx)} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1 shadow-lg z-20 no-print font-black"><X size={16}/></button>
                                            
                                            <div className="grid grid-cols-2 gap-4 mb-4 font-black">
                                                <div className="space-y-2 text-center relative group">
                                                    <p className="text-[9px] uppercase text-slate-400 font-black">BEFORE (작업 전)</p>
                                                    <div className="aspect-[4/3] bg-slate-50 border border-black rounded flex flex-col items-center justify-center relative overflow-hidden transition-all hover:bg-slate-100" onDrop={(e) => handleDrop(e, idx, 'before')} onDragOver={handleDragOver}>
                                                        {item.before?.url ? (
                                                            <>
                                                                <img src={item.before.url} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setSelectedImg(item.before.url)} />
                                                                <button onClick={()=>{const n={...formData}; n.galleryItems[idx].before={url:''}; setFormData(n);}} className="absolute top-1 right-1 p-1 bg-white rounded-full text-rose-600 shadow-md opacity-0 group-hover:opacity-100 no-print transition-opacity"><Trash2 size={12}/></button>
                                                            </>
                                                        ) : (
                                                            <label className="cursor-pointer flex flex-col items-center hover:text-blue-600 transition-colors">
                                                                <Camera size={24} className="text-slate-300 mb-1" />
                                                                <span className="text-[8px] font-black uppercase text-slate-400 text-center px-2">사진 촬영 또는 파일 끌어오기</span>
                                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>handleGalleryCapture(idx, 'before', e.target.files[0])} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2 text-center relative group">
                                                    <p className="text-[9px] uppercase text-blue-600 font-black">AFTER (작업 후)</p>
                                                    <div className="aspect-[4/3] bg-slate-50 border border-black rounded flex flex-col items-center justify-center relative overflow-hidden transition-all hover:bg-slate-100" onDrop={(e) => handleDrop(e, idx, 'after')} onDragOver={handleDragOver}>
                                                        {item.after?.url ? (
                                                            <>
                                                                <img src={item.after.url} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setSelectedImg(item.after.url)} />
                                                                <button onClick={()=>{const n={...formData}; n.galleryItems[idx].after={url:''}; setFormData(n);}} className="absolute top-1 right-1 p-1 bg-white rounded-full text-rose-600 shadow-md opacity-0 group-hover:opacity-100 no-print transition-opacity"><Trash2 size={12}/></button>
                                                            </>
                                                        ) : (
                                                            <label className="cursor-pointer flex flex-col items-center hover:text-blue-600 transition-colors">
                                                                <Camera size={24} className="text-slate-300 mb-1" />
                                                                <span className="text-[8px] font-black uppercase text-slate-400 text-center px-2">사진 촬영 또는 파일 끌어오기</span>
                                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>handleGalleryCapture(idx, 'after', e.target.files[0])} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <textarea value={item.description} onChange={(e) => handleGalleryTextChange(idx, e.target.value)} className="w-full p-3 text-[11px] outline-none bg-slate-50 border border-black/10 resize-none min-h-[60px] font-black" placeholder="현장 전/후 상황 또는 조치 내역을 입력하십시오." />
                                        </div>
                                    ))}
                                    {(!formData.galleryItems || formData.galleryItems.length === 0) && <div className="border border-dashed border-slate-300 p-12 text-center text-slate-400 text-[11px] font-black">비교 항목이 없습니다. 상단의 '비교 행 추가'를 눌러 등록하십시오.</div>}
                                </div>
                            </section>
                        )}

                        {visibleSections.issues && (
                            <section>
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black text-red-600">05. 특이사항 및 문제점</h2>
                                <textarea name="issues" value={formData.issues} onChange={handleChange} className="w-full border border-black p-5 text-[12px] leading-relaxed min-h-[100px] outline-none bg-red-50/5 font-black font-black" placeholder="특이사항을 기술하십시오." />
                            </section>
                        )}

                        {/* 🚀 향후 계획 섹션 반영 */}
                        {visibleSections.nextPlan && (
                            <section>
                                <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black">06. 향후 업무 추진 계획</h2>
                                <textarea name="nextPlan" value={formData.nextPlan} onChange={handleChange} className="w-full border border-black p-5 text-[12px] leading-relaxed min-h-[100px] outline-none font-black bg-transparent" placeholder="다음 업무 추진 계획 및 예정 사항을 입력하십시오." />
                            </section>
                        )}

                        <section className="border-t border-black/5 pt-6 font-black">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black">07. 증빙 자료 첨부</h2>
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
                            {attachments.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 no-print">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 border border-black/10 rounded-lg group font-black">
                                            <div className="flex items-center gap-2 text-[10px] font-black overflow-hidden text-black"><ImageIcon size={14} className="text-blue-600 flex-shrink-0" /><span className="truncate font-black">{file.name}</span></div>
                                            <X size={16} className="cursor-pointer text-slate-300 hover:text-red-500 transition-colors" onClick={() => removeAttachment(idx)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="pt-10 text-center font-black">
                            <p className="text-xl font-black uppercase tracking-widest font-black">보고인: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 font-black font-black font-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black font-black"><Users size={14}/> 결재선 지정</h2><button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black font-black">+ 추가</button></div>
                        <div className="space-y-2">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black"><span className="text-[10px] text-slate-400 w-4 font-black font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black font-black" required>
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black font-black font-black font-black"><h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black font-black font-black"><Users size={14}/> 참조인 지정</h2><button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black font-black font-black">+ 추가</button></div>
                        <div className="space-y-2">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black font-black">
                                        <option value="">참조인 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>[{emp.department}] {emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black font-black font-black font-black font-black" onClick={() => removeReferrer(i)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}