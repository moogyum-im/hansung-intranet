'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  LayoutDashboard, Users, CreditCard, FileText, Settings, Search, Bell, 
  ChevronDown, ShieldAlert, Loader2, RefreshCw, Receipt, PieChart, Wallet, 
  TrendingDown, ExternalLink 
} from 'lucide-react';

const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return Number(num).toLocaleString();
};

export default function ExpensesManagementPage() {
  const { employee, loading: authLoading } = useEmployee();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 🚀 전자결재 테이블에서 지출 관련 문서만 호출
  const fetchExpenseDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // '지출', '정산', '법인카드' 단어가 포함된 문서만 필터링
      const { data, error } = await supabase
        .from('approval_documents')
        .select('id, title, creator_name, department, amount, status, form_type, created_at')
        .or('form_type.ilike.%지출%,form_type.ilike.%정산%,form_type.ilike.%법인카드%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error(error);
      toast.error('지출 결의 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (employee && (employee.department === '관리부' || employee.role === 'admin')) {
      fetchExpenseDocuments();
    }
  }, [employee, fetchExpenseDocuments]);

  // 검색 필터 적용
  const filteredDocs = documents.filter(doc => 
    doc.title?.includes(searchTerm) || 
    doc.creator_name?.includes(searchTerm) || 
    doc.department?.includes(searchTerm)
  );

  // 🚀 상단 통계 수치 계산
  const stats = useMemo(() => {
    let totalApproved = 0;
    let totalPending = 0;
    const byDept = {};

    documents.forEach(doc => {
      const amt = Number(doc.amount || 0);
      const dept = doc.department || '미지정';
      
      if (doc.status === '승인' || doc.status === '완료') {
        totalApproved += amt;
        byDept[dept] = (byDept[dept] || 0) + amt;
      } else if (doc.status === '진행중' || doc.status === '대기' || doc.status === 'pending') {
        totalPending += amt;
      }
    });

    return { totalApproved, totalPending, byDept };
  }, [documents]);

  const getStatusChip = (status) => {
    const statusMap = { 
        'pending': { text: '진행중', style: 'bg-amber-50 text-amber-600' }, 
        '진행중': { text: '진행중', style: 'bg-amber-50 text-amber-600' }, 
        '대기': { text: '결재대기', style: 'bg-amber-50 text-amber-600' },
        '승인': { text: '승인완료', style: 'bg-blue-50 text-blue-600' }, 
        '반려': { text: '반려됨', style: 'bg-rose-50 text-rose-600' },
        '완료': { text: '지급완료', style: 'bg-emerald-50 text-emerald-600' },
    };
    const currentStatus = statusMap[status] || { text: status, style: 'bg-slate-100 text-slate-600' };
    return <span className={`text-[11px] font-black px-2.5 py-1 rounded-md ${currentStatus.style}`}>{currentStatus.text}</span>;
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  if (!employee || (employee.department !== '관리부' && employee.role !== 'admin')) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <ShieldAlert size={64} className="text-red-400 mb-6" />
        <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">접근 권한이 없습니다</h2>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* 🚀 사이드바 (지출/법인카드 탭 활성화) */}
      <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-8 shrink-0 z-10">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 text-white font-black text-xl">H</div>
        <nav className="flex flex-col gap-6 w-full items-center">
          <Link href="/admin-portal" className="p-3 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><LayoutDashboard size={22} strokeWidth={2.5} /></Link>
          <Link href="/admin-portal/hr" className="p-3 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><Users size={22} strokeWidth={2.5} /></Link>
          <Link href="/admin-portal/payroll" className="p-3 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><Wallet size={22} strokeWidth={2.5} /></Link>
          <Link href="/admin-portal/expenses" className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CreditCard size={22} strokeWidth={2.5} /></Link>
          <Link href="/approvals" className="p-3 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><FileText size={22} strokeWidth={2.5} /></Link>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2.5 rounded-full w-80 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <Search size={18} className="text-slate-400" />
            <input type="text" placeholder="문서 제목, 기안자, 부서 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 w-full placeholder:text-slate-400"/>
          </div>
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><Bell size={22} strokeWidth={2.5} /></button>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-3 p-1.5 pr-3">
              <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-black">{employee?.full_name?.charAt(0)}</div>
              <div className="flex flex-col"><span className="text-sm font-black text-slate-800">{employee?.full_name}</span><span className="text-[11px] font-bold text-slate-400">{employee?.department}</span></div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">부서별 지출 및 결의 관리</h1>
              <p className="text-sm font-bold text-slate-500">전자결재로 접수된 지출결의서, 출장 정산, 법인카드 내역을 통합 조회합니다.</p>
            </div>
            <button onClick={fetchExpenseDocuments} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-black rounded-xl shadow-sm transition-colors">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 내역 새로고침
            </button>
          </div>

          {/* 상단 통계 수치 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-6 rounded-3xl shadow-lg flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-500 opacity-20 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-start relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
                  <CreditCard size={20} strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex flex-col mt-2 relative z-10">
                <span className="text-xs font-bold text-slate-400 mb-1">승인 완료된 지출 총액</span>
                <span className="text-3xl font-black text-white">₩ {formatNumber(stats.totalApproved)}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                  <TrendingDown size={20} strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex flex-col mt-2">
                <span className="text-xs font-bold text-slate-400 mb-1">결재 대기 중인 지출 예정액</span>
                <span className="text-3xl font-black text-slate-800">₩ {formatNumber(stats.totalPending)}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Receipt size={20} strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex flex-col mt-2">
                <span className="text-xs font-bold text-slate-400 mb-1">처리된 전체 지출 문서</span>
                <span className="text-3xl font-black text-slate-800">{documents.length} 건</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            {/* 부서별 지출 현황 (승인 기준) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <PieChart size={20} className="text-slate-700" />
                  <h3 className="text-lg font-black text-slate-800">부서별 누적 지출 (승인)</h3>
                </div>
              </div>
              
              <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                {Object.keys(stats.byDept).length === 0 ? (
                  <div className="text-center text-slate-400 font-bold py-10">승인된 지출 내역이 없습니다.</div>
                ) : (
                  Object.entries(stats.byDept)
                    .sort(([, a], [, b]) => b - a)
                    .map(([dept, amount], idx) => {
                      const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                      const percent = stats.totalApproved > 0 ? (amount / stats.totalApproved) * 100 : 0;
                      return (
                        <div key={dept} className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-sm font-black">
                            <span className="text-slate-700">{dept}</span>
                            <span className="text-slate-800">₩ {formatNumber(amount)}</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${colors[idx % colors.length]} rounded-full`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* 상세 지출결의 내역 테이블 */}
            <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30 shrink-0">
                <h3 className="text-lg font-black text-slate-800">상세 지출 및 정산 내역</h3>
                <div className="text-xs font-bold text-slate-500">검색 결과: {filteredDocs.length}건</div>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-xs font-black text-slate-500 w-28">기안 일자</th>
                      <th className="p-4 text-xs font-black text-slate-500">문서 제목 / 분류</th>
                      <th className="p-4 text-xs font-black text-slate-500 w-32">기안자 / 부서</th>
                      <th className="p-4 text-xs font-black text-slate-500 text-center w-24">상태</th>
                      <th className="p-4 text-xs font-black text-slate-500 text-right w-36">청구 금액</th>
                      <th className="p-4 text-xs font-black text-slate-500 text-center w-16">상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold">로딩 중...</td></tr>
                    ) : filteredDocs.length === 0 ? (
                      <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold">조건에 맞는 내역이 없습니다.</td></tr>
                    ) : (
                      filteredDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4">
                            <span className="text-xs font-bold text-slate-500">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-800 truncate max-w-xs">{doc.title}</span>
                              <span className="text-[11px] font-bold text-slate-400">{doc.form_type}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-700">{doc.creator_name}</span>
                              <span className="text-[11px] font-bold text-slate-400">{doc.department}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {getStatusChip(doc.status)}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`text-sm font-black ${doc.status === '반려' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              ₩ {formatNumber(doc.amount)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <Link 
                              href={`/approvals/${doc.id}`} 
                              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 flex items-center justify-center mx-auto transition-colors"
                              title="전자결재 문서 확인"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}