'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, ShieldCheck, Leaf, Hammer } from 'lucide-react';

// --- 최적화된 개별 현장 카드 컴포넌트 ---
const SiteCard = ({ site }) => {
  const start = site.start_date ? site.start_date.substring(2, 10).replace(/-/g, '.') : '미정';
  const end = site.end_date ? site.end_date.substring(2, 10).replace(/-/g, '.') : '미정';
  
  const endDateObj = new Date(site.end_date);
  const today = new Date();
  const dDay = Math.ceil((endDateObj - today) / (1000 * 60 * 60 * 24));
  
  const budgetInOck = site.budget ? (Number(site.budget) / 100000000).toFixed(1) : '0.0';
  const isCompleted = site.status === '완료';
  const managerName = site.pm?.full_name || '미지정';

  const isPlant = site.name.includes('식재');
  const isFacility = site.name.includes('시설물');

  return (
    <Link href={`/sites/${site.id}`} className="group bg-white border border-slate-200 rounded-[1.2rem] p-5 hover:border-blue-600 hover:shadow-lg transition-all flex flex-col font-black shadow-sm h-[290px] w-full relative">
      {/* 1. 상단 공종 태그 */}
      <div className="flex gap-1 mb-2 shrink-0">
        {isPlant && <span className="bg-blue-50 text-blue-600 text-[8px] px-2 py-0.5 rounded-full border border-blue-100 font-sans">식재공사</span>}
        {isFacility && <span className="bg-emerald-50 text-emerald-600 text-[8px] px-2 py-0.5 rounded-full border border-emerald-100 font-sans">시설물공사</span>}
        {!isPlant && !isFacility && <span className="bg-slate-50 text-slate-500 text-[8px] px-2 py-0.5 rounded-full border border-slate-100 font-sans">일반공사</span>}
      </div>

      {/* 2. 현장명 영역 (높이를 3줄 분량으로 늘려 끝까지 보이도록 조정) */}
      <div className="h-[68px] mb-3 overflow-hidden">
        <h3 className="text-[15px] font-black text-slate-950 leading-[1.4] break-keep line-clamp-3 font-sans italic-none">
          {site.name}
        </h3>
      </div>

      {/* 3. 정보 영역 */}
      <div className="flex justify-between items-center border-y border-slate-50 py-3 mb-4 shrink-0 font-sans italic-none">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">현장소장</span>
          <span className="text-[13px] text-slate-800 font-black">{managerName}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">계약금액</span>
          <span className="text-[13px] text-slate-900 font-black">{budgetInOck}억</span>
        </div>
      </div>

      {/* 4. 공정률 게이지 ('진행률' -> '공정률' 수정) */}
      <div className="mb-4 shrink-0 font-sans italic-none">
        <div className={`px-3 py-2 rounded-xl border flex items-center justify-between ${isPlant ? 'bg-blue-50/30 border-blue-100' : 'bg-emerald-50/30 border-emerald-100'}`}>
          <div className="flex items-center gap-1.5 text-[9px] font-black">
            {isPlant ? <Leaf size={11} className="text-blue-600"/> : <Hammer size={11} className="text-emerald-600"/>}
            <span className={isPlant ? "text-blue-600" : "text-emerald-600"}>공정률</span>
          </div>
          <p className={`text-[15px] font-black ${isPlant ? 'text-blue-700' : 'text-emerald-700'}`}>
            {(isPlant ? (site.progress_plant || 0) : (site.progress_facility || 0)).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 5. 하단 날짜 및 D-Day */}
      <div className="mt-auto flex justify-between items-end font-sans italic-none">
        <div className="text-[10px] text-slate-400 font-bold tracking-tighter">
          {start} ~ {end}
        </div>
        {!isCompleted ? (
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${dDay < 30 ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'}`}>
            D{dDay >= 0 ? `-${dDay}` : `+${Math.abs(dDay)}`}
          </span>
        ) : (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 uppercase">
            준공
          </span>
        )}
      </div>
    </Link>
  );
};

function StatusSection({ title, sites, statusType }) {
  if (sites.length === 0) return null;
  const colorMap = { ongoing: "bg-blue-600 text-blue-700", pending: "bg-amber-500 text-amber-600", completed: "bg-slate-400 text-slate-500" };
  const [bgColor, textColor] = colorMap[statusType].split(' ');
  
  return (
    <div className="mb-12 font-black italic-none font-sans">
      <div className="flex items-center gap-2.5 mb-5 px-1">
        <div className={`w-1 h-5 ${bgColor} rounded-full`} />
        <h2 className={`text-[18px] font-black ${textColor}`}>{title}</h2>
        <span className="text-slate-300 text-sm font-bold ml-1">{sites.length}</span>
      </div>
      {/* 🚀 한 줄에 4개 고정 배치 (lg:grid-cols-4로 조정) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sites.map(site => <SiteCard key={site.id} site={site} />)}
      </div>
    </div>
  );
}

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('construction_sites')
        .select(`*, pm:profiles!pm_id (full_name)`)
        .order('name', { ascending: true });

      if (error) throw error;
      setSites(data || []);
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const filtered = useMemo(() => {
    const list = sites.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return {
      ongoing: list.filter(s => s.status === '진행중' || s.status === '진행' || !s.status || s.status === ''),
      pending: list.filter(s => s.status === '대기' || s.status === '보류'),
      completed: list.filter(s => s.status === '완료')
    };
  }, [sites, searchTerm]);

  return (
    <div className="p-6 sm:p-8 bg-[#f8fafc] min-h-screen font-black italic-none font-sans">
      <header className="max-w-[1600px] mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-5 italic-none">
        <div>
          <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] tracking-[0.2em] uppercase mb-1 font-sans">
            <ShieldCheck size={14} /> Intelligence Management
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">현장 관리 대장</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black" size={15} />
            <input 
              type="text" 
              placeholder="현장명 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[13px] outline-none w-56 focus:border-blue-600 shadow-sm font-black transition-all"
            />
          </div>
          <button 
            onClick={() => router.push('/sites/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[13px] font-black flex items-center gap-1.5 hover:bg-blue-700 transition-all shadow-md active:scale-95"
          >
            <Plus size={16} strokeWidth={3} /> 현장 등록
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto italic-none">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-[290px] bg-white border border-slate-100 rounded-[1.2rem] animate-pulse" />)}
          </div>
        ) : (
          <>
            <StatusSection title="진행 중 프로젝트" sites={filtered.ongoing} statusType="ongoing" />
            <StatusSection title="대기 및 보류" sites={filtered.pending} statusType="pending" />
            <StatusSection title="준공 완료" sites={filtered.completed} statusType="completed" />
          </>
        )}
      </main>
    </div>
  );
}