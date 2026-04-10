'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, Search, Bell, ChevronDown, Wallet, ShieldAlert, 
  CalendarDays, RefreshCw, Loader2, Eye, FileEdit, SendHorizontal, LayoutDashboard,
  Save, X
} from 'lucide-react';

const formatCurrency = (num) => num ? Number(num).toLocaleString('ko-KR') : '';

export default function PayrollManagementPage() {
    const { employee, loading: authLoading } = useEmployee();
    const pathname = usePathname();
    
    const [employees, setEmployees] = useState([]);
    const [payrollData, setPayrollData] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [targetMonth, setTargetMonth] = useState('2026-03');

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importSourceMonth, setImportSourceMonth] = useState('');
    const [sourceRecords, setSourceRecords] = useState([]);
    const [selectedImportIds, setSelectedImportIds] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: empData } = await supabase.from('profiles').select('id, full_name, department, position').eq('employment_status', '재직').order('department');
            const { data: payData } = await supabase.from('payroll_records').select('*').eq('payment_month', targetMonth);
            
            setEmployees(empData || []);
            const initialData = {};
            empData.forEach(emp => {
                const d = payData?.find(p => p.employee_id === emp.id) || { is_published: false, viewed_at: null };
                initialData[emp.id] = { ...d, employee_id: emp.id, payment_month: targetMonth };
            });
            setPayrollData(initialData);
        } catch (e) { 
            toast.error('데이터 로드 실패'); 
        } finally { 
            setLoading(false); 
        }
    }, [targetMonth]);

    useEffect(() => { if (employee) fetchData(); }, [fetchData, employee]);

    useEffect(() => {
        const handleFocus = () => fetchData();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchData]);

    useEffect(() => {
        const fetchSourceRecords = async () => {
            if (!importSourceMonth) {
                setSourceRecords([]);
                setSelectedImportIds([]);
                return;
            }
            const { data } = await supabase.from('payroll_records').select('*').eq('payment_month', importSourceMonth);
            setSourceRecords(data || []);
            setSelectedImportIds((data || []).map(r => r.employee_id));
        };
        fetchSourceRecords();
    }, [importSourceMonth]);

    const toggleImportSelection = (empId) => {
        setSelectedImportIds(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
    };

    const toggleAllImport = () => {
        if (selectedImportIds.length === sourceRecords.length) setSelectedImportIds([]);
        else setSelectedImportIds(sourceRecords.map(r => r.employee_id));
    };

    const executeImport = async () => {
        if (selectedImportIds.length === 0) return toast.error('가져올 직원을 선택해주세요.');
        setIsImporting(true);
        try {
            const recordsToImport = sourceRecords.filter(r => selectedImportIds.includes(r.employee_id));
            const { data: targetRecords } = await supabase.from('payroll_records').select('id, employee_id').eq('payment_month', targetMonth);
            
            const payload = recordsToImport.map(record => {
                const existing = targetRecords?.find(t => t.employee_id === record.employee_id);
                const { id, created_at, payment_month, is_published, viewed_at, ...rest } = record;
                
                return {
                    ...(existing ? { id: existing.id } : {}),
                    ...rest,
                    employee_id: record.employee_id,
                    payment_month: targetMonth,
                    is_published: false,
                    viewed_at: null
                };
            });

            const { error } = await supabase.from('payroll_records').upsert(payload);
            if (error) throw error;
            
            toast.success('급여 데이터 불러오기 완료');
            setIsImportModalOpen(false);
            setImportSourceMonth('');
            fetchData();
        } catch (e) {
            toast.error('불러오기 중 오류가 발생했습니다.');
        } finally {
            setIsImporting(false);
        }
    };

    const publishOne = async (empId, isPublished) => {
        const confirmMsg = isPublished 
            ? '이미 발송된 명세서입니다. 직원에게 다시 알림을 보내고 재발송하시겠습니까?' 
            : '명세서를 발송하시겠습니까?';
            
        if (!confirm(confirmMsg)) return;
        
        try {
            await supabase.from('payroll_records')
                .update({ is_published: true, viewed_at: null })
                .match({ employee_id: empId, payment_month: targetMonth });
                
            fetchData();
            toast.success(isPublished ? '재발송 완료' : '발송 완료');
        } catch (error) {
            toast.error('발송 중 오류가 발생했습니다.');
        }
    };

    const filtered = employees.filter(e => e.full_name.includes(searchTerm));

    const navItems = [
      { name: '통합 대시보드', path: '/admin-portal', icon: LayoutDashboard },
      { name: '인사 관리', path: '/admin-portal/members', icon: Users },
      { name: '연차 관리', path: '/admin-portal/hr', icon: CalendarDays },
      { name: '급여 정산', path: '/admin-portal/payroll', icon: Wallet }
    ];

    if (authLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-600" /></div>;

    if (!employee || (employee.department !== '관리부' && employee.role !== 'admin')) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 font-sans">
          <ShieldAlert size={64} className="text-red-400 mb-6" />
          <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">접근 권한이 없습니다</h2>
        </div>
      );
    }

    return (
        <div className="flex flex-col h-screen bg-white font-sans text-slate-800 antialiased relative">
            <Toaster position="top-right" />

            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 font-sans">
                    <div className="bg-white p-6 max-w-md w-full font-black border-4 border-slate-900 shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-3">
                            <h3 className="text-lg uppercase tracking-tight text-slate-900">전월 급여 불러오기</h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                        </div>
                        
                        <div className="mb-4">
                            <label className="text-[11px] uppercase text-slate-500 block mb-1">불러올 기준 월 선택</label>
                            <input type="month" className="w-full p-2.5 border border-slate-300 outline-none focus:border-blue-500 font-bold bg-slate-50" value={importSourceMonth} onChange={e=>setImportSourceMonth(e.target.value)} />
                        </div>

                        {importSourceMonth && (
                            <div className="flex-1 overflow-y-auto min-h-[250px] border border-slate-200 mb-6 p-2 custom-scrollbar bg-slate-50/50">
                                {sourceRecords.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-xs py-10">해당 월에 등록된 급여 데이터가 없습니다.</div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 p-2.5 border-b border-slate-200 hover:bg-white cursor-pointer bg-slate-100 mb-1" onClick={toggleAllImport}>
                                            <input type="checkbox" readOnly checked={selectedImportIds.length === sourceRecords.length} className="w-4 h-4 accent-slate-900" />
                                            <span className="text-xs font-black">전체 선택 ({selectedImportIds.length}/{sourceRecords.length})</span>
                                        </div>
                                        {sourceRecords.map(record => {
                                            const emp = employees.find(e => e.id === record.employee_id);
                                            const name = emp ? `${emp.full_name} (${emp.department})` : '알 수 없는 직원';
                                            return (
                                                <div key={record.id} className="flex items-center gap-3 p-2 border-b border-slate-100 hover:bg-white cursor-pointer transition-colors" onClick={() => toggleImportSelection(record.employee_id)}>
                                                    <input type="checkbox" readOnly checked={selectedImportIds.includes(record.employee_id)} className="w-4 h-4 accent-blue-600" />
                                                    <span className="text-xs font-bold text-slate-700">{name}</span>
                                                    <span className="text-xs text-blue-600 ml-auto font-mono">{formatCurrency(record.base_pay)}원</span>
                                                </div>
                                            )
                                        })}
                                    </>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2 shrink-0">
                            <button onClick={()=>setIsImportModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black hover:bg-slate-200 transition-colors text-xs">취소</button>
                            <button onClick={executeImport} disabled={isImporting || selectedImportIds.length === 0} className="flex-1 py-3 bg-slate-900 text-white font-black flex items-center justify-center gap-2 hover:bg-black disabled:bg-slate-300 disabled:text-slate-500 transition-colors text-xs">
                                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                선택 데이터 가져오기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
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

            <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white">
                <div className="flex items-center gap-4">
                    <span className="font-black text-sm text-slate-800">정산 월 선택</span>
                    <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="border border-slate-200 rounded px-3 py-1 text-xs font-bold outline-none focus:border-blue-500"/>
                    <button onClick={() => setIsImportModalOpen(true)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-black border border-indigo-200 rounded hover:bg-indigo-100 flex items-center gap-1.5 text-[11px] transition-colors shadow-sm ml-2">
                        <RefreshCw size={12} /> 데이터 불러오기
                    </button>
                    <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors ml-2" title="새로고침">
                        <RefreshCw size={14} />
                    </button>
                </div>
                <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-1 bg-slate-50">
                    <Search size={14} className="text-slate-400" />
                    <input type="text" placeholder="성명 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-xs w-40 font-bold"/>
                </div>
            </div>

            <main className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full border-collapse border-spacing-0">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                        <tr className="text-[10px] font-black text-slate-500 text-center border-b border-slate-200">
                            <th className="p-3 border-r border-slate-200 w-12">No</th>
                            <th className="p-3 border-r border-slate-200 text-left w-48">성명 / 부서</th>
                            <th className="p-3 border-r border-slate-200 w-24">발송상태</th>
                            <th className="p-3 border-r border-slate-200 w-40">직원 확인일시</th>
                            <th className="p-3 border-r border-slate-200 w-32 text-right bg-blue-50/50">기본급</th>
                            <th className="p-3 border-r border-slate-200 w-32 text-right bg-emerald-50/50">지급합계</th>
                            <th className="p-3 border-r border-slate-200 w-32 text-right bg-rose-50/50">공제합계</th>
                            <th className="p-3 border-r border-slate-200 w-32 text-right font-black bg-slate-800 text-white">실수령액</th>
                            <th className="p-3 w-64 bg-slate-50">업무 제어</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {filtered.map((e, i) => {
                            const d = payrollData[e.id] || {};
                            return (
                                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 border-r border-slate-100 text-center text-slate-400 font-mono">{i+1}</td>
                                    <td className="p-3 border-r border-slate-100 font-black">{e.full_name} <span className="text-[10px] text-slate-400 ml-1">{e.department}</span></td>
                                    <td className="p-3 border-r border-slate-100 text-center">
                                        {d.is_published ? <span className="text-emerald-600 font-bold">● 발송완료</span> : <span className="text-slate-300">○ 작성중</span>}
                                    </td>
                                    <td className="p-3 border-r border-slate-100 text-center font-mono text-[10px] text-blue-600 font-bold italic">
                                        {d.is_published && d.viewed_at ? new Date(d.viewed_at).toLocaleString('ko-KR') : '-'}
                                    </td>
                                    <td className="p-3 border-r border-slate-100 text-right font-mono text-slate-600">{formatCurrency(d.base_pay)}</td>
                                    <td className="p-3 border-r border-slate-100 text-right font-mono text-emerald-600">{formatCurrency(d.total_payment)}</td>
                                    <td className="p-3 border-r border-slate-100 text-right font-mono text-rose-500">{formatCurrency(d.total_deduction)}</td>
                                    <td className="p-3 border-r border-slate-100 text-right font-mono font-black bg-slate-50 text-slate-900">{formatCurrency(d.net_pay)}</td>
                                    <td className="p-3 flex items-center justify-center gap-1.5">
                                        <button onClick={() => {
                                            const width = 1100, height = 850, left = (window.screen.width / 2) - (width / 2), top = (window.screen.height / 2) - (height / 2);
                                            window.open(`/admin-portal/payroll/${d.id}`, `PayView_${d.id}`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                                        }} className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 flex items-center gap-1 text-[10px] font-black text-slate-600"><Eye size={12}/>상세</button>
                                        
                                        <button onClick={() => {
                                            const width = 1100, height = 900, left = (window.screen.width / 2) - (width / 2), top = (window.screen.height / 2) - (height / 2);
                                            window.open(`/admin-portal/payroll/edit?empId=${e.id}&month=${targetMonth}`, `PayEdit_${e.id}`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                                        }} className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 flex items-center gap-1 text-[10px] font-black text-slate-600"><FileEdit size={12}/>수정</button>
                                        
                                        <button 
                                            onClick={() => publishOne(e.id, d.is_published)} 
                                            className={`p-1.5 px-3 rounded text-white font-black text-[10px] flex items-center gap-1 transition-all active:scale-95 shadow-sm
                                                ${d.is_published 
                                                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' 
                                                    : 'bg-slate-900 hover:bg-black shadow-slate-300'}`}
                                        >
                                            <SendHorizontal size={12} /> {d.is_published ? '재발송' : '발송'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="9" className="p-8 text-center text-slate-400 font-bold">데이터가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </main>
        </div>
    );
}