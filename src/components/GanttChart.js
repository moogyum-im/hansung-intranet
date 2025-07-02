// 파일 경로: src/app/work/gongmu/page.js
"use client";

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// '새 업무 추가/수정' 팝업(모달) 컴포넌트 (이전과 동일)
const TaskModal = ({ taskToEdit, onClose, onSaveTask, onDeleteTask }) => { const [isAllDay, setIsAllDay] = useState(taskToEdit ? taskToEdit.allDay : true); const [title, setTitle] = useState(taskToEdit ? taskToEdit.title : ''); const [assignee, setAssignee] = useState(taskToEdit ? taskToEdit.extendedProps.assignee : ''); const [status, setStatus] = useState(taskToEdit ? taskToEdit.extendedProps.status : '대기'); const getInitialDate = (dateString, part) => { if (!dateString) return new Date().toISOString().substring(part === 'date' ? 0 : 11, part === 'date' ? 10 : 16); return dateString.substring(part === 'date' ? 0 : 11, part === 'date' ? 10 : 16); }; const [startDate, setStartDate] = useState(getInitialDate(taskToEdit?.startStr, 'date')); const [startTime, setStartTime] = useState(!isAllDay ? getInitialDate(taskToEdit?.startStr, 'time') : '09:00'); const [endDate, setEndDate] = useState(getInitialDate(taskToEdit?.endStr, 'date')); const [endTime, setEndTime] = useState(!isAllDay ? getInitialDate(taskToEdit?.endStr, 'time') : '10:00'); const modalRef = useRef(null); useEffect(() => { const handleClickOutside = (e) => { if (modalRef.current && !modalRef.current.contains(e.target)) onClose(); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [onClose]); const handleSubmit = (e) => { e.preventDefault(); const finalEndDate = isAllDay ? endDate : (endDate || startDate); const savedTask = { id: taskToEdit ? taskToEdit.id : `task_${Date.now()}`, title, allDay: isAllDay, start: isAllDay ? startDate : `${startDate}T${startTime}`, end: isAllDay ? (finalEndDate ? new Date(new Date(finalEndDate).getTime() + 86400000).toISOString().substring(0,10) : null) : `${finalEndDate}T${endTime}`, extendedProps: { assignee, status } }; onSaveTask(savedTask); onClose(); }; return ( <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"><div ref={modalRef} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">{taskToEdit ? '업무 수정' : '새 업무'}</h2><button onClick={onClose} className="text-gray-400 text-3xl">×</button></div><form onSubmit={handleSubmit} className="space-y-4 text-sm"><div><label className="font-semibold text-gray-600 mb-1 block">업무 내용</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg"/></div><div className="grid grid-cols-2 gap-4"><div><label className="font-semibold text-gray-600 mb-1 block">담당자</label><input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg"/></div><div><label className="font-semibold text-gray-600 mb-1 block">상태</label><select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg"><option>대기</option><option>진행중</option><option>완료</option></select></div></div><div className="pt-2"><div className="flex items-center gap-2"><input type="checkbox" id="all-day" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} className="h-4 w-4" /><label htmlFor="all-day">하루 종일</label></div></div><div className="grid grid-cols-2 gap-4"><div><label className="font-semibold text-gray-600 mb-1 block">시작일</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full p-2 bg-gray-50 border rounded-lg"/></div><div><label className="font-semibold text-gray-600 mb-1 block">종료일</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required={isAllDay} className="w-full p-2 bg-gray-50 border rounded-lg"/></div></div>{!isAllDay && (<div className="grid grid-cols-2 gap-4 animate-fade-in"><div><label className="font-semibold text-gray-600 mb-1 block">시작 시간</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="p-2 bg-gray-50 border rounded-lg w-full"/></div><div><label className="font-semibold text-gray-600 mb-1 block">종료 시간</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="p-2 bg-gray-50 border rounded-lg w-full"/></div></div>)}<div className="flex items-center gap-x-4 pt-4">{taskToEdit && <button type="button" onClick={() => {if(window.confirm('삭제하시겠습니까?')) {onDeleteTask(taskToEdit.id); onClose();}}} className="font-medium text-red-600 hover:text-red-700">삭제하기</button>}<div className="flex-grow"></div><button type="button" onClick={onClose} className="px-5 py-2 rounded-md bg-gray-200">취소</button><button type="submit" className="px-5 py-2 text-white rounded-md" style={{backgroundColor: '#17482b'}}>{taskToEdit ? '저장' : '추가'}</button></div></form></div></div> ); };

// [신규] 목록 뷰를 위한 테이블 컴포넌트
const TaskTableView = ({ events, onEdit, onDelete }) => {
    const getDDay = (endDateStr) => {
        if (!endDateStr) return { text: '-', color: '' };
        const end = new Date(endDateStr);
        const today = new Date(); today.setHours(0,0,0,0);
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { text: `D+${Math.abs(diffDays)}`, color: 'text-gray-500' };
        if (diffDays === 0) return { text: 'D-Day', color: 'text-red-600 font-bold' };
        if (diffDays <= 3) return { text: `D-${diffDays}`, color: 'text-yellow-600' };
        return { text: `D-${diffDays}`, color: 'text-green-600' };
    };
    const getStatusBadge = (status) => { const base = "px-2 py-0.5 text-xs font-semibold rounded-full"; return status === '완료' ? `${base} bg-green-100 text-green-800` : (status === '진행중' ? `${base} bg-blue-100 text-blue-800` : `${base} bg-gray-100 text-gray-800`); };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-50 text-xs text-gray-700 uppercase"><tr><th className="px-4 py-3">상태</th><th className="px-4 py-3">업무 내용</th><th className="px-4 py-3">담당자</th><th className="px-4 py-3">기간</th><th className="px-4 py-3">마감</th><th className="px-4 py-3">관리</th></tr></thead>
                <tbody>{events.map((event) => (<tr key={event.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3"><span className={getStatusBadge(event.extendedProps.status)}>{event.extendedProps.status}</span></td><td className="px-4 py-3 font-medium text-gray-900">{event.title}</td><td className="px-4 py-3">{event.extendedProps.assignee}</td><td className="px-4 py-3">{event.start.substring(0, 10)} ~ {event.end?.substring(0, 10) || ''}</td><td className={`px-4 py-3 font-medium ${getDDay(event.end || event.start).color}`}>{getDDay(event.end || event.start).text}</td><td className="px-4 py-3 flex items-center gap-x-3"><button onClick={() => onEdit(event)} className="font-medium text-blue-600">수정</button><button onClick={() => onDelete(event.id)} className="font-medium text-red-600">삭제</button></td></tr>))}</tbody>
            </table>
        </div>
    );
};

// 메인 페이지 컴포넌트
export default function GongmuBoardPage() {
    // [신규] 'calendar' 또는 'list' 모드 상태 추가
    const [viewMode, setViewMode] = useState('calendar');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null); 
    const [events, setEvents] = useState([ { id: 'task_1', title: '제품 소개영상 제작 프로젝트', start: '2024-07-22', end: '2024-07-28', allDay: true, extendedProps: { assignee: '김대리', status: '진행중' } }, { id: 'task_2', title: '주간 디자인팀 회의', start: '2024-07-29T10:00:00', end: '2024-07-29T11:30:00', allDay: false, extendedProps: { assignee: '박과장', status: '진행중' } }, ]);

    // ... 모든 핸들러 함수들은 변경 없음 ...
    const handleOpenModal = (event = null) => { setEditingEvent(event); setIsModalOpen(true); };
    const handleEventClick = (clickInfo) => { handleOpenModal(clickInfo.event); };
    const handleCloseModal = () => { setEditingEvent(null); setIsModalOpen(false); };
    const handleSaveTask = (savedEvent) => { const exists = events.some(e => e.id === savedEvent.id); if (exists) { setEvents(events.map(e => e.id === savedEvent.id ? savedEvent : e)); } else { setEvents([...events, savedEvent]); } };
    const handleDeleteTask = (eventId) => { if (window.confirm('정말로 이 업무를 삭제하시겠습니까?')) { setEvents(events.filter(e => e.id !== eventId)); } };
    const renderEventContent = (eventInfo) => { const { assignee, status } = eventInfo.event.extendedProps; const bgColor = status === '완료' ? 'bg-green-600' : (status === '진행중' ? 'bg-blue-600' : 'bg-gray-500'); return (<div className={`p-1.5 w-full h-full text-white rounded-md ${bgColor} text-xs leading-tight`}><div className="font-bold truncate">{eventInfo.event.title}</div><div className="font-normal opacity-90">{assignee}</div></div>); };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {isModalOpen && <TaskModal taskToEdit={editingEvent} onClose={handleCloseModal} onSaveTask={handleSaveTask} onDeleteTask={handleDeleteTask}/>}
            <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div><h1 className="text-3xl font-bold text-gray-800">공무부 업무 현황</h1><p className="mt-1 text-gray-500">일정을 확인하고 관리하세요.</p></div>
                <div className="flex items-center gap-x-4">
                    {/* [신규] 뷰 전환 토글 버튼 */}
                    <div className="bg-gray-100 p-1 rounded-lg flex space-x-1">
                        <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-green-700 text-white shadow' : 'text-gray-600'}`}>캘린더</button>
                        <button onClick={() => setViewMode('list')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${viewMode === 'list' ? 'bg-green-700 text-white shadow' : 'text-gray-600'}`}>목록</button>
                    </div>
                    <button onClick={() => handleOpenModal()} className="flex items-center bg-green-800 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-900">새 업무 추가</button>
                </div>
            </header>
            
            <main className="bg-white p-4 rounded-xl shadow-lg">
                 {viewMode === 'calendar' ? (
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                        initialView="dayGridMonth" locale="ko" editable={true}
                        events={events} eventContent={renderEventContent} eventClick={handleEventClick}
                        height="auto" // [수정] 달력 높이를 내용에 맞게 자동으로 조절
                    />
                 ) : (
                    <TaskTableView events={events} onEdit={handleOpenModal} onDelete={handleDeleteTask} />
                 )}
            </main>
        </div>
    );
}