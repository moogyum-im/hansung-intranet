// 파일 경로: src/components/TaskModal.js
"use client";

import { useState, useEffect } from 'react';

export default function TaskModal({ 
    task,      // 수정할 업무 데이터 (없으면 null)
    onClose,   // 모달 닫기 함수
    onSave,    // 업무 저장/수정 함수
    onDelete,  // 업무 삭제 함수
    canManage, // 현재 사용자가 이 일정을 관리할 수 있는지 여부
    isLoading  // 상위 컴포넌트의 로딩 상태
}) {
    // task 데이터가 변경될 때마다 내부 state를 초기화
    const [formData, setFormData] = useState({
        title: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                start_date: task.start_date ? task.start_date.split('T')[0] : '',
                end_date: task.end_date ? task.end_date.split('T')[0] : ''
            });
        } else {
            // 새 업무 모드일 때 state 초기화
            setFormData({ title: '', start_date: '', end_date: '' });
        }
    }, [task]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ★★★ 빠져있던 handleSave 함수 정의 ★★★
    const handleSave = () => {
        // 부모 컴포넌트(WorkCalendar)로부터 받은 onSave 함수를 호출
        onSave(formData);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                <h2 className="text-xl font-bold mb-4">{task?.id ? "업무 수정/상세" : "새 업무 등록"}</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">업무명</label>
                        <input type="text" name="title" id="title" value={formData.title} onChange={handleChange}
                               className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                               disabled={!canManage} // 관리 권한 없으면 비활성화
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">시작일</label>
                            <input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange}
                                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                   disabled={!canManage}
                            />
                        </div>
                        <div>
                            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">마감일</label>
                            <input type="date" name="end_date" id="end_date" value={formData.end_date} onChange={handleChange}
                                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                   disabled={!canManage}
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-between items-center">
                    <div>
                        {/* 수정 모드이고, 관리 권한이 있을 때만 삭제 버튼 표시 */}
                        {task?.id && canManage && (
                            <button 
                                onClick={() => onDelete(task.id)}
                                type="button" 
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                disabled={isLoading}
                            >
                                삭제
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} type="button" className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300" disabled={isLoading}>
                            취소
                        </button>
                        {/* 관리 권한이 있을 때만 저장 버튼 활성화 */}
                        {canManage && (
                            <button onClick={handleSave} type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300" disabled={isLoading}>
                                {isLoading ? "저장 중..." : "저장"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}