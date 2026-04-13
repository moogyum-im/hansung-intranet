'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, Database, CheckCircle, Users, Calendar, Wallet, ImageIcon, CreditCard, UserPlus, Info, Bold, Palette, Highlighter } from 'lucide-react';

// 🚀 사내 맞춤형 초경량 리치 텍스트 에디터 (캡처 사진 직접 삽입 및 엑셀 표 강제 비율 맞춤 완벽 지원)
const SimpleRichTextEditor = ({ value, onChange }) => {
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

    // 🎯 클립보드 붙여넣기 완벽 제어 로직 (이미지 노드 강제 삽입 및 엑셀 인라인 스타일 제거)
    const handlePaste = (e) => {
        const clipboardData = e.clipboardData;
        if (!clipboardData) return;

        const items = clipboardData.items;
        let hasImage = false;

        // 1. 캡처 이미지 감지 및 DOM 직접 삽입
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                hasImage = true;
                e.preventDefault(); // 일반 텍스트 붙여넣기 방지
                
                const file = items[i].getAsFile();
                if (!file) continue;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64Image = event.target.result;
                    editorRef.current.focus();
                    
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        
                        const imgNode = document.createElement('img');
                        imgNode.src = base64Image;
                        // 이미지 삐져나옴 방지 및 레이아웃 스타일
                        imgNode.style.maxWidth = '100%';
                        imgNode.style.height = 'auto';
                        imgNode.style.borderRadius = '6px';
                        imgNode.style.marginTop = '8px';
                        imgNode.style.marginBottom = '8px';
                        imgNode.style.border = '1px solid #e2e8f0';
                        imgNode.style.display = 'block';
                        
                        range.deleteContents();
                        range.insertNode(imgNode);
                        
                        // 커서를 이미지 바로 뒤로 이동
                        range.setStartAfter(imgNode);
                        range.setEndAfter(imgNode);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    setTimeout(() => onChange(editorRef.current.innerHTML), 50);
                };
                reader.readAsDataURL(file);
                return; // 이미지 처리 후 즉시 종료
            }
        }

        // 2. 엑셀 표 또는 일반 텍스트 붙여넣기 후처리 (강제 너비 속성 제거)
        if (!hasImage) {
            setTimeout(() => {
                if (editorRef.current) {
                    // 엑셀 복사 시 딸려오는 width 강제 속성을 지워 삐져나옴 원천 차단
                    const tables = editorRef.current.querySelectorAll('table');
                    tables.forEach(t => {
                        t.removeAttribute('width');
                        t.style.width = '100%';
                    });
                    const tds = editorRef.current.querySelectorAll('td, th');
                    tds.forEach(td => {
                        td.removeAttribute('width');
                    });
                    
                    onChange(editorRef.current.innerHTML);
                }
            }, 100);
        }
    };

    return (
        <div className="border border-black flex flex-col font-black">
            {/* 툴바 영역 */}
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
            {/* 에디터 본문 영역 */}
            <div
                ref={editorRef}
                /* 🚀 !important 속성을 부여하여 엑셀 고유의 인라인 스타일을 강제 무력화 및 박스 안에 가둠 */
                className="p-6 text-[13px] leading-relaxed min-h-[200px] outline-none focus:bg-slate-50/50 transition-all font-black whitespace-pre-wrap overflow-x-hidden w-full box-border [&_table]:!w-full [&_table]:!max-w-full [&_table]:!table-fixed [&_table]:!border-collapse [&_table]:my-2 [&_table]:text-[11px] [&_td]:!border [&_td]:!border-slate-400 [&_td]:!p-2 [&_td]:!break-all [&_td]:!whitespace-normal [&_th]:!border [&_th]:!border-slate-400 [&_th]:!p-2 [&_th]:!bg-slate-100"
                contentEditable
                onInput={() => onChange(editorRef.current.innerHTML)}
                onPaste={handlePaste}
                placeholder="상세 사유 기술 (스크린샷 캡처본 즉시 붙여넣기 지원 / 엑셀 표 삽입 시 100% 비율 자동 맞춤)"
            />
        </div>
    );
};

