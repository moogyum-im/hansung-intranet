'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import { Loader2, Save, FileEdit } from 'lucide-react';

const formatCurrency = (num) => num ? Number(num).toLocaleString('ko-KR') : '';

// 입력 셀 컴포넌트
const CellInput = React.memo(({ field, value, onUpdate, isTime = false, isHighlight = false }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localVal, setLocalVal] = useState(value);
    
    useEffect(() => { 
        if (!isFocused) setLocalVal(value); 
    }, [value, isFocused]);
    
    const handleBlur = () => { 
        setIsFocused(false); 
        onUpdate(field, localVal); 
    };

    return (
        <input
            type="text"
            value={isFocused ? (localVal == 0 ? '' : localVal) : (isTime ? localVal : (value == 0 ? '' : formatCurrency(value)))}
            onChange={(e) => setLocalVal(isTime ? e.target.value : e.target.value.replace(/[^0-9.-]/g, ''))}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={isTime ? "-" : "0"}
            className={`w-full h-full text-right outline-none font-mono font-black transition-all px-2 py-1
                ${isFocused ? 'bg-yellow-100 ring-2 ring-blue-500 rounded-sm' : 'bg-transparent'} 
                ${isHighlight && !isFocused ? 'text-rose-600' : 'text-slate-900'}
                hover:bg-slate-50 cursor-text`}
        />
    );
});
CellInput.displayName = 'CellInput';

