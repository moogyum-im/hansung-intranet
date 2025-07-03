// src/components/AttendanceWidget.js
"use client";

import { useState, useEffect, useTransition, useContext } from 'react';
import { EmployeeContext } from '@/contexts/EmployeeContext';
import { supabase } from'../../lib/supabase/client';
import { checkInAction, checkOutAction } from '@/actions/attendanceActions';
import StatusChanger from './StatusChanger';

const formatDuration = (seconds) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

export default function AttendanceWidget() {
    // ★★★ 여기가 수정되었습니다! ★★★
    const { currentEmployee } = useContext(EmployeeContext);
    const [todayRecord, setTodayRecord] = useState(null);
    const [workingSeconds, setWorkingSeconds] = useState(0);
    const [isPending, startTransition] = useTransition();
    
    useEffect(() => {
        if (!currentEmployee) return;

        const initAttendance = async () => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { data: record } = await supabase
                .from('attendance_records')
                .select('*')
                .eq('user_id', currentEmployee.id)
                .gte('check_in_time', todayStart.toISOString())
                .order('check_in_time', { ascending: false })
                .limit(1)
                .single();
            setTodayRecord(record);
        };
        initAttendance();
    }, [currentEmployee]);

    useEffect(() => {
        if (todayRecord && !todayRecord.check_out_time) {
            const checkInTime = new Date(todayRecord.check_in_time);
            
            const timer = setInterval(() => {
                const now = new Date();
                const diffSeconds = Math.round((now - checkInTime) / 1000);
                setWorkingSeconds(diffSeconds);
            }, 1000);
            return () => clearInterval(timer);
        } else if (todayRecord?.check_out_time) {
             const checkInTime = new Date(todayRecord.check_in_time);
             const checkOutTime = new Date(todayRecord.check_out_time);
             setWorkingSeconds(Math.round((checkOutTime - checkInTime) / 1000));
        } else {
             setWorkingSeconds(0);
        }
    }, [todayRecord]);
    
    const handleCheckIn = () => {
        startTransition(async () => {
            const result = await checkInAction();
            if (result.error) alert(`출근 처리 실패: ${result.error}`);
            else setTodayRecord(result.data);
        });
    };
    
    const handleCheckOut = () => {
        if (!todayRecord) return;
        startTransition(async () => {
            const result = await checkOutAction(todayRecord.id);
            if (result.error) alert(`퇴근 처리 실패: ${result.error}`);
            else setTodayRecord(result.data);
        });
    };

    if (!currentEmployee) return <div className="p-6 bg-white rounded-2xl shadow-lg border h-[210px] animate-pulse"></div>;

    const hasCheckedIn = Boolean(todayRecord);
    const hasCheckedOut = Boolean(todayRecord?.check_out_time);
    
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80">
            <div className="flex justify-between items-start mb-4">
                <h2 className="font-bold text-lg text-gray-800">나의 근태 현황</h2>
                <StatusChanger />
            </div>
            <div className="text-center bg-gray-50 p-6 rounded-lg">
                <p className="text-sm text-gray-500">총 근무 시간</p>
                <p className="text-4xl font-bold font-mono tracking-tight text-gray-800 my-1">{formatDuration(workingSeconds)}</p>
                <p className="text-xs text-gray-400">
                    {hasCheckedIn ? `${new Date(todayRecord.check_in_time).toLocaleTimeString()} 출근` : '아직 출근하지 않았습니다.'}
                </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                    onClick={handleCheckIn}
                    disabled={isPending || hasCheckedIn}
                    className="w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    출근하기
                </button>
                 <button
                    onClick={handleCheckOut}
                    disabled={isPending || !hasCheckedIn || hasCheckedOut}
                    className="w-full py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    퇴근하기
                </button>
            </div>
        </div>
    );
}