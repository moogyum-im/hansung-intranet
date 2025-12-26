'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { findOrCreateDirectChat } from '@/actions/chatActions';
import { 
  MessageSquare, 
  Users, 
  ChevronDown, 
  Phone, 
  ShieldCheck, 
  UserCircle2,
  Search,
  Building2
} from 'lucide-react';

// --- 상태 표시 인디케이터 ---
const StatusIndicator = ({ status }) => {
    const styles = { 
        '업무 중': 'bg-emerald-500 ring-emerald-100', 
        '오프라인': 'bg-slate-300 ring-slate-100', 
        '회의 중': 'bg-amber-500 ring-amber-100', 
        '부재 중': 'bg-rose-500 ring-rose-100' 
    };
    const text = status || '오프라인';
    const statusStyle = styles[text] || 'bg-slate-300 ring-slate-100';
    
    return (
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-md border border-slate-100">
            <span className={`h-2 w-2 rounded-full ${statusStyle} ring-4`}></span>
            <span className="text-[11px] font-bold text-slate-600">{text}</span>
        </div>
    );
};

function DepartmentAccordion({ department, employees, onEmployeeClick }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
            <button
                className={`w-full flex justify-between items-center p-5 text-left transition-colors ${
                    isOpen ? 'bg-slate-50/50' : 'hover:bg-slate-50'
                }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOpen ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Building2 size={18} />
                    </div>
                    <div>
                        <h2 className="font-black text-[15px] text-slate-800 tracking-tight">{department}</h2>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{employees.length} Members</p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/30">
                                <th className="px-6 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">성명</th>
                                <th className="px-6 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">직책</th>
                                <th className="px-6 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">연락처</th>
                                <th className="px-6 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">현재 상태</th>
                                <th className="px-6 py-3 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">액션</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-500 group-hover:bg-white transition-colors">
                                                {emp.full_name?.charAt(0)}
                                            </div>
                                            <div className="text-[14px] font-bold text-slate-700">{emp.full_name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-semibold text-slate-500">
                                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 group-hover:bg-white transition-colors">
                                            {emp.position}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-medium text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <Phone size={14} className="text-slate-300" />
                                            {emp.phone || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusIndicator status={emp.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => onEmployeeClick(emp)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5"
                                        >
                                            <MessageSquare size={14} />
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

    // ★★★ 직급 정렬 우선순위 정의 ★★★
    const positionOrder = {
        '회장': 1,
        '사장': 2,
        '부사장': 3,
        '전무': 4,
        '상무': 5,
        '이사': 6,
        '부장': 7,
        '총괄팀장': 8,
        '차장': 9,
        '과장': 10,
        '대리': 11,
        '주임': 12,
        '사원': 13,
        '기사': 14
    };

    const groupedByDepartment = useMemo(() => {
        const grouped = initialEmployees.reduce((acc, employee) => {
            const dept = employee.department || '미지정';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(employee);
            return acc;
        }, {});

        // ★★★ 부서 내에서 직급순으로 정렬 ★★★
        Object.keys(grouped).forEach(dept => {
            grouped[dept].sort((a, b) => {
                const orderA = positionOrder[a.position] || 99;
                const orderB = positionOrder[b.position] || 99;
                
                // 직급이 같으면 이름순 정렬
                if (orderA === orderB) {
                    return (a.full_name || '').localeCompare(b.full_name || '');
                }
                return orderA - orderB;
            });
        });

        return grouped;
    }, [initialEmployees]);
    
    const departmentOrder = [
        '최고 경영진', '비서실', '전략기획부', '관리부',
        '공무부', '공사부', '시설부', '장비지원부', '굴취팀'
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
        if (!currentUser?.id) {
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
        <div className="p-6 sm:p-10 bg-[#f8fafc] min-h-screen">
            <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-black text-[11px] tracking-widest uppercase mb-2">
                        <ShieldCheck size={14} /> Organization Chart
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        조직도 <Users className="text-blue-600" size={28} />
                    </h1>
                    <p className="text-slate-500 text-[14px] mt-2 font-medium">부서별 직급 순으로 정렬된 임직원 현황입니다.</p>
                </div>
                
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input 
                        type="text" 
                        placeholder="이름 또는 직책 검색..." 
                        className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all w-72 shadow-sm font-medium"
                    />
                </div>
            </header>

            <main className="max-w-7xl mx-auto space-y-4">
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