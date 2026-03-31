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
    if (milliseconds < 0 || isNaN(milliseconds)) return "00:00:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// 🚀 GPS 위경도 추출 및 카카오 API를 통한 '동' 단위 주소 변환
const getLocationDong = async () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve('위치 정보 미지원');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const KAKAO_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
                    if (!KAKAO_API_KEY) {
                        console.warn("카카오 API 키가 설정되지 않았습니다.");
                        resolve('위치 파악됨(API 키 필요)');
                        return;
                    }

                    const res = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${longitude}&y=${latitude}`, {
                        headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` }
                    });
                    
                    const data = await res.json();
                    if (data.documents && data.documents.length > 0) {
                        // 법정동 또는 행정동 이름 (예: 역삼동)
                        resolve(data.documents[0].region_3depth_name || '동 단위 파악 불가');
                    } else {
                        resolve('위치 파악 불가');
                    }
                } catch (e) {
                    console.error("역지오코딩 실패:", e);
                    resolve('위치 오류');
                }
            },
            (error) => {
                console.error("GPS 권한 거부 또는 오류:", error);
                resolve('위치 권한 거부됨');
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
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
    if (todayRecord) {
        const checkInMs = new Date(todayRecord.check_in_time).getTime();
        if (!todayRecord.check_out_time) {
            const updateElapsedTime = () => {
                setElapsedTime(Date.now() - checkInMs);
            };
            updateElapsedTime();
            timer = setInterval(updateElapsedTime, 1000);
        } else {
            const checkOutMs = new Date(todayRecord.check_out_time).getTime();
            setElapsedTime(checkOutMs - checkInMs);
        }
    } else {
        setElapsedTime(0);
    }
    return () => clearInterval(timer);
  }, [todayRecord]);
  
  const handleStatusChange = async (newStatus) => {
    if (!currentUser?.id || !updateEmployeeStatus) return;
    setIsStatusDropdownOpen(false);
    try {
        await updateEmployeeStatus(currentUser.id, newStatus);
        toast.success(`상태가 '${newStatus}'(으)로 변경되었습니다.`);
    } catch (error) {
        toast.error("상태 변경에 실패했습니다.");
        console.error("Status update error:", error);
    }
  };

  const handleAttendance = async () => {
    if (loading || employeeLoading) return;

    const isCheckedIn = todayRecord && !todayRecord.check_out_time;

    setLoading(true);
    const toastId = toast.loading("현재 위치 정보를 확인 중입니다...");
    
    // 🚀 버튼 클릭 시 GPS 좌표를 동 단위로 변환
    const locationDong = await getLocationDong();
    toast.dismiss(toastId);

    try {
        if (isCheckedIn) { // 퇴근 처리
            const { data: updatedRecord, error } = await supabase
                .from('attendance_records')
                .update({ 
                    check_out_time: new Date().toISOString(),
                    check_out_location: locationDong // 🚀 DB에 퇴근 위치 저장
                })
                .eq('id', todayRecord.id)
                .select()
                .single();
            if (error) {
                throw error;
            }
            toast.success('퇴근 처리 및 위치가 기록되었습니다.');
            setTodayRecord(updatedRecord);
            await updateEmployeeStatus(currentUser.id, '오프라인'); 
        } else { // 출근 처리
            const { data: newRecord, error } = await supabase
                .from('attendance_records')
                .insert({ 
                    user_id: currentUser.id, 
                    check_in_time: new Date().toISOString(),
                    check_in_location: locationDong // 🚀 DB에 출근 위치 저장
                })
                .select()
                .single();
            if (error) {
                throw error;
            }
            toast.success('출근 처리 및 위치가 기록되었습니다.');
            setTodayRecord(newRecord);
            await updateEmployeeStatus(currentUser.id, '업무 중');
        }
    } catch (error) {
        console.error("출퇴근 처리 실패:", error);
        toast.error('출퇴근 처리 실패: ' + (error.message || '알 수 없는 오류'));
    } finally {
        setLoading(false);
    }
  };
  
  const currentStatus = employee?.status || '오프라인'; 
  const statusStyle = STATUS_STYLES[currentStatus] || STATUS_STYLES['오프라인'];
  const isCurrentlyCheckedIn = todayRecord && !todayRecord.check_out_time;

  return (
    <div className="bg-white p-5 rounded-xl w-full h-full flex flex-col justify-between">
      <div>
        <h2 className="text-[13px] font-black text-gray-800 mb-3 tracking-tight">나의 상태 현황</h2>
        <div className="relative">
          <button onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)} className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[11px] font-black rounded-lg ${statusStyle.color}`}>{statusStyle.icon}</span>
              <span className="font-black text-xs text-slate-800">{currentStatus}</span>
            </div>
            <span className="text-slate-400 text-[10px]">▼</span>
          </button>
          {isStatusDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-20 overflow-hidden" onMouseLeave={() => setIsStatusDropdownOpen(false)}>
              {Object.entries(STATUS_STYLES).map(([status, style]) => (
                <button key={status} onClick={() => handleStatusChange(status)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-black hover:bg-slate-50 transition-colors">
                  <span className={`px-1.5 py-0.5 rounded-md ${style.color}`}>{style.icon}</span>
                  <span className="text-slate-700">{status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-center">
        <p className="text-[11px] font-bold text-slate-400">오늘 누적 근무 시간</p>
        <p className="text-3xl font-black font-mono text-slate-800 tracking-tighter mt-1">
          {formatDuration(elapsedTime)}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100">
        {loading ? <div className="text-center text-[11px] font-bold text-slate-400 mb-4 h-10">기록 동기화 중...</div> : todayRecord ? (
          <div className="grid grid-cols-2 gap-2 text-center mb-4">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[10px] font-bold text-slate-400 mb-1">출근 기록</p>
              <p className="font-black text-sm text-slate-700 leading-none">
                  {new Date(todayRecord.check_in_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {/* 🚀 출근 위치 뱃지 표시 */}
              {todayRecord.check_in_location && (
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1.5">
                      📍 {todayRecord.check_in_location}
                  </span>
              )}
            </div>
            <div className="flex flex-col items-center justify-center">
              <p className="text-[10px] font-bold text-slate-400 mb-1">퇴근 기록</p>
              <p className="font-black text-sm text-slate-700 leading-none">
                  {todayRecord.check_out_time ? new Date(todayRecord.check_out_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}
              </p>
              {/* 🚀 퇴근 위치 뱃지 표시 */}
              {todayRecord.check_out_location && (
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1.5">
                      📍 {todayRecord.check_out_location}
                  </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-[11px] font-bold text-slate-400 mb-4 h-10 flex items-center justify-center">오늘 출근 기록이 없습니다.</p>
        )}
        <button
          onClick={handleAttendance}
          disabled={loading || employeeLoading || (isCurrentlyCheckedIn && elapsedTime < 1000)}
          className={`w-full font-black text-white py-3 rounded-xl transition-all shadow-md active:scale-95 text-xs disabled:opacity-50 disabled:cursor-not-allowed
            ${isCurrentlyCheckedIn ? 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600' : 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600'}`}
        >
          {isCurrentlyCheckedIn ? '퇴근하기 (위치 기록)' : '출근하기 (위치 기록)'}
        </button>
      </div>
    </div>
  );
}