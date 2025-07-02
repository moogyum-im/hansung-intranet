// 파일 경로: src/components/MyAttendanceWidget.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';

// 대시보드 위젯 공통 컴포넌트
const Widget = ({ title, icon, children }) => (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
            <span className="text-green-600">{icon}</span>
            <h3 className="font-bold text-gray-800">{title}</h3>
        </div>
        <div className="flex-1">
            {children}
        </div>
    </div>
);

const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>;


export default function MyAttendanceWidget({ currentUser }) {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTodayAttendance = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    // ★★★ 데이터베이스 함수(RPC)를 호출하는 방식으로 변경 ★★★
    const { data, error } = await supabase
      .rpc('get_today_attendance');

    if (error) {
        console.error("오늘 출근 기록 조회 실패:", error.message);
        setTodayAttendance(null);
    } else {
        // 함수는 배열을 반환하므로, 첫 번째 요소를 사용합니다.
        setTodayAttendance(data[0] || null);
    }
    setLoading(false);
  }, [currentUser?.id, supabase]); 

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);
  
  const handleCheckIn = async () => {
    if (!currentUser?.id) { alert("로그인 정보가 없습니다."); return; }
    const { error } = await supabase
      .from('attendance_records')
      .insert({ user_id: currentUser.id }); // check_in_time은 DB에서 자동으로 now()로 설정됨
    
    if (error) {
        alert('출근 처리 실패: ' + error.message);
    } else {
        fetchTodayAttendance(); // 성공 시 데이터 다시 불러오기
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser?.id || !todayAttendance?.id) { alert("출근 기록이 없습니다."); return; }
    const { error } = await supabase
      .from('attendance_records')
      .update({ check_out_time: new Date().toISOString() })
      .eq('id', todayAttendance.id);

    if (error) {
        alert('퇴근 처리 실패: ' + error.message);
    } else {
        fetchTodayAttendance(); // 성공 시 데이터 다시 불러오기
    }
  };

  const renderContent = () => {
    if (loading) {
        return <p className="text-center text-gray-500 py-8">출퇴근 정보 로딩 중...</p>;
    }
    
    if (todayAttendance?.check_in_time) {
        return (
            <div className="text-center space-y-4">
                <div>
                    <p className="text-sm text-gray-500">출근 시간</p>
                    <p className="text-2xl font-bold">{new Date(todayAttendance.check_in_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {todayAttendance.check_out_time ? (
                    <div>
                        <p className="text-sm text-gray-500">퇴근 시간</p>
                        <p className="text-2xl font-bold text-gray-400">{new Date(todayAttendance.check_out_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                ) : (
                    <button onClick={handleCheckOut} className="w-full py-3 px-4 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">퇴근하기</button>
                )}
            </div>
        );
    } else {
        return (
            <div className="text-center space-y-4">
                <p className="text-gray-500">오늘 출근 기록이 없습니다.</p>
                <button onClick={handleCheckIn} className="w-full py-3 px-4 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors">출근하기</button>
            </div>
        );
    }
  };

  return (
    <Widget title="나의 출퇴근" icon={<ClockIcon />}>
      {renderContent()}
    </Widget>
  );
}