"use client";

import { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt'; // 이제 이 한 줄로 JS와 CSS가 모두 로드됩니다.

// ★★★ 이 파일 상단에는 더 이상 frappe-gantt 관련 CSS import가 없습니다. ★★★

export default function GanttChart({ tasks }) {
    const ganttRef = useRef(null);
    const ganttInstance = useRef(null);
    const [viewMode, setViewMode] = useState('Week');

    useEffect(() => {
        // 이 로직은 항상 클라이언트에서만 실행되므로 안전합니다.
        if (ganttRef.current) {
            
            // 데이터 유효성 검사
            const formattedTasks = (tasks || [])
                .filter(task => task && task.id && task.title && task.start_date && task.end_date)
                .map(task => ({
                    id: String(task.id),
                    name: task.title,
                    start: task.start_date,
                    end: task.end_date,
                    progress: 0,
                }));

            // 이전 차트 인스턴스가 남아있으면 찌꺼기를 확실히 제거합니다.
            if(ganttRef.current) {
                ganttRef.current.innerHTML = "";
            }
            
            // 유효한 데이터가 있을 때만 차트를 생성합니다.
            if (formattedTasks.length > 0) {
                ganttInstance.current = new Gantt(ganttRef.current, formattedTasks, {
                    header_height: 50,
                    bar_height: 20,
                    padding: 20,
                    view_modes: ['Day', 'Week', 'Month'],
                    view_mode: 'Week',
                    language: 'ko',
                });
            }
        }
    }, [tasks]);

    const changeViewMode = (mode) => {
        ganttInstance.current?.change_view_mode(mode);
        setViewMode(mode);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border h-full flex flex-col">
            <div className="flex items-center justify-end p-3 border-b">
                <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-lg">
                    {['Day', 'Week', 'Month'].map(mode => (
                         <button 
                            key={mode} 
                            onClick={() => changeViewMode(mode)}
                            className={`px-3 py-1 text-sm rounded-md ${viewMode === mode ? 'bg-white shadow-sm font-semibold text-blue-600' : 'text-gray-500'}`}>
                           {mode === 'Day' ? '일' : mode === 'Week' ? '주' : '월'}
                       </button>
                    ))}
                </div>
            </div>
            <div className="p-4 overflow-x-auto h-full relative" ref={ganttRef}>
                {(!tasks || tasks.length === 0) && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <p>등록된 업무가 없습니다. &apos;업무 등록&apos; 버튼으로 시작하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}