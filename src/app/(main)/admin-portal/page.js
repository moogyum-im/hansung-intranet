'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Search, 
  Bell, 
  ChevronDown,
  Wallet,
  ShieldAlert,
  CalendarDays,
  RefreshCw,
  Loader2,
  Receipt,
  LayoutDashboard
} from 'lucide-react';

const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return Number(num).toLocaleString();
};

const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const match = str.toString().replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
};

export default function AdminPortalPage() {
  const { employee, loading: authLoading } = useEmployee();
  const pathname = usePathname();
  
  const [employees, setEmployees] = useState([]);
  const [totalPayroll, setTotalPayroll] = useState(0);
  
  // 🚀 귀속월과 지급월을 명확하게 분리하여 상태로 관리
  const [payrollDisplay, setPayrollDisplay] = useState({ workMonth: '-', payMonth: '-' });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, position, employment_status, role')
        .eq('employment_status', '재직')
        .order('department', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error(error);
      toast.error('직원 데이터를 불러오는데 실패했습니다.');
    }
  }, []);

  const fetchPayrollData = useCallback(async () => {
    try {
      const { data: latestData, error: latestError } = await supabase
        .from('payroll_records')
        .select('payment_month')
        .order('payment_month', { ascending: false })
        .limit(1);

      if (latestError) throw latestError;

      if (latestData && latestData.length > 0) {
        const targetMonth = latestData[0].payment_month; // 예: "2026-04"
        
        // 🚀 익월 10일 지급 로직 자동 계산
        const [year, month] = targetMonth.split('-');
        const workMonthNum = Number(month);
        const payMonthNum = workMonthNum === 12 ? 1 : workMonthNum + 1;
        
        setPayrollDisplay({ workMonth: workMonthNum, payMonth: payMonthNum });

        const { data, error } = await supabase
          .from('payroll_records')
          .select('net_pay')
          .eq('payment_month', targetMonth);

        if (error) throw error;

        if (data && data.length > 0) {
          const total = data.reduce((sum, record) => sum + parseNumber(record.net_pay), 0);
          setTotalPayroll(total);
        } else {
          setTotalPayroll(0);
        }
      } else {
        setTotalPayroll(0);
        // DB에 데이터가 아예 없을 경우 당월 기준으로 임시 표기
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        setPayrollDisplay({ workMonth: currentMonth, payMonth: nextMonth });
      }
    } catch (error) {
      console.error('급여 데이터를 불러오는데 실패했습니다.', error);
      setTotalPayroll(0);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchEmployees(), fetchPayrollData()]);
    setLoading(false);
  }, [fetchEmployees, fetchPayrollData]);

  useEffect(() => {
    if (employee && (employee.department === '관리부' || employee.role === 'admin')) {
      loadDashboardData();
    }
  }, [employee, loadDashboardData]);

  const filteredEmployees = employees.filter(emp => 
    emp.full_name?.includes(searchTerm) || 
    emp.department?.includes(searchTerm)
  );

  const openHrProfile = (empId) => {
    const width = 1100;
    const height = 850;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    window.open(`/admin-portal/hr/profile?empId=${empId}`, `HRProfile_${empId}`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
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
        <p className="text-slate-500 font-bold">관리부 소속 직원 또는 최고 관리자만 열람할 수 있는 보안 페이지입니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans antialiased">
      
      <header className="bg-white border-b border-slate-200 shrink-0 z-10 flex flex-col">
        <div className="h-16 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md text-white font-black text-sm">H</div>
            <span className="font-black text-lg tracking-tight text-slate-900">경영지원 포털</span>
          </div>

          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-full w-96 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all border border-transparent focus-within:border-blue-200">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="사원명 또는 부서 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 w-full placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} strokeWidth={2.5} />
            </button>
            <div className="w-px h-5 bg-slate-200" />
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">통합 대시보드</h1>
            <p className="text-sm font-bold text-slate-500">인사 및 급여 현황을 한눈에 파악하세요.</p>
          </div>
          <button onClick={loadDashboardData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-black rounded-xl shadow-sm transition-all active:scale-95">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 데이터 동기화
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Users size={24} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-400 mb-1">총 재직 인원</span>
                <span className="text-3xl font-black text-slate-800">{employees.length} <span className="text-lg text-slate-500">명</span></span>
              </div>
            </div>
            <Link href="/admin-portal/members" className="text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors">인사 관리 가기</Link>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <Receipt size={24} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                {/* 🚀 명확한 귀속월 및 지급일 표기 UI */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-400">급여 지급 예정액</span>
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">
                    {payrollDisplay.workMonth}월 귀속 → {payrollDisplay.payMonth}월 10일 지급
                  </span>
                </div>
                <span className="text-3xl font-black text-slate-800">₩ {formatNumber(totalPayroll)}</span>
              </div>
            </div>
            <Link href="/admin-portal/payroll" className="text-xs font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl transition-colors">급여 정산 가기</Link>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-slate-700" />
              <h3 className="text-lg font-black text-slate-800">임직원 인사 현황 요약</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">클릭 시 상세 인사 카드 열람</span>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest w-1/3">성명 / 직급</th>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest w-1/3 text-center">소속 부서</th>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest text-right w-1/3">권한 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="3" className="p-12 text-center text-slate-400 font-bold"><Loader2 size={24} className="animate-spin mx-auto text-blue-500 mb-2"/>데이터를 불러오는 중입니다...</td></tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr><td colSpan="3" className="p-12 text-center text-slate-400 font-bold">조건에 맞는 직원이 없습니다.</td></tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr 
                      key={emp.id} 
                      onClick={() => openHrProfile(emp.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-black text-sm uppercase shadow-sm border border-slate-200 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            {emp.full_name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{emp.full_name}</span>
                            <span className="text-[11px] font-bold text-slate-400">{emp.position}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 px-6 text-center">
                        <span className="text-sm font-bold text-slate-600 bg-slate-100 px-4 py-1.5 rounded-lg border border-slate-200">{emp.department || '미지정'}</span>
                      </td>
                      <td className="p-4 px-6 text-right">
                        <span className={`text-xs font-black px-4 py-1.5 rounded-lg border ${emp.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {emp.role === 'admin' ? '관리자 권한' : '일반 사용자'}
                        </span>
                      </td>
                    </tr>
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