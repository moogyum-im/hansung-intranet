'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';
import { X, Plus, Loader2, CheckCircle, FileIcon, Trash2, ChevronRight, Users, ImageIcon, Map, Info } from 'lucide-react';

export default function ExpenseSettlementPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();
    const [isRestored, setIsRestored] = useState(false);
    const [saveStatus, setSaveStatus] = useState('완료');
    const isInitialMount = useRef(true);

    const [allEmployees, setAllEmployees] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [mapAttachments, setMapAttachments] = useState([]); 
    const [receiptAttachments, setReceiptAttachments] = useState([]); 

    const FUEL_STANDARDS = { '경유': 12.52, '휘발유': 11.97, 'LPG': 8.83 };

    const [formData, setFormData] = useState({
        title: '출장 여비 정산서',
        preservationPeriod: '5년',
        startDate: '', endDate: '',
        startLocation: '', endLocation: '',
        carNumber: '', 
        fuelType: '경유', 
        fuelPrice: '', 
        fuelEfficiency: 12.52,
        distance: '', 
        bankName: '', accountNumber: '', draftComment: '',
        otherExpenses: [{ item: '', amount: 0, receipt: 'O' }]
    });

    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);

    // 🚀 부서별 그룹화 및 정렬 로직
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
        const init = async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, department, position').eq('employment_status', '재직');
            if (data) setAllEmployees(data);
            
            const saved = localStorage.getItem('HANSUNG_DRAFT_EXPENSE_SETTLEMENT_FINAL_V3');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setFormData(parsed.formData);
                    if (parsed.approvers) setApprovers(parsed.approvers);
                    if (parsed.referrers) setReferrers(parsed.referrers);
                    if (parsed.mapAttachments) setMapAttachments(parsed.mapAttachments);
                    if (parsed.receiptAttachments) setReceiptAttachments(parsed.receiptAttachments);
                } catch (e) { console.error("복구 실패", e); }
            }
            setIsRestored(true);
        };
        init();
    }, []);

    useEffect(() => {
        if (!isRestored) return;
        if (isInitialMount.current) { isInitialMount.current = false; return; }
        setSaveStatus('저장중');
        const timeout = setTimeout(() => {
            try {
                localStorage.setItem('HANSUNG_DRAFT_EXPENSE_SETTLEMENT_FINAL_V3', JSON.stringify({ 
                    formData, approvers, referrers, mapAttachments, receiptAttachments 
                }));
                setSaveStatus('완료');
            } catch (e) { setSaveStatus('에러'); }
        }, 300);
        return () => clearTimeout(timeout);
    }, [formData, approvers, referrers, mapAttachments, receiptAttachments, isRestored]);

    const handleFuelTypeChange = (type) => {
        setFormData(prev => ({ ...prev, fuelType: type, fuelEfficiency: FUEL_STANDARDS[type] }));
    };

    const fuelAndDepreciation = useMemo(() => {
        const dist = Number(formData.distance) || 0;
        const fuelPrice = Number(formData.fuelPrice) || 0;
        const fuelEfficiency = Number(formData.fuelEfficiency) || 1;
        if (dist === 0 || fuelPrice === 0) return 0;
        return Math.floor((fuelPrice * dist) / fuelEfficiency + (dist * 300)); 
    }, [formData.fuelPrice, formData.distance, formData.fuelEfficiency]);

    const otherTotal = useMemo(() => formData.otherExpenses.reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0), [formData.otherExpenses]);
    const totalAmount = useMemo(() => fuelAndDepreciation + otherTotal, [fuelAndDepreciation, otherTotal]);

    const handleMapUpload = useCallback((uploadedFiles) => {
        const formatted = uploadedFiles.map(file => ({ name: file.name.normalize('NFC'), path: file.path, size: file.size }));
        setMapAttachments(prev => [...prev, ...formatted]);
        setIsUploading(false);
    }, []);

    const handleReceiptUpload = useCallback((uploadedFiles) => {
        const formatted = uploadedFiles.map(file => ({ name: file.name.normalize('NFC'), path: file.path, size: file.size }));
        setReceiptAttachments(prev => [...prev, ...formatted]);
        setIsUploading(false);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isUploading) return toast.error("파일 업로드가 완료될 때까지 기다려주세요.");
        if (!formData.startDate || !formData.carNumber) return toast.error("필수 정보를 입력해주세요.");
        if (approvers.length === 0 || approvers.some(a => !a.id)) return toast.error("결재자를 지정해주세요.");
        
        setLoading(true);
        try {
            const submissionData = {
                title: `${formData.title} (${employee?.full_name})`,
                content: JSON.stringify({ ...formData, fuelAndDepreciation, otherTotal, totalAmount, mapAttachments, receiptAttachments }),
                document_type: 'expense_settlement',
                approver_ids: approvers.map(a => {
                    const emp = allEmployees.find(e => e.id === a.id);
                    return { id: a.id, full_name: emp?.full_name, position: emp?.position };
                }),
                referrer_ids: referrers.filter(r => r.id).map(r => {
                    const emp = allEmployees.find(e => e.id === r.id);
                    return { id: r.id, full_name: emp?.full_name, position: emp?.position };
                }),
                requester_id: employee.id, 
                requester_name: employee.full_name,
                requester_department: employee.department, 
                requester_position: employee.position,
                attachments: [...mapAttachments, ...receiptAttachments],
            };

            const res = await fetch('/api/submit-approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionData) });
            if (!res.ok) throw new Error('상신 실패');
            localStorage.removeItem('HANSUNG_DRAFT_EXPENSE_SETTLEMENT_FINAL_V3');
            toast.success("결재 상신 완료!");
            router.push('/mypage');
        } catch (error) { toast.error("오류: " + error.message); } finally { setLoading(false); }
    };

    const HelpTooltip = ({ text }) => (
        <div className="group relative inline-block ml-1.5 align-middle">
            <Info size={13} className="text-slate-300 hover:text-blue-500 cursor-help transition-colors" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-medium leading-relaxed">
                {text}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-800"></div>
            </div>
        </div>
    );

    if (employeeLoading || !isRestored) return <div className="p-10 text-black font-black text-xs h-screen flex flex-col items-center justify-center font-sans animate-pulse font-black uppercase">HANSUNG ERP SYNCING...</div>;

    return (
        <div className="bg-[#f2f4f7] min-h-screen p-4 sm:p-6 flex flex-col items-center font-sans text-black font-black leading-none font-black">
            <div className="w-full max-w-[1100px] mb-4 flex justify-between items-center no-print px-2 font-black">
                {/* 🚀 AUTO SAVED 영역 삭제됨 */}
                <div className="flex items-center gap-2"></div>
                <button onClick={handleSubmit} disabled={loading || isUploading} className="flex items-center gap-2 px-6 py-2 bg-black text-white border border-black hover:bg-slate-800 text-[11px] shadow-lg transition-all active:scale-95 font-black">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : isUploading ? "업로드 중..." : <><CheckCircle size={14} /> 결재 상신하기</>}
                </button>
            </div>

            <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-black">
                <div className="lg:col-span-8 bg-white border border-black p-10 sm:p-14 shadow-sm relative text-black font-black">
                    
                    <div className="flex justify-between items-start mb-10 border-b-4 border-black pb-8 font-black">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black tracking-tighter uppercase font-black">출 장 여 비 정 산 서</h1>
                            <div className="flex flex-col text-[11px] space-y-1 font-black">
                                <span>기안자 : {employee?.full_name} {employee?.position}</span>
                                <span>작성일자 : {new Date().toLocaleDateString('ko-KR')}</span>
                            </div>
                        </div>

                        <div className="flex font-black">
                            <table className="border-collapse border border-black text-[11px] font-black">
                                <tbody>
                                    <tr className="font-black">
                                        <th rowSpan="2" className="w-8 bg-slate-50 border border-black p-2 font-black text-center leading-tight">결<br/>재</th>
                                        <th className="w-16 h-8 bg-slate-50 border border-black p-1 text-center font-black">기안</th>
                                        {approvers.map((app, i) => (
                                            <th key={i} className="w-24 h-8 bg-slate-50 border border-black p-1 text-center font-black font-black">
                                                {allEmployees.find(e => e.id === app.id)?.position || ''}
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
                                            <td key={i} className="border border-black p-1 text-center align-middle font-black">
                                                <div className="text-slate-100 font-black border-2 border-slate-100 border-dashed rounded-full w-14 h-14 flex items-center justify-center mx-auto text-[9px] leading-tight uppercase italic font-black font-black font-black">Sign</div>
                                                <div className="mt-1 font-black text-[10px] font-black">{allEmployees.find(e => e.id === app.id)?.full_name || '미지정'}</div>
                                            </td>
                                        ))}
                                        {approvers.length < 1 && <td className="border border-dashed border-slate-100 font-black"></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-10 font-black">
                        <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                            <tbody>
                                <tr className="border-b border-r border-black divide-x divide-black font-black">
                                    <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase font-black">보존기한 <HelpTooltip text="정산 서류는 통상 5년 보관을 권장합니다." /></th>
                                    <td className="p-3 font-black" colSpan={3}>5년 (고정)</td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black text-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black">출장기간 <HelpTooltip text="실제 이동이 발생한 날짜를 입력하십시오." /></th>
                                    <td className="p-3 font-black" colSpan={3}>
                                        <div className="flex items-center gap-2 font-black">
                                            <input type="date" value={formData.startDate} onChange={(e)=>setFormData({...formData, startDate: e.target.value})} className="border-b border-slate-200 outline-none focus:border-black py-0.5 font-black" />
                                            <span className="text-slate-300 font-black">~</span>
                                            <input type="date" value={formData.endDate} onChange={(e)=>setFormData({...formData, endDate: e.target.value})} className="border-b border-slate-200 outline-none focus:border-black py-0.5 font-black" />
                                        </div>
                                    </td>
                                </tr>
                                <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black">차량번호 <HelpTooltip text="정산 대상 차량의 번호를 정확히 기재하십시오." /></th>
                                    <td className="p-3 font-black"><input type="text" value={formData.carNumber} onChange={(e)=>setFormData({...formData, carNumber: e.target.value})} className="w-full outline-none bg-transparent font-black" placeholder="번호 입력" /></td>
                                    <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black font-black">행선지 <HelpTooltip text="출발지와 최종 도착지를 기재하십시오." /></th>
                                    <td className="p-3 font-black">
                                        <div className="flex items-center gap-2 font-black">
                                            <input type="text" value={formData.startLocation} onChange={(e)=>setFormData({...formData, startLocation: e.target.value})} className="w-1/2 border-b border-slate-200 outline-none focus:border-black font-black" placeholder="출발지" />
                                            <ChevronRight size={12} className="text-slate-300" />
                                            <input type="text" value={formData.endLocation} onChange={(e)=>setFormData({...formData, endLocation: e.target.value})} className="w-1/2 border-b border-slate-200 outline-none focus:border-black font-black" placeholder="도착지" />
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <section className="space-y-4 font-black">
                            <h2 className="text-[10px] uppercase tracking-tighter font-black underline underline-offset-4 decoration-2 font-black">01. 주유비 산출 내역 <HelpTooltip text="유종과 단가, 총 KM를 입력하면 자동으로 산출됩니다. (감가상각비 포함)" /></h2>
                            <div className="grid grid-cols-4 border-t border-l border-black text-center text-[11px] divide-x divide-black border-r border-b font-black font-black">
                                <div className="bg-slate-50 p-2 text-[9px] border-b border-black font-black font-black">유종</div>
                                <div className="bg-slate-50 p-2 text-[9px] border-b border-black font-black font-black font-black">단가</div>
                                <div className="bg-slate-50 p-2 text-[9px] border-b border-black text-blue-600 font-black font-black font-black font-black">거리(KM)</div>
                                <div className="bg-slate-50 p-2 text-[9px] border-b border-black font-black font-black font-black font-black font-black">연비</div>
                                <div className="p-2 border-b border-black font-black font-black"><select value={formData.fuelType} onChange={(e) => handleFuelTypeChange(e.target.value)} className="bg-transparent outline-none font-black text-center font-black font-black font-black"><option>경유</option><option>휘발유</option><option>LPG</option></select></div>
                                <div className="p-2 border-b border-black font-black font-black font-black font-black"><input type="number" value={formData.fuelPrice} onChange={(e)=>setFormData({...formData, fuelPrice: e.target.value})} className="w-full text-center outline-none bg-transparent font-black font-black font-black" /></div>
                                <div className="p-2 border-b border-black font-black font-black font-black font-black font-black"><input type="number" value={formData.distance} onChange={(e)=>setFormData({...formData, distance: e.target.value})} className="w-full text-center outline-none bg-transparent text-blue-600 font-black" /></div>
                                <div className="p-2 border-b border-black font-black font-black font-black font-black font-black font-black font-black">{formData.fuelEfficiency}</div>
                                <div className="col-span-4 p-3 bg-slate-50/20 text-right font-black"><span className="text-[12px] font-black font-black font-black">주유비+감가 소계 : ₩ {fuelAndDepreciation.toLocaleString()}</span></div>
                            </div>
                            
                            <div className="bg-slate-50/50 p-4 border border-dashed border-slate-300 space-y-3 font-black">
                                <p className="text-[10px] flex items-center gap-1.5 text-slate-500 font-black uppercase tracking-tight font-black font-black"><Map size={12}/> 주유 증빙 (네비게이션 거리 캡처 등) <HelpTooltip text="네이버/카카오 지도나 네비게이션의 출발-도착 거리 캡처본을 첨부하십시오." /></p>
                                <FileUploadDnd onUploadComplete={handleMapUpload} onUploadingStateChange={setIsUploading} />
                                <div className="grid grid-cols-2 gap-2 font-black">
                                    {mapAttachments.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white p-2 border border-black/10 rounded font-black font-black font-black">
                                            <span className="truncate text-[9px] font-black">{f.name}</span>
                                            <X size={14} className="cursor-pointer hover:text-red-500 transition-colors font-black" onClick={() => setMapAttachments(prev => prev.filter((_, idx) => idx !== i))} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4 font-black font-black font-black">
                            <div className="flex justify-between items-end mb-2 font-black font-black font-black">
                                <h2 className="text-[10px] uppercase tracking-tighter font-black underline underline-offset-4 decoration-2 font-black">02. 기타 업무 지출 (식대 외) <HelpTooltip text="주차비, 통행료 등 기타 실비 발생 시 입력하십시오." /></h2>
                                <button type="button" onClick={()=>setFormData({...formData, otherExpenses: [...formData.otherExpenses, {item:'', amount:0, receipt:'O'}]})} className="text-[9px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black font-black">+ 추가</button>
                            </div>
                            <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-r border-black divide-x divide-black font-black text-[9px] uppercase"><th className="p-2 text-left font-black">항목</th><th className="p-2 text-right w-32 font-black">금액</th><th className="p-2 w-20 text-center font-black">증빙</th><th className="p-2 w-10 font-black"></th></tr>
                                </thead>
                                <tbody>
                                    {formData.otherExpenses.map((exp, i) => (
                                        <tr key={i} className="border-b border-r border-black divide-x divide-black font-black font-black">
                                            <td className="p-2 font-black"><input type="text" value={exp.item} onChange={(e)=>{const n=[...formData.otherExpenses]; n[i].item=e.target.value; setFormData({...formData, otherExpenses:n})}} className="w-full outline-none bg-transparent font-black" /></td>
                                            <td className="p-2 font-black"><input type="number" value={exp.amount} onChange={(e)=>{const n=[...formData.otherExpenses]; n[i].amount=e.target.value; setFormData({...formData, otherExpenses:n})}} className="w-full text-right outline-none bg-transparent text-blue-600 font-black" /></td>
                                            <td className="p-2 text-center font-black"><select value={exp.receipt} onChange={(e)=>{const n=[...formData.otherExpenses]; n[i].receipt=e.target.value; setFormData({...formData, otherExpenses:n})}} className="bg-transparent outline-none font-black font-black"><option>O</option><option>X</option></select></td>
                                            <td className="p-2 text-center font-black font-black"><Trash2 size={12} className="cursor-pointer text-slate-300 hover:text-red-500 font-black" onClick={()=>{const n=formData.otherExpenses.filter((_,idx)=>idx !== i); setFormData({...formData, otherExpenses:n})}} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="bg-slate-50/50 p-4 border border-dashed border-slate-300 space-y-3 font-black font-black">
                                <p className="text-[10px] flex items-center gap-1.5 text-slate-500 font-black uppercase tracking-tight"><ImageIcon size={12}/> 기타 비용 증빙 첨부 <HelpTooltip text="카드 영수증이나 지출 증빙 서류를 첨부하십시오." /></p>
                                <FileUploadDnd onUploadComplete={handleReceiptUpload} onUploadingStateChange={setIsUploading} />
                                <div className="grid grid-cols-2 gap-2 font-black">
                                    {receiptAttachments.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white p-2 border border-black/10 rounded font-black font-black font-black">
                                            <span className="truncate text-[9px] font-black font-black">{f.name}</span>
                                            <X size={14} className="cursor-pointer hover:text-red-500 transition-colors font-black" onClick={() => setReceiptAttachments(prev => prev.filter((_, idx) => idx !== i))} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="font-black font-black font-black font-black">
                            <h2 className="text-[10px] mb-2 uppercase tracking-tighter font-black underline underline-offset-4 decoration-2 font-black">03. 최종 정산액 및 수령 정보 <HelpTooltip text="정산금을 수령할 본인의 계좌 정보를 입력하십시오." /></h2>
                            <table className="w-full border-collapse border-t border-l border-black text-[11px] font-black font-black font-black">
                                <tbody>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black">
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">은행/예금주</th>
                                        <td className="p-3 font-black"><input type="text" value={formData.bankName} onChange={(e)=>setFormData({...formData, bankName: e.target.value})} className="w-full outline-none bg-transparent font-black font-black" placeholder="예: 국민/홍길동" /></td>
                                        <th className="bg-slate-50 p-3 w-24 text-left border-black font-black uppercase">최종 정산액</th>
                                        <td className="p-3 text-right text-[16px] underline underline-offset-4 decoration-2 font-black font-black">₩ {totalAmount.toLocaleString()}</td>
                                    </tr>
                                    <tr className="border-b border-r border-black divide-x divide-black font-black font-black">
                                        <th className="bg-slate-50 p-3 text-left border-black font-black uppercase font-black">계좌번호</th>
                                        <td className="p-3 font-black" colSpan={3}><input type="text" value={formData.accountNumber} onChange={(e)=>setFormData({...formData, accountNumber: e.target.value})} className="w-full outline-none bg-transparent font-mono font-black" placeholder="계좌번호 입력 ('-' 제외)" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <div className="pt-16 text-center space-y-4 font-black">
                            <p className="text-[14px] font-black underline underline-offset-4 decoration-1 font-mono font-black">{new Date().toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'})}</p>
                            <p className="text-xl font-black uppercase tracking-widest mt-4 font-black">기안자: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>

                <aside className="lg:col-span-4 space-y-4 no-print font-black font-black">
                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-sm font-black text-black">
                        <div className="flex items-center justify-between mb-4 border-b-2 border-black/5 pb-2 font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black font-black font-black font-black"><Users size={14}/> 결재선 지정</h2>
                            <button type="button" onClick={() => { if(approvers.length < 4) setApprovers([...approvers, {id:''}]); else toast.error("최대 4인까지 가능합니다."); }} className="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-all font-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-3 font-black font-black font-black font-black">
                            {approvers.map((app, i) => (
                                <div key={i} className="flex items-center gap-2 font-black">
                                    <span className="text-[10px] text-slate-400 w-4 font-black">{i+1}</span>
                                    <select value={app.id} onChange={(e)=>{const n=[...approvers]; n[i]={id:e.target.value}; setApprovers(n);}} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-black font-black text-black font-black">
                                        <option value="">결재자 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-red-500 font-black font-black" onClick={()=>setApprovers(approvers.filter((_,idx)=>idx!==i))} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm font-black text-black font-black">
                        <div className="flex items-center justify-between mb-4 border-b pb-2 text-blue-600 font-black font-black">
                            <h2 className="text-[11px] uppercase tracking-tighter flex items-center gap-2 font-black text-black font-black font-black font-black font-black"><Users size={14}/> 참조인 지정</h2>
                            <button type="button" onClick={()=>setReferrers([...referrers, {id:''}])} className="text-[10px] border border-blue-600 px-2 py-0.5 hover:bg-blue-600 hover:text-white transition-all font-black font-black font-black font-black">+ 추가</button>
                        </div>
                        <div className="space-y-2 font-black font-black font-black font-black font-black">
                            {referrers.map((ref, i) => (
                                <div key={i} className="flex items-center gap-2 font-black">
                                    <select value={ref.id} onChange={(e)=>{const n=[...referrers]; n[i]={id:e.target.value}; setReferrers(n);}} className="flex-1 p-2 border border-slate-200 rounded text-[11px] outline-none focus:border-blue-600 font-black text-black font-black font-black font-black">
                                        <option value="">참조인 선택</option>
                                        {Object.entries(groupedEmployees).map(([dept, emps]) => (
                                            <optgroup key={dept} label={dept}>
                                                {emps.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <X size={14} className="cursor-pointer text-slate-300 hover:text-black font-black font-black font-black font-black" onClick={()=>setReferrers(referrers.filter((_,idx)=>idx!==i))} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 p-5 rounded-2xl shadow-lg font-black font-black font-black font-black font-black">
                        <h2 className="text-[11px] uppercase mb-3 border-b border-white/10 pb-2 text-white/50 font-black font-black font-black">기안자 의견 가이드</h2>
                        <textarea value={formData.draftComment} onChange={(e)=>setFormData({...formData, draftComment: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[12px] font-black outline-none focus:border-white h-24 text-white font-black font-black font-black font-black font-black" placeholder="특이사항이 있는 경우 입력" />
                    </div>
                </aside>
            </div>
        </div>
    );
}