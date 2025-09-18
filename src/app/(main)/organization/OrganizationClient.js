'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { findOrCreateDirectChat } from '@/actions/chatActions';

const ChatBubbleIcon = () => ( <svg xmlns="http://www.w.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> );

const StatusIndicator = ({ status }) => {
    const styles = { '업무 중': 'bg-green-500', '오프라인': 'bg-gray-400', '회의 중': 'bg-yellow-500', '부재 중': 'bg-red-500' };
    const text = status || '오프라인';
    const bgColor = styles[text] || 'bg-gray-400';
    return (
        <div className="flex items-center text-xs text-gray-600">
            <span className={`h-2 w-2 rounded-full ${bgColor} mr-1.5`}></span>
            {text}
        </div>
    );
};

function DepartmentAccordion({ department, employees, onEmployeeClick }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <button
                className="w-full flex justify-between items-center p-4 text-left"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h2 className="font-bold text-lg text-gray-800">{department} ({employees.length}명)</h2>
                <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isOpen && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">직책</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 mr-4 flex-shrink-0">
                                                {emp.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.position}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.phone || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><StatusIndicator status={emp.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => onEmployeeClick(emp)}
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-900"
                                        >
                                            <ChatBubbleIcon />
                                            1:1 채팅
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function OrganizationClient({ initialEmployees }) {
    const { employee: currentUser } = useEmployee();
    const router = useRouter();

    const groupedByDepartment = useMemo(() => {
        return initialEmployees.reduce((acc, employee) => {
            const dept = employee.department || '미지정';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(employee);
            return acc;
        }, {});
    }, [initialEmployees]);
    
    // --- [수정] '굴취팀' 추가 ---
    const departmentOrder = [
        '최고 경영진', 
        '비서실', 
        '전략기획부', 
        '관리부',
        '공무부',
        '공사부',
        '시설부',
        '장비지원부',
        '굴취팀'
    ]; 
    
    const sortedDepartments = Object.keys(groupedByDepartment).sort((a, b) => {
        const indexA = departmentOrder.indexOf(a);
        const indexB = departmentOrder.indexOf(b);
        if (indexA > -1 && indexB > -1) return indexA - indexB;
        if (indexA > -1) return -1;
        if (indexB > -1) return 1;
        return a.localeCompare(b);
    });

    const handleEmployeeClick = async (employeeData) => {
        if (!currentUser || !currentUser.id) {
            toast.error("로그인 정보가 없습니다.");
            return;
        }
        if (currentUser.id === employeeData.id) {
            toast('자기 자신과는 채팅할 수 없습니다.');
            return;
        }

        const toastId = toast.loading('채팅방으로 이동하는 중...');
        const result = await findOrCreateDirectChat(employeeData.id);
        if (result.error) {
            toast.error(result.error, { id: toastId });
        } else if (result.roomId) {
            toast.success('채팅방으로 이동합니다.', { id: toastId });
            router.push(`/chatrooms/${result.roomId}`);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">조직도</h1>
            </header>
            <main className="space-y-6">
                {sortedDepartments.map(department => (
                    <DepartmentAccordion
                        key={department}
                        department={department}
                        employees={groupedByDepartment[department]}
                        onEmployeeClick={handleEmployeeClick}
                    />
                ))}
            </main>
        </div>
    );
}