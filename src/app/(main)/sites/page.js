'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  BarChart3,
  Leaf,
  Hammer
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

// --- 상태별 섹션 컴포넌트 ---
function StatusSection({ title, count, sites, statusColor, icon }) {
  if (count === 0) return null;

  const colorStyles = {
    blue: { 
        bg: "bg-blue-600", 
        lightBg: "bg-blue-50/50", 
        border: "border-blue-100", 
        text: "text-blue-600", 
        plantProgress: "bg-blue-500",
        facilityProgress: "bg-cyan-500",
        shadow: "shadow-blue-100"
    },
    orange: { 
        bg: "bg-amber-500", 
        lightBg: "bg-amber-50/50", 
        border: "border-amber-100", 
        text: "text-amber-600", 
        plantProgress: "bg-amber-500",
        facilityProgress: "bg-orange-400",
        shadow: "shadow-amber-100"
    },
    green: { 
        bg: "bg-emerald-500", 
        lightBg: "bg-emerald-50/50", 
        border: "border-emerald-100", 
        text: "text-emerald-600", 
        plantProgress: "bg-blue-600",
        facilityProgress: "bg-teal-500",
        shadow: "shadow-emerald-100"
    }
  };

  const style = colorStyles[statusColor];

  return (
    <div className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500 font-black">
      <div className="flex items-center justify-between mb-5 px-1 font-black">
        <div className="flex items-center gap-3 font-black">
          <div className={`p-2 rounded-lg ${style.bg} text-white shadow-lg ${style.shadow}`}>
            {icon}
          </div>
          <h3 className="text-[17px] font-black text-slate-800 tracking-tight">{title}</h3>
          <span className={`ml-1 text-[11px] font-black px-2 py-0.5 rounded-full border ${style.border} ${style.text} bg-white shadow-sm font-black`}>
            {count}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-black">
        <div className="overflow-x-auto font-black">
            <table className="w-full text-left border-collapse min-w-[800px] font-black">
            <thead className={`bg-slate-50/50 border-b border-slate-100 font-black`}>
                <tr>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest font-black">현장 정보</th>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center font-black" colSpan={2}>공정률 현황 (실시간 연동)</th>
                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right font-black">상세</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-black">
                {sites.map((site) => {
                  const activeCount = (site.is_plant_active !== false ? 1 : 0) + (site.is_facility_active !== false ? 1 : 0);
                  
                  return (
                    <tr key={site.id} className="hover:bg-slate-50/50 transition-all group font-black">
                        <td className="px-8 py-6 font-black">
                        <Link href={`/sites/${site.id}`} className="flex items-center gap-4 font-black">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 transition-colors border border-slate-50 group-hover:border-blue-100 group-hover:shadow-sm">
                                <Building2 size={20} />
                            </div>
                            <div className="font-black">
                                <div className="font-black text-slate-800 group-hover:text-blue-600 transition-colors text-base tracking-tight font-black">
                                {site.name}
                                </div>
                                {site.address && (
                                <div className="text-[12px] text-slate-400 mt-0.5 font-black flex items-center gap-1">
                                    <span className="w-1 h-1 bg-slate-300 rounded-full font-black"></span> {site.address}
                                </div>
                                )}
                            </div>
                        </Link>
                        </td>

                        {/* 식재 공정률 */}
                        <td className={`px-4 py-6 font-black ${site.is_plant_active === false ? 'hidden' : ''}`}>
                            <div className="flex flex-col items-center gap-1.5 min-w-[140px] max-w-[180px] mx-auto font-black">
                                <div className="flex justify-between w-full text-[10px] font-black text-slate-400 px-1 tracking-tighter font-black">
                                    <span className="flex items-center gap-1 font-black"><Leaf size={10} className="text-green-600" /> 식재</span>
                                    <span className="text-green-600 font-black">{(site.progress_plant || 0).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-[1px] font-black">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out rounded-full bg-green-500 font-black`}
                                        style={{ width: `${site.progress_plant || 0}%` }}
                                    />
                                </div>
                            </div>
                        </td>

                        {/* 시설물 공정률 */}
                        <td className={`px-4 py-6 font-black ${site.is_facility_active === false ? 'hidden' : ''}`}>
                            <div className="flex flex-col items-center gap-1.5 min-w-[140px] max-w-[180px] mx-auto font-black">
                                <div className="flex justify-between w-full text-[10px] font-black text-slate-400 px-1 tracking-tighter font-black">
                                    <span className="flex items-center gap-1 font-black"><Hammer size={10} className="text-blue-600" /> 시설물</span>
                                    <span className="text-blue-600 font-black">{(site.progress_facility || 0).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-[1px] font-black">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out rounded-full bg-blue-500 font-black`}
                                        style={{ width: `${site.progress_facility || 0}%` }}
                                    />
                                </div>
                            </div>
                        </td>

                        {activeCount === 0 && (
                          <td className="px-4 py-6 text-center text-slate-300 text-[10px] font-black" colSpan={2}>
                            활성화된 공종이 없습니다.
                          </td>
                        )}

                        <td className="px-8 py-6 text-right font-black">
                        <Link href={`/sites/${site.id}`} className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-300 bg-slate-50 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 transition-all active:scale-90 border border-slate-100 group-hover:border-blue-500 font-black">
                            <ChevronRight size={20} />
                        </Link>
                        </td>
                    </tr>
                  );
                })}
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

  // 🚀 [실시간 연동] 각 현장별 최신 작업일보 데이터를 체크하여 공정률 업데이트
  const syncAllSitesProgress = useCallback(async (siteList) => {
    const updatedSites = await Promise.all(siteList.map(async (site) => {
        try {
            const { data } = await supabase
                .from('daily_site_reports')
                .select('notes')
                .eq('site_id', site.id)
                .order('report_date', { ascending: false })
                .limit(1);

            if (data?.[0]) {
                const notes = JSON.parse(data[0].notes);
                // 누계 공정률 계산 (전일누계 + 금일진행)
                const plantAcc = Number(notes.progress_plant_prev || 0) + Number(notes.progress_plant || 0);
                const facilityAcc = Number(notes.progress_facility_prev || 0) + Number(notes.progress_facility || 0);

                return {
                    ...site,
                    progress_plant: plantAcc,
                    progress_facility: facilityAcc,
                    is_plant_active: notes.is_plant_active ?? site.is_plant_active,
                    is_facility_active: notes.is_facility_active ?? site.is_facility_active
                };
            }
        } catch (e) {
            console.error(`${site.name} 데이터 연동 실패`);
        }
        return site;
    }));
    setSites(updatedSites);
  }, []);

  useEffect(() => {
    const fetchSites = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('construction_sites')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        
        if (data) {
            setSites(data);
            await syncAllSitesProgress(data);
        }
      } catch (error) {
        console.error('현장 목록 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSites();
  }, [syncAllSitesProgress]);

  // 🚀 [수정] 수정 폼의 '진행', '대기' 등 명칭과 완벽히 일치하도록 필터 로직 수정
  const groupedSites = useMemo(() => {
    const filtered = sites.filter(site => 
      site.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return {
      // 🚩 기존 '진행중' -> '진행'으로 수정
      ongoing: filtered.filter(s => s.status === '진행' || !s.status || s.status === '진행중'),
      pending: filtered.filter(s => s.status === '대기' || s.status === '보류' || s.status === '중단'),
      completed: filtered.filter(s => s.status === '완료')
    };
  }, [sites, searchTerm]);

  return (
    <div className="p-6 sm:p-10 bg-[#f8fafc] min-h-screen font-black">
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 font-black">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-black text-[11px] tracking-widest uppercase mb-2">
            <ShieldCheck size={14} /> 현장 관리 시스템
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            현장 관리 대장 <Construction className="text-blue-600" size={28} />
          </h1>
          <p className="text-slate-500 text-[14px] mt-2 font-black">작업일보를 통해 업데이트되는 실시간 공정률을 모니터링합니다.</p>
        </div>
        
        <div className="flex items-center gap-3 font-black">
          <div className="relative group font-black">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="현장명 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all w-64 shadow-sm font-black"
            />
          </div>
          <Link href="/sites/new" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95">
            <Plus size={18} /> 
            <span className="hidden sm:inline text-sm">새 현장 등록</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto font-black">
        {loading ? (
            <div className="space-y-4 font-black">
                {Array.from({ length: 5 }).map((_, i) => <SiteSkeleton key={i} />)}
            </div>
        ) : sites.length > 0 ? (
            <div className="space-y-2 font-black">
                <StatusSection 
                    title="진행 중 프로젝트" 
                    count={groupedSites.ongoing.length} 
                    sites={groupedSites.ongoing} 
                    statusColor="blue" 
                    icon={<Clock size={18} />}
                />
                
                <StatusSection 
                    title="착공 대기 및 보류 현장" 
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
            <div className="text-center py-32 bg-white rounded-3xl border border-slate-200 shadow-sm font-black">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100 font-black">
                    <Construction size={40} className="text-slate-200" />
                </div>
                <p className="text-slate-800 font-black text-xl tracking-tight">등록된 현장이 없습니다</p>
                <Link href="/sites/new" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-slate-800 text-white rounded-xl font-black hover:bg-black transition-all">
                    첫 현장 등록하기 <Plus size={18} />
                </Link>
            </div>
        )}
      </main>
    </div>
  );
}