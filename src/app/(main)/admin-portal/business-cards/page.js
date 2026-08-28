'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, ChevronDown, Wallet, ShieldAlert,
  CalendarDays, RefreshCw, Loader2, LayoutDashboard, CreditCard, Check
} from 'lucide-react';

export default function BusinessCardRequestsPage() {
  const { employee, loading: authLoading } = useEmployee();
  const pathname = usePathname();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_card_requests')
        .select('id, quantity, notes, status, created_at, user:profiles!user_id(id, full_name, department, position)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error(error);
      toast.error('명함 신청 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (employee?.full_name === '임아름') fetchRequests();
  }, [employee, fetchRequests]);

  const toggleStatus = async (req) => {
    const nextStatus = req.status === 'completed' ? 'pending' : 'completed';
    try {
      const { error } = await supabase
        .from('business_card_requests')
        .update({ status: nextStatus })
        .eq('id', req.id);
      if (error) throw error;
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: nextStatus } : r));
      toast.success(nextStatus === 'completed' ? '완료 처리했습니다.' : '대기 상태로 되돌렸습니다.');
    } catch (error) {
      console.error(error);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const navItems = [
    { name: '통합 대시보드', path: '/admin-portal', icon: LayoutDashboard },
    { name: '인사 관리', path: '/admin-portal/members', icon: Users },
    { name: '연차 관리', path: '/admin-portal/hr', icon: CalendarDays },
    { name: '급여 정산', path: '/admin-portal/payroll', icon: Wallet },
    { name: '명함 신청', path: '/admin-portal/business-cards', icon: CreditCard },
  ];

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  if (!employee || employee.full_name !== '임아름') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 font-sans">
        <ShieldAlert size={64} className="text-red-400 mb-6" />
        <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">접근 권한이 없습니다</h2>
        <p className="text-slate-500 font-bold">이 페이지는 담당자만 열람할 수 있습니다.</p>
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.status !== 'completed').length;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans antialiased">
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">명함 신청 관리</h1>
            <p className="text-sm font-bold text-slate-500">직원들의 명함 재발급 신청 내역입니다. (대기 {pendingCount}건)</p>
          </div>
          <button onClick={fetchRequests} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-black rounded-xl shadow-sm transition-all active:scale-95">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 새로고침
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-4">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest">신청자</th>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">부서 / 직급</th>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">수량</th>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest">메모</th>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">신청일</th>
                  <th className="p-4 px-6 text-[12px] font-black text-slate-400 uppercase tracking-widest text-right">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold"><Loader2 size={24} className="animate-spin mx-auto text-blue-500 mb-2" />불러오는 중입니다...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold">신청 내역이 없습니다.</td></tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 px-6">
                        <span className="text-sm font-black text-slate-900">{req.user?.full_name || '알 수 없음'}</span>
                      </td>
                      <td className="p-4 px-6 text-center">
                        <span className="text-xs font-bold text-slate-500">{req.user?.department} {req.user?.position}</span>
                      </td>
                      <td className="p-4 px-6 text-center">
                        <span className="text-sm font-bold text-slate-700">{req.quantity}매</span>
                      </td>
                      <td className="p-4 px-6">
                        <span className="text-xs font-medium text-slate-500">{req.notes || '-'}</span>
                      </td>
                      <td className="p-4 px-6 text-center">
                        <span className="text-xs font-bold text-slate-500">{new Date(req.created_at).toLocaleDateString('ko-KR')}</span>
                      </td>
                      <td className="p-4 px-6 text-right">
                        <button
                          onClick={() => toggleStatus(req)}
                          className={`inline-flex items-center gap-1.5 text-xs font-black px-4 py-1.5 rounded-lg border transition-colors ${
                            req.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
                          }`}
                        >
                          {req.status === 'completed' ? <><Check size={12} /> 완료</> : '대기중'}
                        </button>
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
