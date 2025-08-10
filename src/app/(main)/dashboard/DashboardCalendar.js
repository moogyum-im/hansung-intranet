// 파일 경로: src/app/(main)/dashboard/DashboardCalendar.js
"use client";

import { useState, useEffect } from 'react';
import { ko } from 'date-fns/locale';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, addWeeks, subWeeks } from 'date-fns';
import './DashboardCalendar.css';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

export default function DashboardCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <div className="w-full h-auto bg-gray-200 rounded-lg animate-pulse min-h-[180px]"></div>;
    }
    
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 월요일 시작
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    
    const days = [];
    let day = weekStart;
    while (day <= weekEnd) {
        days.push(new Date(day));
        day = addDays(day, 1);
    }

    const headerText = format(currentDate, 'yyyy년 M월', { locale: ko });

    const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    return (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-3 px-2">
                <div className="text-sm font-semibold text-gray-800">{headerText}</div>
                <div className="flex items-center space-x-2">
                    <button onClick={goToPreviousWeek} className="p-1 rounded-full hover:bg-gray-100" aria-label="이전 주"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
                    <button onClick={goToNextWeek} className="p-1 rounded-full hover:bg-gray-100" aria-label="다음 주"><ChevronRightIcon className="h-5 w-5 text-gray-600" /></button>
                    <button onClick={goToToday} className="px-3 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300 font-semibold">오늘</button>
                </div>
            </div>

            <div className="grid grid-cols-7 text-center text-xs text-gray-500 font-semibold">
                {['월', '화', '수', '목', '금', '토', '일'].map(dayLabel => <div key={dayLabel}>{dayLabel}</div>)}
            </div>
            <div className="grid grid-cols-7 mt-2">
                {days.map((date, i) => {
                    const isToday = isSameDay(date, new Date());
                    const isCurrentMonth = isSameMonth(date, currentDate);
                    const isSaturday = date.getDay() === 6;
                    const isSunday = date.getDay() === 0;

                    return (
                        <div key={i} className="flex justify-center items-center h-9">
                            <button className={`
                                w-8 h-8 rounded-full text-sm flex items-center justify-center
                                ${isToday ? 'bg-blue-500 text-white font-bold' : ''}
                                ${!isCurrentMonth ? 'text-gray-300' : ''}
                                ${isSaturday && !isToday ? 'text-blue-700' : ''}
                                ${isSunday && !isToday ? 'text-red-500' : ''}
                                ${isSaturday || isSunday ? 'font-semibold' : ''}
                            `}>
                                {format(date, 'd')}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-2">
                <div className="flex border-b">
                    <button className="flex-1 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600">전체 일정</button>
                    <button className="flex-1 py-2 text-sm font-semibold text-gray-500">내 일정</button>
                </div>
                <div className="pt-4 text-center text-sm text-gray-500 min-h-[50px] flex items-center justify-center">
                    등록된 일정이 없습니다.
                </div>
            </div>
        </div>
    );
}