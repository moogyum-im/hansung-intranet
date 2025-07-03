// 파일 경로: src/app/(main)/mypage/LeaveCalendar.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // react-calendar의 기본 스타일
import './LeaveCalendar.css'; // 사용자 정의 스타일 (기존 파일)
// 수정 후 코드
import { supabase } from 'lib/supabase/client'; // (../../../ 사라짐)

export default function LeaveCalendar({ currentUser }) {
    const [leaveEvents, setLeaveEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date()); // 달력에서 선택된 날짜


    const fetchLeaveEvents = useCallback(async () => {
        if (!currentUser?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('approvals') // ★★★ 'annual_leaves' -> 'approvals'로 변경 ★★★
            .select(`
                *, 
                requested_user:requested_by(full_name, department) // ★★★ 휴가 요청자 정보 조인 ★★★
            `) 
            .eq('requested_by', currentUser.id) // ★★★ 현재 로그인한 사용자가 요청한 휴가만 가져옴 ★★★
            .eq('request_type', '휴가') // ★★★ '휴가' 유형의 결재만 필터링 ★★★
            .in('status', ['승인', '대기']); // 승인되거나 대기중인 휴가만 가져오기

        if (error) {
            console.error("휴가 정보 로딩 실패:", error.message);
            setLeaveEvents([]);
        } else {
            setLeaveEvents(data || []);
        }
        setLoading(false);
    }, [currentUser?.id, supabase]);

    useEffect(() => {
        fetchLeaveEvents();
    }, [fetchLeaveEvents]);

    // 달력 타일 내용 커스터마이징
    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dayEvents = leaveEvents.filter(event => {
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date || event.start_date); // end_date가 없으면 start_date와 동일
                // date가 시작일과 종료일 사이에 있는지 확인 (시, 분, 초 무시)
                return date.setHours(0,0,0,0) >= startDate.setHours(0,0,0,0) && date.setHours(0,0,0,0) <= endDate.setHours(0,0,0,0);
            });

            if (dayEvents.length > 0) {
                return (
                    <div className="leave-events-dot-container">
                        {dayEvents.map((event, index) => (
                            <span 
                                key={index} 
                                className={`leave-event-dot ${event.status === '승인' ? 'bg-green-500' : 'bg-yellow-500'}`} 
                                title={`${event.request_type}: ${event.title} (${event.status})`}
                            ></span>
                        ))}
                    </div>
                );
            }
        }
        return null;
    };

    // 달력 타일 클래스 커스터마이징 (추가 스타일링을 위해)
    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const isLeaveDay = leaveEvents.some(event => {
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date || event.start_date);
                return date.setHours(0,0,0,0) >= startDate.setHours(0,0,0,0) && date.setHours(0,0,0,0) <= endDate.setHours(0,0,0,0);
            });
            return isLeaveDay ? 'has-leave-event' : null;
        }
        return null;
    };

    if (loading) {
        return <div className="p-4 bg-white rounded-lg shadow text-center text-gray-500">휴가 정보 로딩 중...</div>;
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="font-bold text-lg mb-4">나의 휴가/결재 현황</h2>
            <div className="flex justify-center">
                <Calendar
                    onChange={setSelectedDate}
                    value={selectedDate}
                    className="leave-calendar" // CSS 클래스 적용
                    tileContent={tileContent}
                    tileClassName={tileClassName}
                    locale="ko-KR" // 한국어 로케일 설정
                />
            </div>
            {/* 선택된 날짜의 휴가 이벤트 목록 */}
            <div className="mt-4 p-2 border-t pt-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2">{selectedDate.toLocaleDateString()}의 휴가/결재</h3>
                {leaveEvents.filter(event => {
                    const startDate = new Date(event.start_date);
                    const endDate = new Date(event.end_date || event.start_date);
                    return selectedDate.setHours(0,0,0,0) >= startDate.setHours(0,0,0,0) && selectedDate.setHours(0,0,0,0) <= endDate.setHours(0,0,0,0);
                }).length > 0 ? (
                    <ul className="space-y-2">
                        {leaveEvents.filter(event => {
                            const startDate = new Date(event.start_date);
                            const endDate = new Date(event.end_date || event.start_date);
                            return selectedDate.setHours(0,0,0,0) >= startDate.setHours(0,0,0,0) && selectedDate.setHours(0,0,0,0) <= endDate.setHours(0,0,0,0);
                        }).map(event => (
                            <li key={event.id} className={`p-2 rounded-md text-sm ${event.status === '승인' ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                                <span className="font-semibold">[{event.request_type}] {event.title}</span> - {event.status}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 text-sm">해당 날짜에 예정된 휴가/결재가 없습니다.</p>
                )}
            </div>
        </div>
    );
}