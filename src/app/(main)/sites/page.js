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
  Construction
} from 'lucide-react';

// 로딩 스켈레톤 UI
const SiteSkeleton = () => (
    <div className="w-full h-16 bg-gray-100 rounded-xl mb-3 animate-pulse"></div>
);

// 상태별 섹션 컴포넌트
function StatusSection({ title, count, sites, statusColor, icon }) {
  if (count === 0) return null;

  const colorStyles = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100"
  };

  return (
    <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-2 mb-4 px-1">
        {icon}
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorStyles[statusColor]}`}>
          {count}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[60%]">현장명</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">공정률</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">상세보기</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sites.map((site) => (
              <tr key={site.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-5">
                  <Link href={`/sites/${site.id}`} className="block">
                    <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base">
                      {site.name}
                    </div>
                    {site.address && (
                      <div className="text-xs text-gray-400 mt-1 font-medium">{site.address}</div>
                    )}
                  </Link>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col items-center gap-1.5 min-w-[150px] max-w-[200px] mx-auto">
                    <div className="flex justify-between w-full text-[10px] font-bold text-slate-400 px-1">
                      <span>PROGRESS</span>
                      <span className="text-blue-600">{site.progress || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-700 ease-out ${statusColor === 'green' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${site.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <Link href={`/sites/${site.id}`} className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-300 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg transition-all active:scale-90">
                    <ChevronRight size={22} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      const { data, error } = await supabase
        .from('construction_sites')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('현장 목록을 불러오는데 실패했습니다:', error);
      } else {
        setSites(data || []);
      }
      setLoading(false);
    };
    fetchSites();
  }, []);

  // 상태별 그룹화 및 검색 필터링 (현장명으로만 검색)
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen bg-slate-50/30 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <Construction className="text-white" size={24} />
            </div>
            현장 관리 대장
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-2 ml-1">상태별 공정 현황을 실시간으로 확인합니다.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="현장명 검색..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-72 shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link href="/sites/new" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95">
            <Plus size={20} /> 새 현장 등록
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => <SiteSkeleton key={i} />)}
        </div>
      ) : sites.length > 0 ? (
        <div className="space-y-4">
          <StatusSection 
            title="진행 중인 현장" 
            count={groupedSites.ongoing.length} 
            sites={groupedSites.ongoing} 
            statusColor="blue" 
            icon={<Clock size={22} className="text-blue-600" />}
          />
          
          <StatusSection 
            title="보류 및 중단" 
            count={groupedSites.pending.length} 
            sites={groupedSites.pending} 
            statusColor="orange" 
            icon={<AlertCircle size={22} className="text-orange-500" />}
          />
          
          <StatusSection 
            title="완료된 현장" 
            count={groupedSites.completed.length} 
            sites={groupedSites.completed} 
            statusColor="green" 
            icon={<CheckCircle2 size={22} className="text-emerald-500" />}
          />
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-inner">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Construction size={40} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-black text-xl">등록된 현장이 없습니다</p>
            <p className="text-sm text-slate-400 mt-2">상단의 '새 현장 등록' 버튼을 눌러 프로젝트를 시작하세요.</p>
        </div>
      )}
    </div>
  );
}