function EditPayrollContent() {
    const searchParams = useSearchParams();
    const empId = searchParams.get('empId');
    const month = searchParams.get('month');

    const [employee, setEmployee] = useState(null);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchRecord = async () => {
            if (!empId || !month) return;
            try {
                const { data: empData } = await supabase.from('profiles').select('*').eq('id', empId).single();
                setEmployee(empData);

                const { data: payData, error: payError } = await supabase.from('payroll_records')
                    .select('*')
                    .eq('employee_id', empId)
                    .eq('payment_month', month)
                    .maybeSingle(); 
                
                if (payError) throw payError;

                // 🚀 DB 스키마에 맞춘 초기값 설정 (driving_subsidy 사용)
                const d = payData || {
                    base_pay: 0, overtime_pay: 0, night_pay: 0, annual_leave_pay: 0, cert_allowance: 0, comm_allowance: 0, field_allowance: 0, meal_allowance_taxable: 0, other_pay_taxable: 0,
                    vehicle_maintenance: 0, driving_subsidy: 0, childcare_allowance: 0, meal_allowance_nontaxable: 0,
                    national_pension: 0, health_insurance: 0, long_term_care: 0, employment_insurance: 0, income_tax: 0, local_tax: 0,
                    health_ins_settlement: 0, ltc_settlement: 0, income_tax_settlement: 0, local_tax_settlement: 0, other_deduction: 0,
                    ordinary_hourly_wage: 0, fixed_overtime_hours: 0, fixed_night_hours: 0, annual_leave_hours: 0
                };
                setFormData(d);
            } catch (e) {
                console.error(e);
                toast.error('데이터 로드 실패');
            } finally {
                setLoading(false);
            }
        };
        fetchRecord();
    }, [empId, month]);

    const handleUpdate = useCallback((field, value) => {
        const num = (value === '' || value === null || value === '-') ? 0 : Number(value);
        
        setFormData(prev => {
            const cur = { ...prev, [field]: num };
            
            // 🚀 지급 합계 (driving_subsidy 반영)
            const payFields = ['base_pay', 'overtime_pay', 'night_pay', 'annual_leave_pay', 'cert_allowance', 'comm_allowance', 'field_allowance', 'meal_allowance_taxable', 'other_pay_taxable', 'vehicle_maintenance', 'driving_subsidy', 'childcare_allowance', 'meal_allowance_nontaxable'];
            const totalPay = payFields.reduce((sum, key) => sum + (Number(cur[key]) || 0), 0);
            
            // 공제 합계
            const dedFields = ['national_pension', 'health_insurance', 'long_term_care', 'employment_insurance', 'income_tax', 'local_tax', 'health_ins_settlement', 'ltc_settlement', 'income_tax_settlement', 'local_tax_settlement', 'other_deduction'];
            const totalDed = dedFields.reduce((sum, key) => sum + (Number(cur[key]) || 0), 0);
            
            return { ...cur, total_payment: totalPay, total_deduction: totalDed, net_pay: totalPay - totalDed };
        });
    }, []);

    const saveRecord = async () => {
        setIsSaving(true);
        try {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));

            // 🚀 DB에 전송할 페이로드 (updated_at 제거, profiles 객체 제거)
            const payload = { ...formData, employee_id: empId, payment_month: month };
            delete payload.profiles; 

            const { error } = await supabase.from('payroll_records').upsert(payload, { onConflict: 'employee_id, payment_month' });
            
            if (error) {
                console.error("DB Error:", error);
                throw error;
            }
            
            toast.success('성공적으로 저장되었습니다.');
            
            setTimeout(() => window.close(), 800);
        } catch (e) {
            console.error(e);
            toast.error(`저장 실패: 시스템 오류가 발생했습니다.`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="fixed inset-0 bg-white flex items-center justify-center z-[9999]"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;
    if (!employee || !formData) return <div className="p-10 text-center font-bold">데이터를 불러올 수 없습니다. 창을 닫고 다시 시도해주세요.</div>;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-100 font-sans text-black antialiased">
            <Toaster position="top-center" />
            
            <div className="p-4 border-b flex justify-between items-center bg-white shrink-0 shadow-sm">
                <div>
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <FileEdit size={16} className="text-blue-600"/> 
                        {employee.full_name} 명세서 작성 모드 <span className="text-slate-400 font-mono ml-1">({month})</span>
                    </h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.close()} className="px-5 py-2 rounded text-sm font-black text-slate-500 hover:bg-slate-200 transition-colors">닫기</button>
                    <button 
                        onClick={saveRecord} 
                        disabled={isSaving}
                        className="bg-blue-600 text-white px-8 py-2 rounded text-sm font-black hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14}/>} 
                        {isSaving ? '저장 처리 중...' : '내역 저장'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-[10mm] bg-white mx-auto shadow-xl w-full max-w-[297mm]">
                <style dangerouslySetInnerHTML={{ __html: `
                    .m-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 11px; }
                    .m-table th, .m-table td { border: 1px solid #000; height: 32px; }
                    .m-table td.input-cell { padding: 0; }
                    .m-bg { background-color: #f2f2f2 !important; font-weight: bold; text-align: center; }
                    .m-title { font-size: 32px; font-weight: 900; letter-spacing: 2rem; text-align: center; margin-bottom: 20px; text-decoration: underline; text-underline-offset: 8px; }
                `}} />

                <h1 className="m-title">급 여 명 세 서</h1>
                <div className="mb-2 font-bold text-xs italic flex justify-between">
                    <span>㈜한성종합조경</span>
                    <span className="text-blue-600 animate-pulse">※ 셀을 클릭하여 입력하세요.</span>
                </div>

                <table className="m-table mb-4 text-center font-bold">
                    <tbody>
                        <tr><td className="m-bg w-[12%]">기 준 월</td><td className="w-[21%]">{month.replace('-', '년 ')}월</td><td className="m-bg w-[12%]">지 급 일</td><td colSpan="3" className="text-left px-4 font-mono">{month}-25</td></tr>
                        <tr><td className="m-bg">성 명</td><td>{employee.full_name}</td><td className="m-bg">부 서</td><td>{employee.department}</td><td className="m-bg w-[12%]">직 급</td><td>{employee.position}</td></tr>
                        <tr><td className="m-bg">생년월일</td><td className="font-mono">{employee.birth_date || '-'}</td><td className="m-bg">확인일시</td><td colSpan="3" className="text-left px-4 text-slate-400 font-normal text-[10px]">- (발송 전)</td></tr>
                    </tbody>
                </table>

                <table className="m-table mb-4">
                    <thead>
                        <tr className="m-bg text-xs"><th colSpan="3">지 급 내 역</th><th colSpan="2" className="border-l-2 border-black">공 제 내 역</th></tr>
                        <tr className="m-bg text-[10px]"><th className="w-12">분류</th><th className="text-left px-4">항목</th><th className="w-40 text-right px-4">금액</th><th className="text-left px-4 border-l-2 border-black">항목</th><th className="w-40 text-right px-4">금액</th></tr>
                    </thead>
                    <tbody className="font-bold">
                        <tr>
                            <td rowSpan="9" className="m-bg text-[10px]">과세</td>
                            <td className="text-left px-4">1. 기 본 급</td><td className="input-cell"><CellInput field="base_pay" value={formData.base_pay} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">국 민 연 금</td><td className="input-cell bg-slate-50/50"><CellInput field="national_pension" value={formData.national_pension} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">2. 시 간 외 수 당</td><td className="input-cell"><CellInput field="overtime_pay" value={formData.overtime_pay} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">건 강 보 험</td><td className="input-cell bg-slate-50/50"><CellInput field="health_insurance" value={formData.health_insurance} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">3. 야 간 수 당</td><td className="input-cell"><CellInput field="night_pay" value={formData.night_pay} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">장 기 요 양</td><td className="input-cell bg-slate-50/50"><CellInput field="long_term_care" value={formData.long_term_care} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">4. 연 차 수 당</td><td className="input-cell"><CellInput field="annual_leave_pay" value={formData.annual_leave_pay} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">고 용 보 험</td><td className="input-cell bg-slate-50/50"><CellInput field="employment_insurance" value={formData.employment_insurance} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">5. 자 격 수 당</td><td className="input-cell"><CellInput field="cert_allowance" value={formData.cert_allowance} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">소 득 세</td><td className="input-cell bg-slate-50/50"><CellInput field="income_tax" value={formData.income_tax} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">6. 통 신 수 당</td><td className="input-cell"><CellInput field="comm_allowance" value={formData.comm_allowance} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">지 방 소 득 세</td><td className="input-cell bg-slate-50/50"><CellInput field="local_tax" value={formData.local_tax} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">7. 현 장 수 당</td><td className="input-cell"><CellInput field="field_allowance" value={formData.field_allowance} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">건 보 정 산</td><td className="input-cell bg-slate-50/50"><CellInput field="health_ins_settlement" value={formData.health_ins_settlement} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">8. 식 대 (과세)</td><td className="input-cell"><CellInput field="meal_allowance_taxable" value={formData.meal_allowance_taxable} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">요 양 정 산</td><td className="input-cell bg-slate-50/50"><CellInput field="ltc_settlement" value={formData.ltc_settlement} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">9. 기 타 (과세)</td><td className="input-cell"><CellInput field="other_pay_taxable" value={formData.other_pay_taxable} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">소득세 정산</td><td className="input-cell bg-slate-50/50"><CellInput field="income_tax_settlement" value={formData.income_tax_settlement} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        
                        <tr>
                            <td rowSpan="4" className="m-bg text-[10px]">비과세</td>
                            <td className="text-left px-4">차 량 유 지 비</td><td className="input-cell"><CellInput field="vehicle_maintenance" value={formData.vehicle_maintenance} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">지방세 정산</td><td className="input-cell bg-slate-50/50"><CellInput field="local_tax_settlement" value={formData.local_tax_settlement} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">자 가 운 전 보 조 금</td><td className="input-cell"><CellInput field="driving_subsidy" value={formData.driving_subsidy} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50">기 타 공 제</td><td className="input-cell bg-slate-50/50"><CellInput field="other_deduction" value={formData.other_deduction} onUpdate={handleUpdate} isHighlight={true} /></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">육 아 수 당</td><td className="input-cell"><CellInput field="childcare_allowance" value={formData.childcare_allowance} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50"></td><td className="bg-slate-50/50"></td>
                        </tr>
                        <tr>
                            <td className="text-left px-4">식 대 (비과세)</td><td className="input-cell"><CellInput field="meal_allowance_nontaxable" value={formData.meal_allowance_nontaxable} onUpdate={handleUpdate} /></td>
                            <td className="text-left px-4 border-l-2 border-black bg-slate-50/50"></td><td className="bg-slate-50/50"></td>
                        </tr>
                    </tbody>
                    <tfoot className="m-bg text-sm font-black">
                        <tr>
                            <td colSpan="2">지급 합계</td><td className="text-right px-4 font-mono">{formatCurrency(formData.total_payment)}</td>
                            <td className="border-l-2 border-black">공제 합계</td><td className="text-right px-4 font-mono text-rose-600">{formatCurrency(formData.total_deduction)}</td>
                        </tr>
                    </tfoot>
                </table>

                <table className="m-table">
                    <tbody>
                        <tr className="font-black">
                            <td className="m-bg w-[25%] text-base h-16">차 인 지 급 액</td>
                            <td colSpan="3" className="text-right px-10 text-3xl font-mono bg-white text-blue-700">
                                {formatCurrency(formData.net_pay)} <span className="text-base text-black font-sans">원</span>
                            </td>
                        </tr>
                        <tr className="m-bg text-[11px] text-center">
                            <td className="w-[25%]">고정시간외근로시간(1주)</td>
                            <td className="w-[25%]">고정야간근로시간(1주)</td>
                            <td className="w-[25%]">연차휴가시간(1개월)</td>
                            <td className="w-[25%]">통 상 시 급</td>
                        </tr>
                        <tr>
                            <td className="input-cell"><CellInput field="fixed_overtime_hours" value={formData.fixed_overtime_hours} onUpdate={handleUpdate} isTime={true} /></td>
                            <td className="input-cell"><CellInput field="fixed_night_hours" value={formData.fixed_night_hours} onUpdate={handleUpdate} isTime={true} /></td>
                            <td className="input-cell"><CellInput field="annual_leave_hours" value={formData.annual_leave_hours} onUpdate={handleUpdate} isTime={true} /></td>
                            <td className="input-cell"><CellInput field="ordinary_hourly_wage" value={formData.ordinary_hourly_wage} onUpdate={handleUpdate} /></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function EditPayrollPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-600" /></div>}>
            <EditPayrollContent />
        </Suspense>
    );
}