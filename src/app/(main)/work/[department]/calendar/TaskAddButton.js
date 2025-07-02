"use client";
import { useState } from 'react';
import TaskModal from '@/components/TaskModal';
// ★★★ 바로 이 부분입니다! ★★★
// 어떤 경로에 있든, 이제는 @/actions/ 로 시작하는 절대 경로를 사용하므로
// 파일 위치가 바뀌어도 코드를 수정할 필요가 없습니다.
import { addTaskAction } from '@/actions/tasksActions'; 
import { useRouter } from 'next/navigation';

export default function TaskAddButton({ department }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    const handleSaveTask = async (formData) => {
        const result = await addTaskAction(department, formData);
        if(result.error) {
            alert("업무 등록 실패: " + result.error);
        } else {
            alert("새로운 업무가 등록되었습니다.");
            setIsModalOpen(false);
            // 페이지를 새로고침하여 간트 차트를 즉시 업데이트합니다.
            router.refresh(); 
        }
    };

    return (
        <>
            <button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
            >
                업무 등록
            </button>
            {isModalOpen && 
                <TaskModal 
                    department={department} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSaveTask} 
                />
            }
        </>
    )
}