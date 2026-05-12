'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, ShieldCheck, Leaf, Hammer, X } from 'lucide-react';

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
      <div className="flex gap-1 mb-2 shrink-0">
        {isPlant && <span className="bg-blue-50 text-blue-600 text-[8px] px-2 py-0.5 rounded-full border border-blue-100 font-sans">식재공사</span>}
        {isFacility && <span className="bg-emerald-50 text-emerald-600 text-[8px] px-2 py-0.5 rounded-full border border-emerald-100 font-sans">시설물공사</span>}
        {!isPlant && !isFacility && <span className="bg-slate-50 text-slate-500 text-[8px] px-2 py-0.5 rounded-full border border-slate-100 font-sans">일반공사</span>}
      </div>

      <div className="h-[68px] mb-3 overflow-hidden">
        <h3 className="text-[15px] font-black text-slate-950 leading-[1.4] break-keep line-clamp-3 font-sans">
          {site.name}
        </h3>
      </div>

      <div className="flex justify-between items-center border-y border-slate-50 py-3 mb-4 shrink-0 font-sans">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">현장소장</span>
          <span className="text-[13px] text-slate-800 font-black">{managerName}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">계약금액</span>
          <span className="text-[13px] text-slate-900 font-black">{budgetInOck}억</span>
        </div>
      </div>

      <div className="mb-4 shrink-0 font-sans">
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

      <div className="mt-auto flex justify-between items-end font-sans">
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
  const colorMap = {
    ongoing:   { bar: "bg-blue-600",  text: "text-blue-700" },
    pending:   { bar: "bg-amber-500", text: "text-amber-600" },
    completed: { bar: "bg-slate-400", text: "text-slate-500" },
  };
  const { bar, text } = colorMap[statusType];
  
  return (
    <div className="mb-12 font-sans">
      <div className="flex items-center gap-2.5 mb-5 px-1">
        <div className={`w-1 h-5 ${bar} rounded-full`} />
        <h2 className={`text-[18px] font-black ${text}`}>
          {title}
          <span className="text-slate-300 text-sm font-bold ml-2">{sites.length}</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sites.map(site => <SiteCard key={site.id} site={site} />)}
      </div>
    </div>
  );
}

const CONSTRUCTION_DEPT = '공사부';

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const router = useRouter();

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .eq('id', user.id)
        .single();

      setUserProfile(profile);

      let query = supabase
        .from('construction_sites')
        .select(`*, pm:profiles!pm_id (full_name)`)
        .order('name', { ascending: true });

      if (profile?.department === CONSTRUCTION_DEPT) {
        const { data: extraAdminSites } = await supabase
          .from('site_members')
          .select('site_id')
          .eq('user_id', user.id)
          .eq('role', '추가관리자');
        const extraSiteIds = (extraAdminSites || []).map(r => r.site_id);
        const orFilter = extraSiteIds.length > 0
          ? `pm_id.eq.${user.id},id.in.(${extraSiteIds.join(',')})`
          : `pm_id.eq.${user.id}`;
        query = query.or(orFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSites(data || []);
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const filtered = useMemo(() => {
    const list = sites.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const sortedList = [...list].sort((a, b) => {
      const nameA = a.name.split(' 중 ')[0];
      const nameB = b.name.split(' 중 ')[0];
      if (nameA === nameB) {
        if (a.name.includes('식재') && b.name.includes('시설물')) return -1;
        if (a.name.includes('시설물') && b.name.includes('식재')) return 1;
      }
      return 0;
    });
    return {
      ongoing:   sortedList.filter(s => s.status === '진행중' || s.status === '진행' || !s.status || s.status === ''),
      pending:   sortedList.filter(s => s.status === '대기' || s.status === '보류'),
      completed: sortedList.filter(s => s.status === '완료'),
    };
  }, [sites, searchTerm]);

  const isConstructionDept = userProfile?.department === CONSTRUCTION_DEPT;
  const totalCount = sites.length;

  return (
    <div className="p-6 sm:p-8 bg-[#f8fafc] min-h-screen font-sans">

      {/* ✅ 헤더 전면 개편 */}
      <header className="max-w-[1600px] mx-auto mb-8">
        
        {/* 상단: 타이틀 + 액션 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[10px] tracking-[0.2em] uppercase mb-1.5">
              <ShieldCheck size={12} />
              Intelligence Management
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">현장 관리 대장</h1>
              {/* 전체 현장 수 뱃지 */}
              {!isConstructionDept && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  총 {totalCount}개
                </span>
              )}
              {/* 공사부 안내 뱃지 */}
              {isConstructionDept && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  담당 현장만 표시
                </span>
              )}
            </div>
          </div>

          {/* 현장 등록 버튼 (공사부 제외) */}
          {!isConstructionDept && (
            <button
              onClick={() => router.push('/sites/new')}
              className="self-start sm:self-auto bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[13px] font-black flex items-center gap-1.5 hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              <Plus size={15} strokeWidth={3} /> 현장 등록
            </button>
          )}
        </div>

<div className="relative w-full max-w-sm">
  <Search
    size={15}
    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
  />
  <input
    type="text"
    placeholder="현장명으로 검색..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all font-medium"
  />
  {searchTerm && (
    <button
      onClick={() => setSearchTerm('')}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
    >
      <X size={14} />
    </button>
  )}
</div>
      </header>

      <main className="max-w-[1600px] mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-[290px] bg-white border border-slate-100 rounded-[1.2rem] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* 검색 결과 없음 */}
            {searchTerm && filtered.ongoing.length === 0 && filtered.pending.length === 0 && filtered.completed.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <Search size={32} className="mb-3 opacity-30" />
                <p className="text-sm font-semibold">"{searchTerm}"에 해당하는 현장이 없습니다</p>
              </div>
            )}
            <StatusSection title="진행 중 프로젝트" sites={filtered.ongoing}   statusType="ongoing" />
            <StatusSection title="대기 및 보류"     sites={filtered.pending}   statusType="pending" />
            <StatusSection title="준공 완료"        sites={filtered.completed} statusType="completed" />
          </>
        )}
      </main>
    </div>
  );
}