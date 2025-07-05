// 파일 경로: src/components/MyAttendanceWidget.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';

const STATUS_STYLES = {
  '업무 중': { icon: '💼', color: 'bg-green-100 text-green-800' },
  '회의 중': { icon: '💬', color: 'bg-blue-100 text-blue-800' },
  '외근 중': { icon: '🚗', color: 'bg-yellow-100 text-yellow-800' },
  '휴가': { icon: '🌴', color: 'bg-purple-100 text-purple-800' },
  '식사 중': { icon: '🍽️', color: 'bg-orange-100 text-orange-800' },
  '오프라인': { icon: '⚫', color: 'bg-gray-200 text-gray-700' },
};

const formatDuration = (milliseconds) => {
    if (milliseconds < 0) return "00:00:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function MyAttendanceWidget({ currentUser }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const { employee, updateEmployeeStatus, loading: employeeLoading } = useEmployee();
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const fetchTodayAttendance = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', currentUser.id)
      .gte('check_in_time', todayStart.toISOString())
      .lte('check_in_time', todayEnd.toISOString())
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
        console.error("출퇴근 기록 조회 실패:", error);
    }
    
    setTodayRecord(data);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  useEffect(() => {
    let timer;
    if (todayRecord && !todayRecord.check_out_time) {
      const checkInTime = new Date(todayRecord.check_in_time).getTime();
      const updateElapsedTime = () => {
        setElapsedTime(Date.now() - checkInTime);
      };
      updateElapsedTime();
      timer = setInterval(updateElapsedTime, 1000);
    } else if (todayRecord && todayRecord.check_out_time) {
      const checkInTime = new Date(todayRecord.check_in_time).getTime();
      const checkOutTime = new Date(todayRecord.check_out_time).getTime();
      setElapsedTime(checkOutTime - checkInTime);
    } else {
        setElapsedTime(0);
    }
    return () => clearInterval(timer);
  }, [todayRecord]);
  
  const handleStatusChange = async (newStatus) => {
    if (!currentUser?.id || !updateEmployeeStatus) return;
    setIsStatusDropdownOpen(false);
    await updateEmployeeStatus(currentUser.id, newStatus);
    toast.success(`상태가 '${newStatus}'(으)로 변경되었습니다.`);
  };

  const handleAttendance = async () => {
    if (loading || employeeLoading) return;

    const isCheckedIn = todayRecord && !todayRecord.check_out_time;

    if (isCheckedIn) { // 퇴근 처리
      const { data: updatedRecord, error } = await supabase
        .from('attendance_records')
        .update({ check_out_time: new Date() }) // .toISOString() 제거
        .eq('id', todayRecord.id)
        .select()
        .single();
      if (error) {
        toast.error('퇴근 처리 실패: ' + error.message);
      } else {
        toast.success('퇴근 처리되었습니다.');
        setTodayRecord(updatedRecord);
        await handleStatusChange('오프라인');
      }
    } else { // 출근 처리
      const { data: newRecord, error } = await supabase
        .from('attendance_records')
        .insert({ user_id: currentUser.id, check_in_time: new Date() }) // .toISOString() 제거
        .select()
        .single();
      if (error) {
        toast.error('출근 처리 실패: ' + error.message);
      } else {
        toast.success('출근 처리되었습니다.');
        setTodayRecord(newRecord);
        await handleStatusChange('업무 중');
      }
    }
  };
  
  const currentStatus = employee?.status || '오프라인';
  const statusStyle = STATUS_STYLES[currentStatus] || STATUS_STYLES['오프라인'];
  const isCheckedIn = todayRecord && !todayRecord.check_out_time;

  return (
    <div className="bg-white p-5 rounded-xl border shadow-sm w-full h-full flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">나의 현황</h2>
        <div className="relative">
          <button onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)} className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg border hover:bg-gray-200 transition-colors">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${statusStyle.color}`}>{statusStyle.icon}</span>
              <span className="font-semibold text-gray-800">{currentStatus}</span>
            </div>
            <span className="text-gray-500">▼</span>
          </button>
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20" onMouseLeave={() => setIsStatusDropdownOpen(false)}>
              {Object.entries(STATUS_STYLES).map(([status, style]) => (
                <button key={status} onClick={() => handleStatusChange(status)} className="w-full flex items-center gap-3 p-3 text-left text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${style.color}`}>{style.icon}</span>
                  <span>{status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="my-4 text-center">
        <p className="text-sm text-gray-500">오늘의 근무 시간</p>
        <p className="text-3xl font-bold font-mono text-gray-800 mt-1">
          {formatDuration(elapsedTime)}
        </p>
      </div>

      <div className="pt-4 border-t">
        {loading ? <div className="text-center text-sm text-gray-500 mb-4 h-9">기록 조회중...</div> : todayRecord ? (
          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <div>
              <p className="text-xs text-gray-500">출근 시간</p>
              <p className="font-semibold text-gray-700 mt-1">{new Date(todayRecord.check_in_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">퇴근 시간</p>
              <p className="font-semibold text-gray-700 mt-1">{todayRecord.check_out_time ? new Date(todayRecord.check_out_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500 mb-4 h-9 flex items-center justify-center">오늘 출근 기록이 없습니다.</p>
        )}
        <button
          onClick={handleAttendance}
          disabled={loading || employeeLoading || (isCheckedIn && !todayRecord.check_out_time && elapsedTime < 1000)}
          className={`w-full font-bold text-white py-2.5 rounded-lg transition-colors disabled:opacity-50
            ${isCheckedIn ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {isCheckedIn ? '퇴근하기' : '출근하기'}
        </button>
      </div>
    </div>
  );
}