export default function ExpenseReportPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({
        title: '지출결의서',
        subject: '', 
        expenseDate: new Date().toISOString().split('T')[0],
        accountType: '교통비',
        paymentMethod: '법인카드',
        amount: '',
        description: '',
        cardNumberLastFour: '',
        document_number: '', 
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

    useEffect(() => {
        const dataToSave = { attachments, formData, approvers, referrers };
        localStorage.setItem('expense_write_backup', JSON.stringify(dataToSave));
    }, [attachments, formData, approvers, referrers]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position').eq('employment_status', '재직');
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

    const handleDescriptionChange = (content) => {
        setFormData(prev => ({ ...prev, description: content }));
    };

    const handleUploadComplete = useCallback((uploadedFiles) => {
        if (Array.isArray(uploadedFiles)) {
            const formattedFiles = uploadedFiles.map(file => ({ name: file.name.normalize('NFC'), path: file.path, size: file.size }));
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
        if (!formData.subject.trim()) return toast.error("지출 제목을 입력해주세요.");
        if (formData.paymentMethod === '법인카드' && !formData.cardNumberLastFour) return toast.error("법인카드 번호(뒷 4자리)를 입력해주세요.");
        if (isUploading) return toast.error("파일 업로드가 완료될 때까지 기다려주세요.");
        if (attachments.length === 0) return toast.error("증빙 자료(영수증)가 첨부되지 않았습니다.");
        if (approvers.length === 0 || approvers.some(app => !app.id)) return toast.error("결재자를 지정해주세요.");

        setLoading(true);
        try {
            const submissionData = {
                title: `지출결의서-${formData.subject}`,
                document_number: formData.document_number, 
                content: JSON.stringify({ ...formData, requesterName: employee.full_name, requesterDepartment: employee.department, requesterPosition: employee.position }),
                document_type: 'expense_report',
                approver_ids: approvers,
                referrer_ids: referrers.filter(r => r.id),
                attachments: attachments,
                requester_id: employee.id,
                requester_name: employee.full_name,
                requester_department: employee.department,
                requester_position: employee.position,
            };
            const response = await fetch('/api/submit-approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionData) });
            if (!response.ok) throw new Error('상신 실패');
            localStorage.removeItem('expense_write_backup');
            localStorage.removeItem('expense_temp_attachments');
            toast.success("상신되었습니다.");
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

    if (employeeLoading) return <div className="p-10 text-center text-black font-black text-xs h-screen flex flex-col items-center justify-center font-sans animate-pulse tracking-widest uppercase font-black">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none font-black">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black font-black">
                <div className="flex items-center gap-2"></div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "업로드 중..." : <><CheckCircle size={14} /> 지출결의서 상신</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative text-black font-black">
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8 font-black">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black tracking-tighter uppercase font-black font-black">지 출 결 의 서</h1>
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
                                            <th key={i} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black">
                                                {app.position || '결재'}
                                            </th>
                                        ))}
                                        {approvers.length < 1 && <th className="w-24 h-8 bg-slate-50 border border-dashed border-slate-200"></th>}
                                    </tr>
                                    <tr className="h-20 font-black text-black">
                                        <td className="border border-black p-1 text-center align-middle font-black">
                                            <div className="text-slate-300 font-black border-2 border-slate-200 rounded-full w-10 h-10 flex items-center justify-center mx-auto text-[7px] leading-tight uppercase font-black">Draft</div>
                                            <div className="mt-1 font-black text-[9px] font-black">{employee?.full_name}</div>
                                        </td>
                                        {approvers.map((app, i) => (
                                            <td key={i} className="border border-black p-1 text-center align-middle font-black font-black">
                                                <div className="text-slate-100 font-black border-2 border-slate-100 border-dashed rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] leading-tight uppercase italic font-black font-black">Sign</div>
                                                <div className="mt-1 font-black text-[10px] font-black">{app.full_name || '미지정'}</div>
                                            </td>
                                        ))}
                                        {approvers.length < 1 && <td className="border border-dashed border-slate-100 font-black"></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-10 font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">지출 제목 <HelpTooltip text="지출의 목적을 간략하게 입력하세요. (예: 주간 유류비 청구)" /></th>
                                    <td colSpan="3" className="p-0 font-black">
                                        <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="지출 제목 입력" className="w-full h-11 px-3 outline-none bg-transparent font-black text-sm tracking-tighter font-black" required />
                                    </td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase tracking-tighter w-24">문서번호 <HelpTooltip text="기안자가 직접 문서 번호를 기입하십시오." /></th>
                                    <td className="p-3 font-black">
                                        <input type="text" name="document_number" value={formData.document_number} onChange={handleChange} placeholder="예: EXP-202603-001 (직접 입력)" className="w-full outline-none bg-transparent font-black font-mono font-black font-black" />
                                    </td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase w-24">기안일자</th>
                                    <td className="p-3 font-mono font-black font-black">{new Date().toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="font-black font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black">01. 지출 정보 상세</h2>
                            <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black font-black">
                                <tbody>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black font-black font-black">지출일자 <HelpTooltip text="영수증에 기재된 실제 결제 일자를 선택하십시오." /></th>
                                        <td className="p-3 font-black"><input type="date" name="expenseDate" value={formData.expenseDate} onChange={handleChange} className="w-full outline-none bg-transparent font-black font-mono font-black" required /></td>
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black font-black">지출금액 <HelpTooltip text="부가세 포함 총 결제 금액을 입력하십시오." /></th>
                                        <td className="p-3 font-black"><div className="flex items-center gap-1 font-black font-black font-black font-black"><span className="text-slate-400 font-black">₩</span><input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0" className="w-full outline-none bg-transparent font-black text-blue-700 font-black font-black" required /></div></td>
                                    </tr>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                        <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black font-black">계정과목 <HelpTooltip text="지출 성격에 맞는 항목을 선택하십시오." /></th>
                                        <td className="p-3 font-black font-black font-black"><select name="accountType" value={formData.accountType} onChange={handleChange} className="w-full outline-none bg-transparent font-black font-black"><option>교통비</option><option>식비</option><option>비품구매</option><option>접대비</option><option>기타</option></select></td>
                                        <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black font-black">결제수단 <HelpTooltip text="법인카드 사용 시 카드 번호 뒷 4자리를 반드시 입력해 주십시오." /></th>
                                        <td className="p-3 font-black font-black">
                                            <div className="flex flex-col gap-2 font-black font-black">
                                                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full outline-none bg-transparent font-black font-black font-black"><option value="법인카드">법인카드</option><option value="개인카드">개인카드</option><option value="현금">현금</option></select>
                                                {formData.paymentMethod === '법인카드' && (
                                                    <div className="flex items-center gap-1 border-t border-black/5 pt-1 font-black font-black font-black font-black"><CreditCard size={10} className="text-blue-600 font-black font-black" /><input type="text" name="cardNumberLastFour" value={formData.cardNumberLastFour} onChange={handleChange} maxLength="4" placeholder="뒷 4자리" className="w-full outline-none bg-slate-50 text-[10px] p-1 font-mono font-black" /></div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="font-black font-black font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black font-black font-black">02. 상세 내역 (적요) <HelpTooltip text="상세 사유 기술 (드래그 후 툴바를 이용해 글자색 변경 가능)" /></h2>
                            <SimpleRichTextEditor value={formData.description} onChange={handleDescriptionChange} />
                        </section>

                        <section className="font-black border-t border-black/5 pt-6 font-black font-black font-black font-black">
                            <h2 className="text-[10px] mb-4 uppercase tracking-tighter font-black font-black font-black font-black">03. 증빙 자료 첨부 <HelpTooltip text="영수증이나 카드 전표 사진을 반드시 첨부하십시오." /></h2>
                            <FileUploadDnd onUploadComplete={handleUploadComplete} onUploadingStateChange={setIsUploading} />
                        </section>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black font-black font-black">
                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm font-black text-black font-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b-2 border-black/5 pb-2 font-black font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black"><Users size={14}/> 결재선 지정</h2>
                            <button type="button" onClick={addApprover} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black font-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-3 font-black font-black font-black font-black font-black font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black font-black">
                                    <span className="text-[10px] text-slate-400 w-4 font-black font-black font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e) => handleApproverChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black" required>
                                        <option value="">결재자 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-red-500 font-black font-black font-black font-black" onClick={() => removeApprover(i)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm font-black text-black font-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black font-black font-black font-black font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black font-black font-black font-black font-black"><Users size={14}/> 참조인 지정</h2>
                            <button type="button" onClick={addReferrer} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black font-black font-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-2 font-black font-black font-black font-black font-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black font-black font-black font-black font-black font-black">
                                    <select value={ref.id} onChange={(e) => handleReferrerChange(i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black font-black">
                                        <option value="">참조인 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black font-black font-black font-black" onClick={() => removeReferrer(i)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}