// 파일 경로: src/app/(main)/mypage/LeaveCalendar.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from 'lib/supabase/client';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// 아이콘 컴포넌트들
const ChevronLeftIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z" clipRule="evenodd" /></svg> );
const ChevronRightIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z" clipRule="evenodd" /></svg> );

function ScheduleModal({ isOpen, onClose, onSave, selectedDate }) {
    const [title, setTitle] = useState('');
    if (!isOpen) return null;
    const handleSave = () => { if (!title.trim()) { toast.error('일정 내용을 입력해주세요.'); return; } onSave(title); setTitle(''); };
    return ( <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4" onClick={onClose}><div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}><div className="p-5 border-b"><h2 className="text-lg font-bold">일정 추가</h2></div><div className="p-6 space-y-2"><p className="font-semibold text-gray-700">{selectedDate.toLocaleDateString('ko-KR')}</p><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="간단한 일정 입력" className="w-full p-2 border rounded-md" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSave()} /></div><div className="px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-lg"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">취소</button><button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">저장</button></div></div></div> );
}

export default function LeaveCalendar({ currentUser, isWidget = false }) {
  const [date, setDate] = useState(new Date());
  const [leaves, setLeaves] = useState([]);
  const [personalSchedules, setPersonalSchedules] = useState([]);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
    const [leavesRes, schedulesRes] = await Promise.all([
      supabase.from('approvals').select('id, title, status, start_date, end_date, type').eq('requested_by', currentUser.id).in('status', ['승인', '대기']).in('type', ['휴가', '연차', '반차', '경조사', '공가', '휴가 신청서']).not('start_date', 'is', null).not('end_date', 'is', null).lte('start_date', lastDay).gte('end_date', firstDay),
      isWidget ? Promise.resolve({ data: [], error: null }) : supabase.from('personal_schedules').select('*').eq('user_id', currentUser.id).gte('schedule_date', firstDay).lte('schedule_date', lastDay)
    ]);
    if (leavesRes.error) console.error('휴가 데이터 로딩 실패:', leavesRes.error.message); else setLeaves(leavesRes.data || []);
    if (schedulesRes.error) console.error('개인 일정 로딩 실패:', schedulesRes.error.message); else setPersonalSchedules(schedulesRes.data || []);
    setLoading(false);
  }, [date, currentUser?.id, isWidget]);
  
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveSchedule = async (title) => { if (!selectedDateInfo?.date) return; const { data, error } = await supabase.from('personal_schedules').insert({ user_id: currentUser.id, title, schedule_date: selectedDateInfo.date.toISOString().slice(0,10) }).select(); if(error) { toast.error('일정 저장 실패'); } else if (data) { toast.success('일정 추가됨'); setPersonalSchedules(prev => [...prev, ...data]); setSelectedDateInfo(prev => ({ ...prev, schedules: [...prev.schedules, ...data] })); } setIsModalOpen(false); };
  const handleDeleteSchedule = async (scheduleId) => { if(confirm('이 일정을 삭제하시겠습니까?')) { const { error } = await supabase.from('personal_schedules').delete().eq('id', scheduleId); if(error) { toast.error('일정 삭제 실패'); } else { toast.success('일정 삭제됨'); setPersonalSchedules(prev => prev.filter(s => s.id !== scheduleId)); setSelectedDateInfo(prev => ({ ...prev, schedules: prev.schedules.filter(s => s.id !== scheduleId) })); } } };
  const changeMonth = (offset) => { setDate(new Date(date.getFullYear(), date.getMonth() + offset, 1)); setSelectedDateInfo(null); };
  
  const renderCalendar = () => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay());
    const rows = [];
    let day = new Date(startDate);
    const rowCount = isWidget ? 5 : 6;
    for (let i = 0; i < rowCount; i++) {
      const days = [];
      for (let j = 0; j < 7; j++) {
        const cloneDay = new Date(day); cloneDay.setHours(0,0,0,0);
        const isCurrentMonth = day.getMonth() === date.getMonth();
        const isToday = new Date().toDateString() === day.toDateString();
        const isSelected = selectedDateInfo && selectedDateInfo.date.toDateString() === cloneDay.toDateString();
        
        // ★★★ 타임존 문제 해결을 위한 로직 수정 ★★★
        const dayLeaves = leaves.filter(l => {
            if (!l.start_date || !l.end_date) return false;
            const start = new Date(l.start_date.replace(/-/g, "/"));
            const end = new Date(l.end_date.replace(/-/g, "/"));
            start.setHours(0,0,0,0); end.setHours(0,0,0,0);
            return cloneDay >= start && cloneDay <= end;
        });
        const daySchedules = personalSchedules.filter(s =>
            new Date(s.schedule_date.replace(/-/g, "/")).toDateString() === cloneDay.toDateString()
        );
        
        days.push( <div key={day.toISOString()} className={`flex justify-center items-center ${isWidget ? 'h-8' : 'h-10'}`}><button onClick={() => { if (isCurrentMonth) setSelectedDateInfo({ date: cloneDay, leaves: dayLeaves, schedules: daySchedules }); }} disabled={!isCurrentMonth} className={`flex items-center justify-center rounded-full text-sm transition-all relative ${isWidget ? 'w-7 h-7' : 'w-8 h-8'} ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700'} ${isToday ? 'bg-blue-600 text-white font-bold' : ''} ${isSelected && !isWidget ? 'ring-2 ring-blue-500' : ''} ${dayLeaves.length > 0 ? 'bg-green-100' : ''} ${isCurrentMonth && !isToday && 'hover:bg-gray-100'}`}>{day.getDate()}{!isWidget && daySchedules.length > 0 && <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>}</button></div> );
        day.setDate(day.getDate() + 1);
      }
      rows.push(<div className="grid grid-cols-7" key={i}>{days}</div>);
    }
    return <>{rows}</>;
  };

  // 위젯 모드 렌더링
  if (isWidget) { return ( <div className="w-full h-full flex flex-col"><div className="flex justify-between items-center mb-2 px-1"><button onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-gray-100"><ChevronLeftIcon /></button><Link href="/mypage" className="text-base font-bold text-gray-800 hover:text-blue-600">{`${date.getFullYear()}년 ${date.getMonth() + 1}월`}</Link><button onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-gray-100"><ChevronRightIcon /></button></div><div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400 mb-1">{['일','월','화','수','목','금','토'].map(d => <div key={d}>{d}</div>)}</div>{loading ? <div className="flex-grow flex items-center justify-center text-sm text-gray-400">로딩중...</div> : renderCalendar()}</div> ); }

  // 기본(마이페이지) 모드 렌더링
  return (
    <>
      <div className="bg-white p-4 rounded-xl border border-gray-200 w-full">
        <div className="flex justify-between items-center mb-4"><button onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-gray-100"><ChevronLeftIcon /></button><h3 className="text-base font-bold text-gray-800">{`${date.getFullYear()}년 ${date.getMonth() + 1}월`}</h3><button onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-gray-100"><ChevronRightIcon /></button></div>
        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-2">{['일','월','화','수','목','금','토'].map(d => <div key={d}>{d}</div>)}</div>
        {loading ? <div className="text-center text-sm text-gray-400 py-20">캘린더 데이터 로딩 중...</div> : renderCalendar()}
        <div className="mt-2 p-3 bg-gray-50 rounded-lg min-h-[80px]">
          {selectedDateInfo ? ( <div><div className="flex justify-between items-center mb-2"><p className="font-semibold text-gray-800 text-sm">{selectedDateInfo.date.toLocaleDateString('ko-KR')}</p><button onClick={() => setIsModalOpen(true)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">+ 일정 추가</button></div><div className="space-y-1 text-xs">{selectedDateInfo.leaves.map(l => <p key={`leave-${l.id}`} className="text-green-700">- {l.title} (휴가)</p>)}{selectedDateInfo.schedules.map(s => <div key={`sch-${s.id}`} className="flex justify-between items-center"><p className="text-red-700">- {s.title}</p><button onClick={() => handleDeleteSchedule(s.id)} className="text-red-500 hover:text-red-700 font-bold">X</button></div>)}{selectedDateInfo.leaves.length === 0 && selectedDateInfo.schedules.length === 0 && <p className="text-gray-500">예정된 일정이 없습니다.</p>}</div></div> ) : <p className="text-xs text-center text-gray-400 pt-5">날짜를 선택해 일정을 확인하세요.</p>}
        </div>
      </div>
      <ScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveSchedule} selectedDate={selectedDateInfo?.date} />
    </>
  );
}