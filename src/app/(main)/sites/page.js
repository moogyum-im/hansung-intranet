'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useEmployee } from '@/contexts/EmployeeContext';
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Construction,
  ShieldCheck,
  Building2,
  BarChart3
} from 'lucide-react';

// --- 현장 스타일의 로딩 스켈레톤 UI ---
const SiteSkeleton = () => (
    <div className="w-full h-20 bg-white border border-slate-100 rounded-2xl mb-4 animate-pulse shadow-sm flex items-center px-6">
        <div className="w-10 h-10 bg-slate-100 rounded-xl mr-4"></div>
        <div className="flex-1">
            <div className="h-4 bg-slate-100 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-slate-50 rounded w-1/3"></div>
        </div>
        <div className="w-32 h-2 bg-slate-100 rounded-full"></div>
    </div>
);

// --- 상태별 섹션 컴포넌트 (현장 관리 스타일 개편) ---
function StatusSection({ title, count, sites, statusColor, icon }) {
  if (count === 0) return null;

  const colorStyles = {
    blue: { 
        bg: "bg-blue-600", 
        lightBg: "bg-blue-50/50", 
        border: "border-blue-100", 
        text: "text-blue-600", 
        progress: "bg-blue-600",
        shadow: "shadow-blue-100"
    },
    orange: { 
        bg: "bg-amber-500", 
        lightBg: "bg-amber-50/50", 
        border: "border-amber-100", 
        text: "text-amber-600", 
        progress: "bg-amber-500",
        shadow: "shadow-amber-100"
    },
    green: { 
        bg: "bg-emerald-500", 
        lightBg: "bg-emerald-50/50", 
        border: "border-emerald-100", 
        text: "text-emerald-600", 
        progress: "bg-emerald-500",
        shadow: "shadow-emerald-100"
    }
  };

  const style = colorStyles[statusColor];

  return (
    <div className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${style.bg} text-white shadow-lg ${style.shadow}`}>
            {icon}
          </div>
          <h3 className="text-[17px] font-black text-slate-800 tracking-tight">{title}</h3>
          <span className={`ml-1 text-[11px] font-black px-2 py-0.5 rounded-full border ${style.border} ${style.text} bg-white shadow-sm`}>
            {count}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className={`bg-slate-50/50 border-b border-slate-100`}>
                <tr>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">현장 정보</th>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">공정률 (Progress)</th>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">상세 현황</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {sites.map((site) => (
                <tr key={site.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6">
                    <Link href={`/sites/${site.id}`} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 transition-colors border border-slate-50 group-hover:border-blue-100 group-hover:shadow-sm">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-base tracking-tight">
                            {site.name}
                            </div>
                            {site.address && (
                            <div className="text-[12px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span> {site.address}
                            </div>
                            )}
                        </div>
                    </Link>
                    </td>
                    <td className="px-8 py-6">
                    <div className="flex flex-col items-center gap-2 min-w-[180px] max-w-[240px] mx-auto">
                        <div className="flex justify-between w-full text-[10px] font-black text-slate-400 px-1 uppercase tracking-tighter">
                        <span className="flex items-center gap-1"><BarChart3 size={10} /> Progress Status</span>
                        <span className={style.text}>{site.progress || 0}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner p-[1px]">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${style.progress}`}
                            style={{ width: `${site.progress || 0}%` }}
                        />
                        </div>
                    </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                    <Link href={`/sites/${site.id}`} className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-300 bg-slate-50 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 transition-all active:scale-90 border border-slate-100 group-hover:border-blue-500">
                        <ChevronRight size={20} />
                    </Link>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { employee } = useEmployee(); 

  useEffect(() => {
    const fetchSites = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('construction_sites')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setSites(data || []);
      } catch (error) {
        console.error('현장 목록 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSites();
  }, []);

  const groupedSites = useMemo(() => {
    const filtered = sites.filter(site => 
      site.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return {
      ongoing: filtered.filter(s => s.status === '진행중' || !s.status),
      pending: filtered.filter(s => s.status === '보류' || s.status === '중단'),
      completed: filtered.filter(s => s.status === '완료')
    };
  }, [sites, searchTerm]);

  return (
    <div className="p-6 sm:p-10 bg-[#f8fafc] min-h-screen">
      {/* --- 헤더 섹션 (전사 공통 스타일) --- */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-black text-[11px] tracking-widest uppercase mb-2">
            <ShieldCheck size={14} /> Field Management System
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            현장 관리 대장 <Construction className="text-blue-600" size={28} />
          </h1>
          <p className="text-slate-500 text-[14px] mt-2 font-medium">한성 인트라넷에서 관리하는 모든 건설 현장의 공정률과 상태를 실시간으로 모니터링합니다.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="현장명 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all w-64 shadow-sm font-medium"
            />
          </div>
          <Link href="/sites/new" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 group active:scale-95">
            <Plus size={18} /> 
            <span className="hidden sm:inline text-sm">새 현장 등록</span>
          </Link>
        </div>
      </header>

      {/* --- 메인 리스트 --- */}
      <main className="max-w-7xl mx-auto">
        {loading ? (
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <SiteSkeleton key={i} />)}
            </div>
        ) : sites.length > 0 ? (
            <div className="space-y-2">
                <StatusSection 
                    title="진행 중인 프로젝트" 
                    count={groupedSites.ongoing.length} 
                    sites={groupedSites.ongoing} 
                    statusColor="blue" 
                    icon={<Clock size={18} />}
                />
                
                <StatusSection 
                    title="보류 및 중단 현장" 
                    count={groupedSites.pending.length} 
                    sites={groupedSites.pending} 
                    statusColor="orange" 
                    icon={<AlertCircle size={18} />}
                />
                
                <StatusSection 
                    title="준공 및 완료 현장" 
                    count={groupedSites.completed.length} 
                    sites={groupedSites.completed} 
                    statusColor="green" 
                    icon={<CheckCircle2 size={18} />}
                />
            </div>
        ) : (
            <div className="text-center py-32 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
                    <Construction size={40} className="text-slate-200" />
                </div>
                <p className="text-slate-800 font-black text-xl tracking-tight">등록된 현장이 없습니다</p>
                <p className="text-sm text-slate-400 mt-2 font-medium">새로운 현장을 등록하여 공정 관리를 시작하세요.</p>
                <Link href="/sites/new" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-black transition-all">
                    첫 현장 등록하기 <Plus size={18} />
                </Link>
            </div>
        )}
      </main>
    </div>
  );
}