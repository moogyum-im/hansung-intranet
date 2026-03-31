'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Loader2, X, Info, CalendarDays } from 'lucide-react';

const formatFullDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
};

function LeaveDetailsContent() {
    const searchParams = useSearchParams();
    const empId = searchParams.get('empId');

    const [employee, setEmployee] = useState(null);
    const [leaveRecords, setLeaveRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!empId) return;
            try {
                // 1. 직원 정보 조회
                const { data: empData } = await supabase
                    .from('profiles')
                    .select('id, full_name, department, position')
                    .eq('id', empId)
                    .single();
                
                if (empData) setEmployee(empData);

                // 2. 승인된 휴가 내역 조회
                const { data: leaveData } = await supabase
                    .from('approval_documents')
                    .select('content')
                    .eq('requester_id', empId)
                    .in('status', ['승인', '완료'])
                    .eq('document_type', 'leave_request');

                if (leaveData) {
                    const leaves = [];
                    leaveData.forEach(doc => {
                        try {
                            const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
                            if (content.startDate && content.leaveType) {
                                leaves.push({
                                    start: content.startDate,
                                    end: content.endDate || content.startDate,
                                    type: content.leaveType,
                                    reason: content.reason || '사유 미기재',
                                    days: content.requestedDays || (content.leaveType.includes('반차') ? 0.5 : null)
                                });
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    });
                    
                    leaves.sort((a, b) => new Date(b.start) - new Date(a.start));
                    setLeaveRecords(leaves);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [empId]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
    if (!employee) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">직원 정보를 찾을 수 없습니다.</div>;

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans antialiased">
            {/* 팝업 헤더 */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 text-blue-900 pointer-events-none"><CalendarDays size={120} /></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                        {employee.full_name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{employee.full_name} {employee.position}</h2>
                        <span className="text-xs font-bold text-slate-500">{employee.department} | 승인된 휴가 상세 내역</span>
                    </div>
                </div>
                <button onClick={() => window.close()} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors relative z-10">
                    <X size={24} />
                </button>
            </div>
            
            {/* 팝업 본문 (휴가 리스트) */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                {leaveRecords.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-2">
                            <Info size={32} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-black text-slate-500">조회된 휴가 기록이 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {leaveRecords.map((leave, idx) => {
                            const isHalf = leave.type.includes('반차');
                            const dateDisplay = leave.start === leave.end 
                                ? formatFullDate(leave.start) 
                                : `${formatFullDate(leave.start)} ~ ${formatFullDate(leave.end)}`;

                            return (
                                <div key={idx} className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-300 hover:shadow-md transition-all">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2.5">
                                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${isHalf ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                {leave.type}
                                            </span>
                                            <span className="text-[15px] font-black text-slate-800">{dateDisplay}</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 mt-1 pl-1 border-l-2 border-slate-200">
                                            사유: <span className="text-slate-600">{leave.reason}</span>
                                        </p>
                                    </div>
                                    {leave.days && (
                                        <div className="shrink-0 text-right sm:text-left">
                                            <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                                                차감 <span className="text-rose-500">{leave.days}</span> 일
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LeaveDetailsPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}>
            <LeaveDetailsContent />
        </Suspense>
    );
}