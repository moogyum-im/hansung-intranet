'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { Loader2, X } from 'lucide-react';

const formatCurrency = (num) => (num === 0 || !num) ? '-' : Number(num).toLocaleString('ko-KR');

export default function PayrollDetailPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAndTrack = async () => {
            if (!id) return;
            const { data: record } = await supabase.from('payroll_records').select('*, profiles(*)').eq('id', id).single();
            if (record) {
                setData(record);
                if (!record.viewed_at) {
                    const now = new Date().toISOString();
                    await supabase.from('payroll_records').update({ viewed_at: now }).eq('id', id);
                    setData(prev => ({ ...prev, viewed_at: now }));
                }
            }
            setLoading(false);
        };
        fetchAndTrack();
    }, [id]);

    if (loading) return <div className="fixed inset-0 bg-white flex items-center justify-center z-[9999]"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;
    if (!data) return <div className="fixed inset-0 bg-white p-20 text-center font-bold z-[9999]">데이터를 불러올 수 없습니다.</div>;

    const emp = data.profiles;

    return (
        <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto font-sans text-black antialiased">
            {/* 툴바 */}
            <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-slate-50 border-b no-print shadow-sm">
                <button onClick={() => window.close()} className="flex items-center gap-2 font-black text-slate-500 hover:text-black"><X size={20}/> 창 닫기</button>
                <button onClick={() => window.print()} className="bg-black text-white px-10 py-2.5 font-black text-sm hover:scale-105 transition-all shadow-lg">명세서 출력 / PDF 저장</button>
            </div>

            <div className="max-w-[297mm] mx-auto p-[10mm] print:p-0 bg-white">
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        @page { size: A4 landscape; margin: 10mm; }
                        body { background: white !important; }
                        .no-print { display: none !important; }
                    }
                    /* 모든 표의 높이와 패딩을 완벽히 통일 (높이 32px 강제) */
                    .h-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 11px; }
                    .h-table th, .h-table td { border: 1px solid #000; padding: 6px 12px; height: 32px; }
                    .h-bg { background-color: #f2f2f2 !important; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; }
                    .h-title { font-size: 32px; font-weight: 900; letter-spacing: 2rem; text-align: center; margin-bottom: 20px; text-decoration: underline; text-underline-offset: 8px; }
                `}} />

                <h1 className="h-title">급 여 명 세 서</h1>
                <div className="mb-2 font-bold text-xs italic">㈜한성종합조경</div>

                {/* 인적사항 */}
                <table className="h-table mb-4 text-center font-bold">
                    <tbody>
                        <tr>
                            <td className="h-bg w-[12%]">기 준 월</td><td className="w-[21%]">{data.payment_month.replace('-', '년 ')}월</td>
                            <td className="h-bg w-[12%]">지 급 일</td><td colSpan="3" className="text-left font-mono">{data.payment_month}-25</td>
                        </tr>
                        <tr>
                            <td className="h-bg">성 명</td><td>{emp.full_name}</td>
                            <td className="h-bg">부 서</td><td>{emp.department}</td>
                            <td className="h-bg w-[12%]">직 급</td><td>{emp.position}</td>
                        </tr>
                        <tr>
                            <td className="h-bg">생년월일</td><td className="font-mono">{emp.birth_date || '-'}</td>
                            <td className="h-bg">확인일시</td><td colSpan="3" className="text-left font-mono text-[10px] text-blue-600 italic font-black">{data.viewed_at ? new Date(data.viewed_at).toLocaleString('ko-KR') : '-'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* 내역 테이블 */}
                <table className="h-table mb-4">
                    <thead>
                        <tr className="h-bg text-xs"><th colSpan="3">지 급 내 역</th><th colSpan="2" className="border-l-2 border-black">공 제 내 역</th></tr>
                        <tr className="h-bg text-[10px]">
                            <th className="w-12">분류</th><th className="text-left">항목</th><th className="w-40 text-right">금액</th>
                            <th className="text-left border-l-2 border-black">항목</th><th className="w-40 text-right">금액</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold">
                        {/* 과세 항목 */}
                        <tr><td rowSpan="9" className="h-bg text-[10px]">과세</td><td className="text-left">1. 기 본 급</td><td className="text-right font-mono">{formatCurrency(data.base_pay)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">국 민 연 금</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.national_pension)}</td></tr>
                        <tr><td className="text-left">2. 시 간 외 수 당</td><td className="text-right font-mono">{formatCurrency(data.overtime_pay)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">건 강 보 험</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.health_insurance)}</td></tr>
                        <tr><td className="text-left">3. 야 간 수 당</td><td className="text-right font-mono">{formatCurrency(data.night_pay)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">장 기 요 양</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.long_term_care)}</td></tr>
                        <tr><td className="text-left">4. 연 차 수 당</td><td className="text-right font-mono">{formatCurrency(data.annual_leave_pay)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">고 용 보 험</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.employment_insurance)}</td></tr>
                        <tr><td className="text-left">5. 자 격 수 당</td><td className="text-right font-mono">{formatCurrency(data.cert_allowance)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">소 득 세</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.income_tax)}</td></tr>
                        <tr><td className="text-left">6. 통 신 수 당</td><td className="text-right font-mono">{formatCurrency(data.comm_allowance)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">지 방 소 득 세</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.local_tax)}</td></tr>
                        <tr><td className="text-left">7. 현 장 수 당</td><td className="text-right font-mono">{formatCurrency(data.field_allowance)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">건 보 정 산</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.health_ins_settlement)}</td></tr>
                        <tr><td className="text-left">8. 식 대 (과세)</td><td className="text-right font-mono">{formatCurrency(data.meal_allowance_taxable)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">요 양 정 산</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.ltc_settlement)}</td></tr>
                        <tr><td className="text-left">9. 기 타 (과세)</td><td className="text-right font-mono">{formatCurrency(data.other_pay_taxable)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">소득세 정산</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.income_tax_settlement)}</td></tr>
                        
                        {/* 비과세 항목 */}
                        <tr><td rowSpan="4" className="h-bg text-[10px]">비과세</td><td className="text-left">차 량 유 지 비</td><td className="text-right font-mono">{formatCurrency(data.vehicle_maintenance)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">지방세 정산</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.local_tax_settlement)}</td></tr>
                        <tr><td className="text-left">자 가 운 전 보 조 금</td><td className="text-right font-mono">{formatCurrency(data.self_drive_allowance)}</td><td className="text-left border-l-2 border-black bg-slate-50/50">기 타 공 제</td><td className="text-right font-mono text-rose-600 bg-slate-50/50">{formatCurrency(data.other_deduction)}</td></tr>
                        <tr><td className="text-left">육 아 수 당</td><td className="text-right font-mono">{formatCurrency(data.childcare_allowance)}</td><td className="text-left border-l-2 border-black bg-slate-50/50"></td><td className="bg-slate-50/50"></td></tr>
                        <tr><td className="text-left">식 대 (비과세)</td><td className="text-right font-mono">{formatCurrency(data.meal_allowance_nontaxable)}</td><td className="text-left border-l-2 border-black bg-slate-50/50"></td><td className="bg-slate-50/50"></td></tr>
                    </tbody>
                    <tr className="h-bg font-black text-sm">
                        <td colSpan="2">지급 합계</td><td className="text-right font-mono">{formatCurrency(data.total_payment)}</td>
                        <td className="border-l-2 border-black">공제 합계</td><td className="text-right font-mono text-rose-600">{formatCurrency(data.total_deduction)}</td>
                    </tr>
                </table>

                {/* 차인지급액 및 근로시간/통상시급 정보 통합 테이블 */}
                <table className="h-table mb-4">
                    <tbody>
                        <tr className="font-black">
                            <td className="h-bg w-[25%] text-base">차 인 지 급 액</td>
                            <td colSpan="3" className="text-right px-10 text-2xl font-mono bg-white">
                                {formatCurrency(data.net_pay)} <span className="text-base font-sans">원</span>
                            </td>
                        </tr>
                        <tr className="h-bg text-[11px] text-center">
                            <td className="w-[25%]">고정시간외근로시간(1주)</td>
                            <td className="w-[25%]">고정야간근로시간(1주)</td>
                            <td className="w-[25%]">연차휴가시간(1개월)</td>
                            <td className="w-[25%]">통 상 시 급</td>
                        </tr>
                        <tr className="text-center font-mono font-bold text-sm">
                            <td>{data.fixed_overtime_hours || '-'}</td>
                            <td>{data.fixed_night_hours || '-'}</td>
                            <td>{data.annual_leave_hours || '-'}</td>
                            <td>{formatCurrency(data.ordinary_hourly_wage)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* 계산방법 안내 테이블 */}
                <div className="border border-black font-bold mb-4">
                    <div className="p-2 border-b border-black text-[10px]">
                        <p className="mb-1">* 시간외근로란?</p>
                        <p className="pl-4 text-slate-700">연장근로(1일 8시간 또는 1주 40시간을 초과하는 근로시간) 및 휴일근로(주휴일 또는 공휴일 근로시간)를 통칭</p>
                    </div>
                    <table className="h-table" style={{ border: 'none' }}>
                        <thead className="h-bg">
                            <tr>
                                <th colSpan="2" className="w-[15%] border-t-0 border-l-0 text-center text-[11px]">구 분</th>
                                <th className="border-t-0 border-r-0 text-center text-[11px]">계 산 방 법</th>
                            </tr>
                        </thead>
                        <tbody className="text-[10px]">
                            <tr>
                                <td className="border-l-0 w-[5%] text-center">②</td>
                                <td className="w-[10%] text-center">시간외수당</td>
                                <td className="border-r-0 text-left px-8">고정시간외근로시간수 * 365일/12개월/7일 * 통상시급 * 1.5</td>
                            </tr>
                            <tr>
                                <td className="border-l-0 text-center">③</td>
                                <td className="text-center">야간수당</td>
                                <td className="border-r-0 text-left px-8">고정야간근로시간수 * 365일/12개월/7일 * 통상시급 * 0.5</td>
                            </tr>
                            <tr>
                                <td className="border-l-0 text-center">④</td>
                                <td className="text-center">연차수당</td>
                                <td className="border-r-0 text-left px-8">연차휴가시간수(1년간 발생일수 15일분을 1개월 기준으로 환산) * 통상시급</td>
                            </tr>
                            <tr>
                                <td colSpan="3" className="border-b-0 border-l-0 border-r-0 text-center py-2 text-[10px] font-black italic">
                                    * 구체적인 포괄임금 내역에 대해서는 근로계약서상 산정방식을 참고하여 주시기 바랍니다.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}