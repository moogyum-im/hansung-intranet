'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, Search, Bell, ChevronDown, Wallet, ShieldAlert, 
  CalendarDays, RefreshCw, Loader2, Mail, Phone, LayoutDashboard,
  UserCheck, UserMinus, UserX, X
} from 'lucide-react';

export default function MembersManagementPage() {
  const { employee, loading: authLoading } = useEmployee();
  const pathname = usePathname();
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🚀 탭 상태 (active: 재직자, resigned: 퇴사자)
  const [activeTab, setActiveTab] = useState('active');

  // 🚀 퇴사 처리 모달 상태
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [targetEmp, setTargetEmp] = useState(null);
  const [resignDate, setResignDate] = useState('');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // 재직/퇴사자 모두 불러옴
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('department', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      toast.error('직원 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (employee && (employee.department === '관리부' || employee.role === 'admin')) {
      fetchEmployees();
    }
  }, [employee, fetchEmployees]);

  // 선택된 탭과 검색어에 따라 직원 필터링
  const filteredEmployees = employees.filter(emp => {
    const isMatchTab = activeTab === 'active' ? emp.employment_status === '재직' : emp.employment_status === '퇴사';
    const isMatchSearch = emp.full_name?.includes(searchTerm) || emp.department?.includes(searchTerm) || emp.position?.includes(searchTerm);
    return isMatchTab && isMatchSearch;
  });

  const activeCount = employees.filter(e => e.employment_status === '재직').length;
  const resignedCount = employees.filter(e => e.employment_status === '퇴사').length;

  const openHrProfile = (empId) => {
    const width = 1100;
    const height = 850;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    window.open(`/admin-portal/hr/profile?empId=${empId}`, `HRProfile_${empId}`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  };

  // 🚀 퇴사 처리 모달 열기
  const openResignModal = (emp) => {
    setTargetEmp(emp);
    setResignDate(new Date().toISOString().split('T')[0]); // 기본값: 오늘 날짜
    setIsResignModalOpen(true);
  };

  // 🚀 퇴사 처리 실행 로직
  const handleResignSubmit = async () => {
    if (!resignDate) return toast.error("퇴사일을 입력해 주세요.");
    
    // 미사용 연차 계산
    const total = Number(targetEmp.total_leave_days || 0);
    const used = Number(targetEmp.used_leave_days || 0);
    const unused = Math.max(total - used, 0);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          employment_status: '퇴사',
          resignation_date: resignDate,
          unused_leave_days: unused
        })
        .eq('id', targetEmp.id);

      if (error) throw error;

      toast.success(`${targetEmp.full_name} 님의 퇴사 처리가 완료되었습니다.`);
      setIsResignModalOpen(false);
      fetchEmployees(); // 데이터 갱신
    } catch (error) {
      console.error(error);
      toast.error('퇴사 처리에 실패했습니다.');
    }
  };

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
      <Toaster position="top-right" />
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

      <main className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">인사 관리</h1>
            <p className="text-sm font-bold text-slate-500">임직원의 상세 프로필과 인사 이력을 관리합니다.</p>
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
            <button onClick={fetchEmployees} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-black rounded-xl shadow-sm transition-all active:scale-95">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 새로고침
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* 🚀 재직자 / 퇴사자 탭 메뉴 */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all
                ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
            >
              <UserCheck size={18} /> 재직 중인 직원 ({activeCount})
            </button>
            <button
              onClick={() => setActiveTab('resigned')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all
                ${activeTab === 'resigned' ? 'bg-white text-rose-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
            >
              <UserX size={18} /> 퇴사한 직원 ({resignedCount})
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest w-[25%]">성명 / 직무</th>
                  {activeTab === 'active' ? (
                    <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest w-[15%]">입사일</th>
                  ) : (
                    <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest w-[15%]">퇴사일</th>
                  )}
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest w-[20%]">연락처 / 이메일</th>
                  {activeTab === 'resigned' ? (
                    <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center w-[15%]">미사용 연차</th>
                  ) : (
                    <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center w-[15%]">상태</th>
                  )}
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center w-[25%]">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="5" className="p-12 text-center text-slate-400 font-bold"><Loader2 size={24} className="animate-spin mx-auto text-blue-500 mb-2"/>데이터 로딩중...</td></tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr><td colSpan="5" className="p-12 text-center text-slate-400 font-bold">해당하는 직원이 없습니다.</td></tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border ${activeTab === 'active' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                            {emp.full_name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-base font-black transition-colors cursor-pointer ${activeTab === 'active' ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} onClick={() => openHrProfile(emp.id)}>{emp.full_name}</span>
                            <span className="text-[11px] font-bold text-slate-500 mt-0.5">{emp.department} · {emp.position}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 px-6">
                        {activeTab === 'active' ? (
                          <span className="text-sm font-bold text-slate-700">{emp.hire_date || '-'}</span>
                        ) : (
                          <span className="text-sm font-black text-rose-600">{emp.resignation_date || '-'}</span>
                        )}
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-500">
                          <span className="flex items-center gap-1.5"><Phone size={12}/> {emp.phone || '미등록'}</span>
                          <span className="flex items-center gap-1.5"><Mail size={12}/> {emp.email || '미등록'}</span>
                        </div>
                      </td>
                      <td className="p-4 px-6 text-center">
                        {activeTab === 'active' ? (
                          <span className="text-xs font-black bg-blue-50 text-blue-600 px-4 py-1.5 rounded-lg border border-blue-100 inline-block">
                            {emp.employment_status}
                          </span>
                        ) : (
                          <span className="text-xs font-black bg-slate-100 text-slate-600 px-4 py-1.5 rounded-lg border border-slate-200 inline-block">
                            {emp.unused_leave_days || 0} 일
                          </span>
                        )}
                      </td>
                      <td className="p-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openHrProfile(emp.id)} 
                            className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition-all shadow-sm"
                          >
                            인사 카드
                          </button>
                          {/* 🚀 재직 중인 직원일 경우 퇴사 처리 버튼 노출 */}
                          {activeTab === 'active' && (
                            <button 
                              onClick={() => openResignModal(emp)} 
                              className="px-4 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <UserMinus size={14}/> 퇴사 처리
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 🚀 퇴사 처리 확인 모달 */}
      {isResignModalOpen && targetEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-rose-600">
                <UserMinus size={20} strokeWidth={2.5} />
                <h3 className="text-lg font-black">직원 퇴사 처리</h3>
              </div>
              <button onClick={() => setIsResignModalOpen(false)} className="text-rose-400 hover:text-rose-600"><X size={20}/></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 font-black text-lg">
                  {targetEmp.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">{targetEmp.full_name} <span className="text-sm text-slate-500">{targetEmp.position}</span></p>
                  <p className="text-xs font-bold text-slate-500">{targetEmp.department}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">퇴사 일자 (마지막 근무일)</label>
                  <input 
                    type="date" 
                    value={resignDate} 
                    onChange={(e) => setResignDate(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-rose-400 text-slate-700 shadow-sm"
                  />
                </div>
                
                <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-xl shadow-inner">
                  <span className="text-sm font-bold text-slate-300">정산될 미사용 연차</span>
                  <span className="text-xl font-black text-blue-400">
                    {Math.max(Number(targetEmp.total_leave_days || 0) - Number(targetEmp.used_leave_days || 0), 0)} <span className="text-sm text-slate-400">일</span>
                  </span>
                </div>
                <p className="text-[11px] font-bold text-rose-500 leading-relaxed bg-rose-50 p-3 rounded-lg border border-rose-100">
                  ※ 퇴사 처리 시 해당 직원의 인트라넷 로그인이 즉시 차단되며, 미사용 연차는 위 일수로 영구 기록됩니다.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2 bg-slate-50">
              <button 
                onClick={() => setIsResignModalOpen(false)} 
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black hover:bg-slate-100 transition-all shadow-sm"
              >
                취소
              </button>
              <button 
                onClick={handleResignSubmit} 
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
              >
                퇴사 처리 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}