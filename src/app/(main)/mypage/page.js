'use client';

import React, { useState, useEffect } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import MyAttendanceWidget from '@/components/MyAttendanceWidget';
import LeaveCalendar from './LeaveCalendar.jsx';
import ClientSideOnlyWrapper from '@/components/ClientSideOnlyWrapper';
import { toast, Toaster } from 'react-hot-toast';
import { Calendar, Clock, ShieldCheck, Coffee, Lock, Receipt, Loader2, FileText, UserCircle } from 'lucide-react';

const getGreeting = () => `오늘도 활기찬 하루 보내세요.`;

export default function MyPage() {
    const { employee, loading: employeeLoading } = useEmployee();

    const [leaveData, setLeaveData] = useState({ total: 0, used: 0, remaining: 0 });
    const [payRecords, setPayRecords] = useState([]);

    useEffect(() => {
        const fetchLatestData = async () => {
            if (!employee?.id) return;
            try {
                // 연차 데이터 로드
                const { data: profile } = await supabase.from('profiles').select('total_leave_days, used_leave_days').eq('id', employee.id).single();
                if (profile) {
                    const total = Number(profile.total_leave_days || 0);
                    const used = Number(profile.used_leave_days || 0);
                    setLeaveData({ total, used, remaining: total - used });
                }
                
                // 급여 명세서 전체 내역 로드
                const { data: pRecords } = await supabase
                    .from('payroll_records')
                    .select('id, payment_month, viewed_at')
                    .eq('employee_id', employee.id)
                    .eq('is_published', true)
                    .order('payment_month', { ascending: false });
                    
                if (pRecords && pRecords.length > 0) {
                    setPayRecords(pRecords);
                }
            } catch (error) { console.error(error); }
        };
        fetchLatestData();
    }, [employee?.id]);

    const openPayrollViewer = (recordId, month) => {
        if (!recordId) return toast.error("내역을 불러올 수 없습니다.");
        const width = 1100;
        const height = 850;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        window.open(`/admin-portal/payroll/${recordId}`, `Payroll_${month}`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
        setPayRecords(prev => prev.map(p => p.id === recordId ? { ...p, viewed_at: new Date().toISOString() } : p));
    };

    const handleOpenSecurity = () => {
        const width = 500;
        const height = 650;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        window.open(`/mypage/security`, `SecurityPopup`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    };

    if (employeeLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600"/></div>;

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-12 font-sans antialiased overflow-y-auto custom-scrollbar">
            <Toaster position="top-right" />
            
            {/* 🚀 콤팩트한 화이트/그레이톤 헤더 */}
            <header className="bg-white border-b border-slate-200 px-6 sm:px-12 py-8 shrink-0">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 text-slate-500 shadow-sm">
                            <UserCircle size={36} strokeWidth={1.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-[11px] uppercase tracking-wider mb-1">
                                Personal Workspace
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                {employee?.full_name} <span className="text-lg text-slate-500">{employee?.position}</span>
                            </h1>
                            <p className="text-slate-500 font-bold text-sm mt-1">{employee?.department} | {getGreeting()}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleOpenSecurity} 
                            className="bg-white px-5 py-3 rounded-xl text-slate-700 font-black text-xs flex items-center gap-2 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
                        >
                            <Lock size={14} className="text-slate-400"/> 계정 및 보안 설정
                        </button>
                    </div>
                </div>
            </header>

            {/* 🚀 메인 콘텐츠 영역 (여백 및 위젯 디자인 다듬기) */}
            <main className="max-w-7xl mx-auto px-6 sm:px-12 mt-8 space-y-6">
                
                {/* 상단 3구역 위젯 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* 근태 관리 위젯 */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[380px] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xs font-black text-slate-700 flex items-center gap-2">
                                <Clock size={16} className="text-blue-600" /> 실시간 근태 관리
                            </h3>
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        </div>
                        <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
                            <MyAttendanceWidget currentUser={employee} />
                        </div>
                    </div>

                    {/* 연차 요약 위젯 */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[380px] justify-between">
                        <h3 className="text-xs font-black text-slate-700 flex items-center gap-2 mb-4">
                            <Coffee size={16} className="text-amber-500" /> 나의 연차 현황
                        </h3>
                        <div className="flex-1 flex flex-col justify-center items-center py-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                            <p className="text-xs font-bold text-slate-400 mb-2">사용 가능한 잔여 연차</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-7xl font-black text-slate-900 tracking-tighter">{leaveData.remaining.toFixed(1)}</span>
                                <span className="text-lg font-black text-slate-400 tracking-tighter">일</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 mb-1">총 부여 연차</p>
                                <p className="text-lg font-black text-slate-700">{leaveData.total}일</p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 mb-1">사용 완료 연차</p>
                                <p className="text-lg font-black text-blue-600">{leaveData.used}일</p>
                            </div>
                        </div>
                    </div>

                    {/* 개인/부서 캘린더 위젯 */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[380px] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-black text-slate-700 flex items-center gap-2">
                                <Calendar size={16} className="text-emerald-500" /> 나의 휴가 일정
                            </h3>
                        </div>
                        <div className="flex-1 overflow-hidden p-2">
                            <ClientSideOnlyWrapper>
                                {/* 캘린더 컴포넌트가 영역에 맞게 꽉 차도록 비율 조정 */}
                                <div className="h-full w-full flex items-center justify-center">
                                    <div className="scale-[0.85] origin-top w-full h-full">
                                        <LeaveCalendar currentUser={employee} />
                                    </div>
                                </div>
                            </ClientSideOnlyWrapper>
                        </div>
                    </div>
                </div>

                {/* 하단 급여 명세서 테이블 영역 */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Receipt size={18} className="text-slate-600" /> 나의 급여 명세서 내역
                        </h3>
                    </div>
                    
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                                    <th className="py-4 px-6 w-32">지급 귀속월</th>
                                    <th className="py-4 px-6 text-left">문서명</th>
                                    <th className="py-4 px-6 w-32">열람 상태</th>
                                    <th className="py-4 px-6 w-40 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {payRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-4 px-6 font-bold text-slate-600 text-sm text-center font-mono">
                                            {record.payment_month.replace('-', '. ')}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                                <FileText size={16} className="text-slate-400 group-hover:text-blue-500" />
                                                {record.payment_month.split('-')[1]}월분 정기 급여 명세서
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {record.viewed_at ? (
                                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black border border-slate-200 inline-block">
                                                    열람 완료
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black border border-rose-100 animate-pulse inline-block">
                                                    새 명세서
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => openPayrollViewer(record.id, record.payment_month)}
                                                className="whitespace-nowrap bg-white text-slate-700 px-4 py-2 rounded-xl text-xs font-black border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-1.5 ml-auto active:scale-95"
                                            >
                                                <Receipt size={14} className="text-slate-400"/> 명세서 확인
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {payRecords.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="py-16 text-center text-sm font-bold text-slate-400">
                                            <ShieldCheck size={32} className="mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
                                            수신된 급여 명세서가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}