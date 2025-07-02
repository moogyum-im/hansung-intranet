// src/components/TaskModal.jsx
"use client";

import { useState, useEffect } from 'react';
import styles from './TaskModal.module.css'; // CSS Modules 파일 (아래에 CSS 코드 제공)

export default function TaskModal({ taskToEdit, initialDate, onClose, onSave, department, isLoading /*, projects */ }) {
    const getInitialEndDate = (startDateStr) => {
        if (!startDateStr) return '';
        // 시작일에 하루를 더한 날짜를 기본 종료일로 설정 (선택적)
        const startDate = new Date(startDateStr);
        startDate.setDate(startDate.getDate() + 1);
        return startDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    };

    const initialFormState = {
        title: '',
        start_date: initialDate || new Date().toISOString().split('T')[0], // 오늘 날짜 또는 클릭한 날짜
        end_date: initialDate ? getInitialEndDate(initialDate) : new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
        project_id: '', // 또는 기본값
        status: '진행 예정', // 기본 상태
        // department: department, // 부서는 props로 받아오므로 폼 데이터에 포함 불필요 (onSave 시 함께 전달)
        // remarks: '', // 비고 필드가 있다면 추가
    };

    const [formData, setFormData] = useState(initialFormState);
    const isEditMode = Boolean(taskToEdit && taskToEdit.id); // taskToEdit와 taskToEdit.id 둘 다 있어야 수정 모드

    useEffect(() => {
        if (isEditMode) {
            setFormData({
                title: taskToEdit.title || '',
                start_date: taskToEdit.start_date ? taskToEdit.start_date.split('T')[0] : '', // 시간 부분 제거
                end_date: taskToEdit.end_date ? taskToEdit.end_date.split('T')[0] : '',     // 시간 부분 제거
                project_id: taskToEdit.project_id || '',
                status: taskToEdit.status || '진행 예정',
                // remarks: taskToEdit.remarks || '',
            });
        } else if (initialDate) { // 새 업무 추가인데, 특정 날짜를 클릭해서 들어온 경우
            setFormData({
                ...initialFormState,
                start_date: initialDate,
                end_date: getInitialEndDate(initialDate), // 시작일 기준으로 기본 종료일 설정
            });
        }
        else { // 순수 새 업무 추가
             setFormData(initialFormState);
        }
    }, [taskToEdit, initialDate, isEditMode]); // isEditMode도 의존성에 추가

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title) {
            alert('업무 제목은 필수 입력 항목입니다.');
            return;
        }
        if (!formData.start_date) {
             alert('시작일은 필수 입력 항목입니다.');
             return;
        }
        // onSave에 isEditMode 여부나 taskId를 전달하여 구분할 수도 있음
        // WorkCalendar의 handleSaveTask는 taskId 유무로 구분하므로 id 전달
        onSave(formData, taskToEdit?.id);
    };

    // 프로젝트 목록이 있다면 선택 UI를 만들 수 있습니다.
    // const projectOptions = projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2>{isEditMode ? '업무 수정' : '새 업무 추가'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="title">업무 제목 <span className={styles.required}>*</span></label>
                        <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
                    </div>

                    <div className={styles.dateGroup}>
                        <div className={styles.formGroup}>
                            <label htmlFor="start_date">시작일 <span className={styles.required}>*</span></label>
                            <input type="date" id="start_date" name="start_date" value={formData.start_date} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="end_date">종료일</label>
                            <input type="date" id="end_date" name="end_date" value={formData.end_date} onChange={handleChange} />
                        </div>
                    </div>
                    
                    {/* 선택사항: 프로젝트 선택 (initialGroups를 projects prop으로 받아야 함) */}
                    {/* <div className={styles.formGroup}>
                        <label htmlFor="project_id">프로젝트</label>
                        <select id="project_id" name="project_id" value={formData.project_id} onChange={handleChange}>
                            <option value="">프로젝트 선택 안 함</option>
                            {projectOptions}
                        </select>
                    </div> */}

                    <div className={styles.formGroup}>
                        <label htmlFor="status">상태</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange}>
                            <option value="진행 예정">진행 예정</option>
                            <option value="진행 중">진행 중</option>
                            <option value="완료">완료</option>
                            <option value="보류">보류</option>
                        </select>
                    </div>
                    
                    {/* <div className={styles.formGroup}>
                        <label htmlFor="remarks">비고</label>
                        <textarea id="remarks" name="remarks" value={formData.remarks} onChange={handleChange} rows="3"></textarea>
                    </div> */}
                    
                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} disabled={isLoading} className={styles.cancelButton}>취소</button>
                        <button type="submit" disabled={isLoading} className={styles.saveButton}>
                            {isLoading ? (
                                <span className={styles.buttonSpinner}></span>
                            ) : (
                                isEditMode ? '수정하기' : '추가하기'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}