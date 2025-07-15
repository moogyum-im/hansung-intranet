// 파일 경로: src/app/(main)/organization/OrganizationClient.jsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { findOrCreateDirectChat } from '@/actions/chatActions';

// 자식 컴포넌트 1: 상태 아이콘
const StatusIcon = ({ status }) => {
    const statusMap = { '업무 중': { color: 'bg-green-500', text: '업무 중' }, '회의 중': { color: 'bg-blue-500', text: '회의 중' }, '외근 중': { color: 'bg-yellow-500', text: '외근' }, '식사 중': { color: 'bg-orange-500', text: '식사 중' }, '자리 비움': { color: 'bg-purple-500', text: '자리 비움' }, '연차 중': { color: 'bg-gray-400', text: '연차' },};
    const currentStatus = statusMap[status] || statusMap['업무 중'];
    return (
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${currentStatus.color}`}></span>
        <span className="text-xs text-gray-500">{currentStatus.text}</span>
      </div>
    );
};
  
// 자식 컴포넌트 2: 직원 정보 카드
const EmployeeCard = ({ employee, onChat }) => {
    return (
      <div className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">{employee.full_name?.charAt(0) || 'U'}</div>
          <div>
            <p className="font-semibold text-sm text-gray-800">{employee.full_name}</p>
            <p className="text-xs text-gray-500">{employee.position}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusIcon status={employee.status} />
          <button onClick={() => onChat(employee.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-green-500 text-white px-2 py-1 rounded-md">1:1 채팅</button>
        </div>
      </div>
    );
};

// 메인 클라이언트 컴포넌트
export default function OrganizationClient({ initialEmployees }) {
    const [employees, setEmployees] = useState(initialEmployees || []);
    const [loading, setLoading] = useState(!initialEmployees);
    const [chatLoading, setChatLoading] = useState(false);
    const [openDepartments, setOpenDepartments] = useState({});
    
    const departmentOrder = ['최고 경영진', '비서실', '전략기획부', '관리부', '공무부', '공사부'];
    
    // 직급 순서 정의 (더 많은 직급이 있다면 여기에 추가하세요)
    const positionOrder = {
        '회장': 0,
        '대표': 1,
        '이사': 2,
        '총괄팀장': 3,
        '부장': 4,
        '차장': 5,
        '과장': 6,
        '대리': 7,
        '사원': 8,

    };

    // 부서별 그룹화 및 정렬 로직
    const employeesByDepartment = useMemo(() => {
        const grouped = employees.reduce((acc, employee) => {
            const dept = employee.department || '미배정';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(employee);
            return acc;
        }, {});

        // 각 부서 내의 직원들을 직급 순서에 따라 정렬
        for (const dept in grouped) {
            grouped[dept].sort((a, b) => {
                const orderA = positionOrder[a.position] !== undefined ? positionOrder[a.position] : positionOrder['미정'];
                const orderB = positionOrder[b.position] !== undefined ? positionOrder[b.position] : positionOrder['미정'];
                
                // 같은 직급이면 이름으로 한번 더 정렬 (선택 사항)
                if (orderA === orderB) {
                    return (a.full_name || '').localeCompare(b.full_name || '');
                }
                return orderA - orderB;
            });
        }

        const sortedGrouped = {};
        departmentOrder.forEach(deptName => {
            if (grouped[deptName]) sortedGrouped[deptName] = grouped[deptName];
        });
        Object.keys(grouped).forEach(deptName => {
            if (!sortedGrouped[deptName]) sortedGrouped[deptName] = grouped[deptName];
        });
        return sortedGrouped;
    }, [employees]);
    
    // 초기 아코디언 상태 설정
    useEffect(() => {
        const allDepts = Object.keys(employeesByDepartment);
        const initialOpenState = allDepts.reduce((acc, dept) => ({ ...acc, [dept]: true }), {});
        setOpenDepartments(initialOpenState);
    }, [employeesByDepartment]);

    // 아코디언 토글 함수
    const toggleDepartment = (dept) => { setOpenDepartments(prev => ({ ...prev, [dept]: !prev[dept] })); };
    
    // 1:1 채팅 시작 함수
    const handleStartChat = async (targetUserId) => {
        setChatLoading(true);
        try {
            await findOrCreateDirectChat(targetUserId);
        } catch (error) {
            console.log("Redirect 중 발생한 에러(정상일 수 있음):", error);
            // 에러 발생 시에도 로딩 상태를 해제하여 UI가 멈추지 않도록 합니다.
            setTimeout(() => setChatLoading(false), 2000); 
        }
    };

    // 로딩 중 UI
    if (loading) {
        return <div className="p-8 text-center text-gray-500">조직도 정보를 불러오는 중입니다...</div>;
    }
  
    // 최종 렌더링 UI
    return (
        <div className="h-full overflow-y-auto p-6 md:p-8">
            {chatLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="text-white text-lg font-semibold animate-pulse">채팅방에 입장합니다...</div>
                </div>
            )}
            <h1 className="text-3xl font-bold mb-8 text-gray-800">조직도</h1>
            <div className="space-y-6">
                {Object.entries(employeesByDepartment).map(([department, members]) => (
                    <div key={department} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <button onClick={() => toggleDepartment(department)} className="w-full flex justify-between items-center p-4 bg-white border-b hover:bg-gray-50">
                            <h2 className="text-xl font-semibold text-gray-800">{department} <span className="text-base font-normal text-gray-500">({members.length}명)</span></h2>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-gray-400 transform transition-transform duration-300 ${openDepartments[department] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {openDepartments[department] && (
                            <div className="p-2 space-y-1">
                                {members.map(employee => (<EmployeeCard key={employee.id} employee={employee} onChat={handleStartChat} />))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}