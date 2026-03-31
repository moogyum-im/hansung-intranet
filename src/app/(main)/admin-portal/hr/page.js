'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, Search, Bell, ChevronDown, Wallet, ShieldAlert, 
  CalendarDays, RefreshCw, Loader2, Save, Building2, CalendarRange, LayoutDashboard
} from 'lucide-react';

export default function HRManagementPage() {
  const { employee, loading: authLoading } = useEmployee();
  const pathname = usePathname();
  
  const [employees, setEmployees] = useState([]);
  const [leaveRecords, setLeaveRecords] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isSaving, setIsSaving] = useState({});
  const [localLeaveData, setLocalLeaveData] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: empData, error: empError } = await supabase
        .from('profiles')
        .select('id, full_name, department, position, employment_status, total_leave_days, used_leave_days, carry_over_days')
        .eq('employment_status', '재직');

      if (empError) throw empError;
      setEmployees(empData || []);

      const initialLocalData = {};
      (empData || []).forEach(emp => {
          const carry = Number(emp.carry_over_days || 0);
          const total = Number(emp.total_leave_days || 0);
          initialLocalData[emp.id] = {
              carryOver: carry, 
              currentYear: total - carry 
          };
      });
      setLocalLeaveData(initialLocalData);

      const { data: leaveData, error: leaveError } = await supabase
        .from('approval_documents')
        .select('requester_id, content')
        .in('status', ['승인', '완료'])
        .eq('document_type', 'leave_request');

      if (!leaveError && leaveData) {
        const leaveMap = {};
        leaveData.forEach(doc => {
          try {
            const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
            if (content.startDate && content.leaveType) {
              if (!leaveMap[doc.requester_id]) leaveMap[doc.requester_id] = [];
              leaveMap[doc.requester_id].push({
                start: content.startDate,
                end: content.endDate || content.startDate,
                type: content.leaveType,
                reason: content.reason || '사유 미기재',
                days: content.requestedDays || (content.leaveType.includes('반차') ? 0.5 : null)
              });
            }
          } catch (e) {
            console.error("휴가 데이터 파싱 오류:", e);
          }
        });

        Object.keys(leaveMap).forEach(key => {
          leaveMap[key].sort((a, b) => new Date(b.start) - new Date(a.start));
        });
        setLeaveRecords(leaveMap);
      }
    } catch (error) {
      console.error(error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (employee && (employee.department === '관리부' || employee.role === 'admin')) {
      fetchData();
    }
  }, [employee, fetchData]);

  const handleLocalChange = (empId, field, value) => {
    setLocalLeaveData(prev => ({
        ...prev,
        [empId]: { ...prev[empId], [field]: value }
    }));
  };

  const handleIndividualSave = async (empId) => {
    const targetEmp = employees.find(e => e.id === empId);
    const local = localLeaveData[empId];
    if (!targetEmp || !local) return;

    const carryOver = Number(local.carryOver || 0);
    const currentYear = Number(local.currentYear || 0);
    const calculatedTotal = carryOver + currentYear;

    setIsSaving(prev => ({ ...prev, [empId]: true }));
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          carry_over_days: carryOver,
          total_leave_days: calculatedTotal,
          used_leave_days: parseFloat(targetEmp.used_leave_days || 0)
        })
        .eq('id', empId);

      if (error) throw error;
      
      setEmployees(prev => prev.map(emp => emp.id === empId ? { ...emp, carry_over_days: carryOver, total_leave_days: calculatedTotal } : emp));
      toast.success(`${targetEmp.full_name}님의 연차 정보가 저장되었습니다.`);
    } catch (error) {
      toast.error('개별 저장에 실패했습니다.');
    } finally {
      setIsSaving(prev => ({ ...prev, [empId]: false }));
    }
  };

  const handleInputChange = (empId, field, value) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === empId ? { ...emp, [field]: value } : emp
    ));
  };

  const openLeaveDetails = (empId) => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    window.open(`/admin-portal/hr/leave-details?empId=${empId}`, `LeaveDetails_${empId}`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  };

  const groupedEmployees = useMemo(() => {
    const filtered = employees.filter(emp => 
      emp.department !== '굴취팀' && 
      emp.department !== '최고 경영진' && 
      (emp.full_name?.includes(searchTerm) || emp.department?.includes(searchTerm))
    );

    const groups = filtered.reduce((acc, emp) => {
      const dept = emp.department || '미지정';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(emp);
      return acc;
    }, {});

    const priority = { '비서실': 1, '전략기획부': 2, '관리부': 3, '공무부': 4, '공사부': 5, '학림-공사부': 6, '대성-공사부': 7, '미지정': 99 };
    return Object.keys(groups)
      .sort((a, b) => (priority[a] || 99) - (priority[b] || 99) || a.localeCompare(b))
      .reduce((acc, key) => { acc[key] = groups[key]; return acc; }, {});
  }, [employees, searchTerm]);

  const formatShortDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  // 🚀 공통 네비게이션 항목
  const navItems = [
    { name: '통합 대시보드', path: '/admin-portal', icon: LayoutDashboard },
    { name: '인사 관리', path: '/admin-portal/members', icon: Users },
    { name: '연차 관리', path: '/admin-portal/hr', icon: CalendarDays },
    { name: '급여 정산', path: '/admin-portal/payroll', icon: Wallet }
  ];

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  if (!employee || (employee.department !== '관리부' && employee.role !== 'admin')) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 font-sans">
        <ShieldAlert size={64} className="text-red-400 mb-6" />
        <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">접근 권한이 없습니다</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans antialiased relative">
      {/* 🚀 공통 상단 헤더 및 탭 네비게이션 시작 */}
      <header className="bg-white border-b border-slate-200 shrink-0 z-10 flex flex-col">
        <div className="h-16 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md text-white font-black text-sm">H</div>
            <span className="font-black text-lg tracking-tight text-slate-900">경영지원 포털</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer p-1.5 pr-3 hover:bg-slate-50 rounded-full border border-transparent hover:border-slate-200 transition-colors">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-black text-xs uppercase">
                {employee?.full_name?.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-800">{employee?.full_name} {employee?.position}</span>
              </div>
              <ChevronDown size={14} className="text-slate-400 ml-1" />
            </div>
          </div>
        </div>

        <div className="px-8 flex gap-8 border-t border-slate-100 bg-slate-50/50">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/admin-portal' && pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-2 py-3.5 border-b-2 text-[13px] font-black transition-colors
                  ${isActive 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
              >
                <Icon size={16} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </header>
      {/* 🚀 공통 상단 헤더 및 탭 네비게이션 끝 */}

      <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">연차 관리</h1>
            <p className="text-sm font-bold text-slate-500">부서별 휴가 현황을 파악하고 제어합니다. (직원 클릭 시 상세 조회)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm w-72">
              <Search size={16} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="성명, 부서, 직급 검색..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 w-full placeholder:text-slate-400"
              />
            </div>
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-black rounded-xl shadow-sm transition-all active:scale-95">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 새로고침
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-lg font-black text-slate-800">부서별 직원 연차 및 휴가 일정</h3>
            <div className="text-xs font-bold text-slate-500">조회된 직원 {Object.values(groupedEmployees).flat().length}명</div>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
              <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-xs font-black text-slate-500 w-[16%] pl-6">성명 / 직급</th>
                  <th className="p-3 text-xs font-black text-slate-500 text-center w-[9%]">① 이월 (수정)</th>
                  <th className="p-3 text-xs font-black text-slate-500 text-center w-[9%]">② 당해 (수정)</th>
                  <th className="p-3 text-xs font-black text-slate-700 text-center w-[8%] bg-slate-100/50">총 연차(①+②)</th>
                  <th className="p-3 text-xs font-black text-slate-500 text-center w-[9%]">사용 (수정)</th>
                  <th className="p-3 text-xs font-black text-slate-700 text-center w-[8%] bg-slate-100/50">잔여</th>
                  <th className="p-3 text-xs font-black text-blue-600 w-[28%]"><div className="flex items-center gap-1"><CalendarRange size={14}/> 최근/예정 휴가일정</div></th>
                  <th className="p-3 text-xs font-black text-slate-500 text-center w-[13%]">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="8" className="p-10 text-center text-slate-400 font-bold">로딩 중...</td></tr>
                ) : Object.keys(groupedEmployees).length === 0 ? (
                  <tr><td colSpan="8" className="p-10 text-center text-slate-400 font-bold">조건에 맞는 직원이 없습니다.</td></tr>
                ) : (
                  Object.entries(groupedEmployees).map(([dept, deptEmployees]) => (
                    <React.Fragment key={dept}>
                      <tr className="bg-slate-100/50">
                        <td colSpan="8" className="px-5 py-3 border-y border-slate-200">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-slate-400"/>
                            <span className="text-sm font-black text-slate-700">{dept}</span>
                            <span className="text-[11px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">{deptEmployees.length}명</span>
                          </div>
                        </td>
                      </tr>
                      {deptEmployees.map((emp) => {
                        const local = localLeaveData[emp.id] || { carryOver: 0, currentYear: emp.total_leave_days || 0 };
                        const carryOver = Number(local.carryOver || 0);
                        const currentYear = Number(local.currentYear || 0);
                        
                        const total = carryOver + currentYear;
                        const used = parseFloat(Number(emp.used_leave_days || 0).toFixed(1));
                        const remain = parseFloat((total - used).toFixed(1));
                        const myLeaves = leaveRecords[emp.id] || [];
                        
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                            <td 
                              className="p-3 pl-6 cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => openLeaveDetails(emp.id)}
                              title="클릭하여 상세 휴가 내역 새 창으로 보기"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 font-black uppercase shadow-sm shrink-0">{emp.full_name.charAt(0)}</div>
                                <div className="flex flex-col truncate">
                                  <span className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors truncate">{emp.full_name}</span>
                                  <span className="text-[10px] font-bold text-slate-400">{emp.position}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                step="0.5"
                                min="0"
                                value={local.carryOver !== undefined ? local.carryOver : ''} 
                                onChange={(e) => handleLocalChange(emp.id, 'carryOver', e.target.value)} 
                                className="w-16 text-center text-xs font-black bg-transparent border border-slate-200 focus:border-blue-500 outline-none p-1.5 rounded-lg transition-colors text-slate-600"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                step="0.5"
                                min="0"
                                value={local.currentYear !== undefined ? local.currentYear : ''} 
                                onChange={(e) => handleLocalChange(emp.id, 'currentYear', e.target.value)} 
                                className="w-16 text-center text-xs font-black bg-transparent border border-slate-200 focus:border-blue-500 outline-none p-1.5 rounded-lg transition-colors text-slate-600"
                              />
                            </td>
                            <td className="p-3 text-center bg-slate-50/50">
                              <span className="text-sm font-black text-blue-700">{total}</span>
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                step="0.5"
                                min="0"
                                value={emp.used_leave_days !== undefined ? emp.used_leave_days : ''} 
                                onChange={(e) => handleInputChange(emp.id, 'used_leave_days', e.target.value)} 
                                className="w-16 text-center text-xs font-black bg-transparent border border-slate-200 focus:border-rose-500 outline-none p-1.5 rounded-lg transition-colors text-rose-600"
                              />
                            </td>
                            <td className="p-3 text-center bg-slate-50/50">
                              <span className={`text-sm font-black ${remain < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{remain}</span>
                            </td>
                            <td 
                              className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                              onClick={() => openLeaveDetails(emp.id)}
                            >
                              {myLeaves.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {myLeaves.slice(0, 2).map((leave, idx) => {
                                    const dateStr = leave.start === leave.end 
                                        ? formatShortDate(leave.start) 
                                        : `${formatShortDate(leave.start)}~${formatShortDate(leave.end)}`;
                                    const isHalf = leave.type.includes('반차');
                                    return (
                                      <div key={idx} className="flex items-center gap-1.5 text-[10px] font-black truncate">
                                        <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono shrink-0">{dateStr}</span>
                                        <span className={`${isHalf ? "text-amber-600" : "text-blue-600"} truncate`}>{leave.type}</span>
                                      </div>
                                    );
                                  })}
                                  {myLeaves.length > 2 && <span className="text-[10px] text-blue-500 font-bold pl-1 hover:underline truncate">외 {myLeaves.length - 2}건 상세 보기...</span>}
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleIndividualSave(emp.id)} disabled={isSaving[emp.id]} className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 text-xs font-black rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 w-full justify-center">
                                {isSaving[emp.id] ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} 저장
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}