"use client";

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar'; // react-calendar를 직접 import
import 'react-calendar/dist/Calendar.css'; // 기본 달력 스타일
import './DashboardCalendar.css'; // 우리가 만든 커스텀 스타일

// isMounted 같은 상태를 하나 더 만들어서, 클라이언트에서만 렌더링되도록 제어합니다.
export default function DashboardCalendar() {
    const [date, setDate] = useState(new Date());
    const [isClient, setIsClient] = useState(false);

    // useEffect는 클라이언트에서 컴포넌트가 마운트된 후에만 실행됩니다.
    // 이 점을 이용해서 서버 렌더링과 클라이언트 렌더링의 차이를 없앨 수 있습니다.
    useEffect(() => {
        setIsClient(true);
    }, []);

    // isClient가 false일 때 (서버 렌더링 시점 또는 클라이언트 초기 렌더링)는
    // 아무것도 보여주지 않거나, 간단한 로딩 스켈레톤을 보여줍니다.
    if (!isClient) {
        // Hydration 오류를 피하기 위해, 서버에서는 캘린더의 '자리'만 차지하는
        // 간단한 div를 렌더링하거나 null을 반환합니다.
        return <div className="w-full h-[300px] bg-gray-200 rounded-lg animate-pulse"></div>;
    }
    
    // isClient가 true로 바뀐 후 (클라이언트에서 완전히 준비됨),
    // 진짜 Calendar 컴포넌트를 렌더링합니다.
    return (
        <Calendar
            onChange={setDate}
            value={date}
            className="dashboard-calendar"
            locale="ko-KR" // 한국어 설정을 명시적으로 추가
            formatDay={(locale, date) => date.toLocaleString("en", {day: "numeric"})} // 날짜 표기 방식 설정 (예시)
        />
    );
}