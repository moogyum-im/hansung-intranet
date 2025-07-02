// 파일 경로: src/app/(main)/work/[department]/calendar/WorkCalendar.js
"use client";

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRouter } from 'next/navigation';

// 재사용 가능한 컴포넌트들
import TaskModal from '@/components/TaskModal';
import ToastNotification from '@/components/ToastNotification';

const getProjectColor = (projectId, groups = []) => {
    const project = groups.find(g => String(g.id) === String(projectId));
    return project?.color || '#3788D8';
};

export default function WorkCalendar({
    initialTasks = [],
    initialGroups = [],
    isAdmin,
    pageDepartment,
    currentUserDepartment,
    currentUserId
}) {
    const calendarRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const [toast, setToast] = useState({ message: '', type: '' });
    const router = useRouter();

    const canManageThisDepartmentCalendar = isAdmin || (currentUserDepartment === pageDepartment);

    // FullCalendar에 표시될 이벤트 목록
    const calendarEvents = initialTasks.map(task => ({
        id: String(task.id),
        title: task.title,
        start: task.start_date,
        end: task.end_date,
        allDay: true,
        extendedProps: { ...task },
        backgroundColor: getProjectColor(task.project_id, initialGroups),
        borderColor: getProjectColor(task.project_id, initialGroups),
    }));

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 3000);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleDateClick = (arg) => {
        if (!canManageThisDepartmentCalendar) return showToast('이 부서의 일정을 추가할 권한이 없습니다.', 'error');
        setEditingTask({ start_date: arg.dateStr }); // 새 업무, 시작일만 지정
        setIsModalOpen(true);
    };

    const handleEventClick = (clickInfo) => {
        setEditingTask(clickInfo.event.extendedProps);
        setIsModalOpen(true);
    };
    
    // ★★★★★ 1. 업무 저장/수정 함수 (department 누락 문제 해결) ★★★★★
    const handleSaveTask = async (formData) => {
        const taskIdToUpdate = editingTask?.id;

        // 권한 확인
        if (!taskIdToUpdate && !canManageThisDepartmentCalendar) {
            return showToast('새 업무를 추가할 권한이 없습니다.', 'error');
        }

        const method = taskIdToUpdate ? 'PUT' : 'POST';
        const url = taskIdToUpdate ? `/api/tasks/${taskIdToUpdate}` : `/api/tasks`;
        
        let dataToSend = { ...formData };
        if (!taskIdToUpdate) {
            dataToSend.department = pageDepartment; // ★★★ 부서 정보 추가! ★★★
            dataToSend.user_id = currentUserId;
        }

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '서버 오류');
            }
            showToast(taskIdToUpdate ? '업무가 수정되었습니다.' : '새 업무가 추가되었습니다.', 'success');
            router.refresh();
            handleCloseModal();
        } catch (error) {
            console.error("업무 저장/수정 실패:", error);
            showToast(`오류: ${error.message}`, 'error');
        }
    };
    
    // ★★★★★ 2. 업무 삭제 함수 (모달에 전달) ★★★★★
    const handleDeleteTask = async (taskId) => {
        if (!taskId) return;
        if (!window.confirm("정말로 이 업무를 삭제하시겠습니까?")) return;

        try {
            const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('서버에서 삭제 실패');
            showToast('업무가 삭제되었습니다.', 'success');
            router.refresh();
            handleCloseModal();
        } catch (error) {
            console.error("업무 삭제 실패:", error);
            showToast(`삭제 실패: ${error.message}`, 'error');
        }
    };


    const handleEventDropOrResize = async (info) => {
        // ... (기존 코드는 잘 작동하므로 그대로 둡니다)
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-4 h-full">
            <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
            
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    // ★★★ 3. '일정 추가' 버튼 UI 복구 ★★★
                    right: canManageThisDepartmentCalendar ? 'addTaskButton' : ''
                }}
                customButtons={{
                    addTaskButton: {
                        text: '+ 새 업무',
                        click: () => {
                            setEditingTask(null); // 새 업무 모드
                            setIsModalOpen(true);
                        }
                    }
                }}
                locale="ko"
                events={calendarEvents}
                editable={canManageThisDepartmentCalendar}
                selectable={canManageThisDepartmentCalendar}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                eventDrop={handleEventDropOrResize}
                eventResize={handleEventDropOrResize}
                height="auto" // 부모 요소에 맞게 높이 조절
            />

            {isModalOpen && (
                <TaskModal
                    task={editingTask} // 수정할 업무 정보 전달 (이름 변경)
                    onClose={handleCloseModal}
                    onSave={handleSaveTask}
                    // ★★★ 4. 삭제 함수를 모달에 전달 ★★★
                    onDelete={handleDeleteTask} 
                    department={pageDepartment}
                    canManage={canManageThisDepartmentCalendar} // 관리 권한 여부 전달
                />
            )}
        </div>
    );
}