// 파일 경로: src/app/(main)/work/[department]/calendar/WorkCalendar.js
"use client";

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import { toast } from 'react-hot-toast';

// 아이콘 컴포넌트들 (변경 없음)
const PlusIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );
const ChevronLeftIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z" clipRule="evenodd" /></svg> );
const ChevronRightIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z" clipRule="evenodd" /></svg> );

function TaskModal({ task, onClose, onSave, onDelete, canManage, allEmployees = [] }) {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [selectedAttendees, setSelectedAttendees] = useState([]);
    const [priority, setPriority] = useState('보통');
    const employeeOptions = allEmployees.map(emp => ({ value: emp.id, label: `${emp.full_name} (${emp.department})` }));
    
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        if (task) {
            setTitle(task.title || '');
            // ★★★ 타임존 문제 해결: DB에서 온 timestamp에서 날짜 부분만 잘라서 사용 ★★★
            setStartDate(task.start_date ? task.start_date.split('T')[0] : today);
            setEndDate(task.end_date ? task.end_date.split('T')[0] : today);
            setDescription(task.description || '');
            setPriority(task.priority || '보통');
            const attendees = task.attendees || [];
            setSelectedAttendees(employeeOptions.filter(opt => attendees.includes(opt.value)));
        } else {
            setTitle(''); setStartDate(today); setEndDate(today);
            setDescription(''); setPriority('보통'); setSelectedAttendees([]);
        }
    }, [task, allEmployees]);

    const handleSaveClick = () => { if (!title.trim()) { toast.error('업무명을 입력해주세요.'); return; } const attendeeIds = selectedAttendees.map(attendee => attendee.value); onSave({ ...task, title, start_date: startDate, end_date: endDate, description, priority }, attendeeIds); };
    
    return ( <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}><div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}><div className="p-5 border-b flex justify-between items-center"><h2 className="text-lg font-bold">{task?.id ? '업무 수정' : '새 업무 추가'}</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button></div><div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto"><div><label className="font-semibold text-gray-700">업무명</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 p-2 border rounded-md" /></div><div><label className="font-semibold text-gray-700">우선순위</label><select value={priority} onChange={e => setPriority(e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-white"><option value="긴급">긴급</option><option value="높음">높음</option><option value="보통">보통</option><option value="낮음">낮음</option></select></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="font-semibold text-gray-700">시작일</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 border rounded-md" /></div><div><label className="font-semibold text-gray-700">종료일</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="w-full mt-1 p-2 border rounded-md" /></div></div><div><label className="font-semibold text-gray-700">참조인</label><Select isMulti options={employeeOptions} value={selectedAttendees} onChange={setSelectedAttendees} className="mt-1" classNamePrefix="select" placeholder="참조할 직원을 선택하세요..." /></div><div><label className="font-semibold text-gray-700">상세 내용</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows="4" className="w-full mt-1 p-2 border rounded-md"></textarea></div></div><div className="px-6 py-4 bg-gray-50 flex justify-between items-center rounded-b-xl"><div>{task?.id && canManage && (<button onClick={() => onDelete(task.id)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">삭제</button>)}</div><div className="flex gap-3"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium">취소</button><button onClick={handleSaveClick} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">저장</button></div></div></div></div> );
}


const getProjectColor = (projectId, groups = []) => { const project = groups.find(g => String(g.id) === String(projectId)); return project?.color || '#3B82F6'; };
const getEventStyle = (task, groups) => { const priorityColors = { '긴급': '#EF4444', '높음': '#F97316', '보통': '#3B82F6', '낮음': '#A1A1AA', }; const color = priorityColors[task.priority] || getProjectColor(task.project_id, groups) || '#3B82F6'; return { backgroundColor: color, borderColor: color, title: `${task.priority === '긴급' ? '🔥 ' : ''}${task.title}` }; }

export default function WorkCalendar({ initialTasks = [], initialGroups = [], isAdmin, pageDepartment, currentUserDepartment, currentUserId, allEmployees = [] }) {
    const calendarRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [currentTitle, setCurrentTitle] = useState('');
    const router = useRouter();

    const canManageThisDepartmentCalendar = isAdmin || (currentUserDepartment === pageDepartment);

    const calendarEvents = initialTasks.map(task => { const style = getEventStyle(task, initialGroups); return { id: String(task.id), title: style.title, start: task.start_date, end: task.end_date, allDay: true, extendedProps: { ...task }, backgroundColor: style.backgroundColor, borderColor: style.borderColor, }; });
    
    const handleCloseModal = () => { setIsModalOpen(false); setEditingTask(null); };
    const handleDateClick = (arg) => { if (!canManageThisDepartmentCalendar) { toast.error('이 부서의 일정을 추가할 권한이 없습니다.'); return; } setEditingTask({ start_date: arg.dateStr, end_date: arg.dateStr }); setIsModalOpen(true); };
    const handleEventClick = (clickInfo) => { setEditingTask(clickInfo.event.extendedProps); setIsModalOpen(true); };
    const handleSaveTask = async (formData, attendeeIds) => { const dataToSend = { title: formData.title, start_date: formData.start_date, end_date: formData.end_date, description: formData.description, attendees: attendeeIds, priority: formData.priority, }; const method = formData.id ? 'PUT' : 'POST'; const url = formData.id ? `/api/tasks/${formData.id}` : `/api/tasks`; if (!formData.id) { dataToSend.department = pageDepartment; dataToSend.user_id = currentUserId; } try { const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend) }); if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || '서버 오류'); } toast.success(formData.id ? '업무가 수정되었습니다.' : '새 업무가 추가되었습니다.'); router.refresh(); handleCloseModal(); } catch (error) { toast.error(`오류: ${error.message}`); } };
    const handleDeleteTask = async (taskId) => { if (!taskId || !window.confirm("정말로 이 업무를 삭제하시겠습니까?")) return; try { const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' }); if (!response.ok) throw new Error('서버에서 삭제 실패'); toast.success('업무가 삭제되었습니다.'); router.refresh(); handleCloseModal(); } catch (error) { toast.error(`삭제 실패: ${error.message}`); } };
    
    // ★★★★★ 타임존 문제 해결을 위한 로직 수정 ★★★★★
    const handleEventDropOrResize = async (info) => {
        const { event } = info;
        const newStartDate = event.start;
        // FullCalendar의 end 날짜는 exclusive(그 날짜 미만)이므로, 하루를 빼서 inclusive(그 날짜 포함)로 만들어줍니다.
        const newEndDate = event.end ? new Date(event.end.getTime() - (24 * 60 * 60 * 1000)) : newStartDate;

        const taskData = {
            id: event.id,
            title: event.title.replace('🔥 ', ''),
            start_date: newStartDate.toISOString().slice(0, 10),
            end_date: newEndDate.toISOString().slice(0, 10),
            description: event.extendedProps.description,
            priority: event.extendedProps.priority,
        };
        await handleSaveTask(taskData, event.extendedProps.attendees || []);
    };
    
    const handlePrevMonth = () => calendarRef.current?.getApi().prev();
    const handleNextMonth = () => calendarRef.current?.getApi().next();
    const handleToday = () => calendarRef.current?.getApi().today();
    const handleNewTask = () => { if (!canManageThisDepartmentCalendar) return; setEditingTask(null); setIsModalOpen(true); };
    
    useEffect(() => { if (calendarRef.current) { const calendarApi = calendarRef.current.getApi(); setCurrentTitle(calendarApi.view.title); const intervalId = setInterval(() => { if (calendarApi.view.title !== currentTitle) { setCurrentTitle(calendarApi.view.title); } }, 100); return () => clearInterval(intervalId); } }, [calendarRef, currentTitle]);

    return (
        <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
            <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-200 gap-4">
                <div className="flex items-center gap-2"><button onClick={handlePrevMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"><ChevronLeftIcon /></button><button onClick={handleNextMonth} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"><ChevronRightIcon /></button><button onClick={handleToday} className="ml-2 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-gray-100 transition-colors">Today</button></div>
                <h2 className="text-lg font-bold text-gray-800 order-first w-full sm:w-auto sm:order-none text-center sm:text-left">{currentTitle}</h2>
                <div>{canManageThisDepartmentCalendar && (<button onClick={handleNewTask} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><PlusIcon /> 새 업무</button>)}</div>
            </div>
            <div className="p-2 sm:p-4 flex-grow min-h-0">
                <FullCalendar ref={calendarRef} plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" headerToolbar={false} locale="ko" events={calendarEvents} editable={canManageThisDepartmentCalendar} selectable={canManageThisDepartmentCalendar} selectMirror={true} dayMaxEvents={true} weekends={true} dateClick={handleDateClick} eventClick={handleEventClick} eventDrop={handleEventDropOrResize} eventResize={handleEventDropOrResize} height="100%" />
            </div>
            {isModalOpen && (<TaskModal task={editingTask} onClose={handleCloseModal} onSave={handleSaveTask} onDelete={handleDeleteTask} canManage={canManageThisDepartmentCalendar} allEmployees={allEmployees} />)}
        </div>
    );
}