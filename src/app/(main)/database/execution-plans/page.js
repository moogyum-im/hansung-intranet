'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileSpreadsheet, Building2, ChevronRight, Search, X } from 'lucide-react';

function computePlanStatus(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (e < today) return '완료';
  if (s <= today) return '진행';
  return '예정';
}

function getQuarterLabel(startDate) {
  if (!startDate) return '';
  const d = new Date(startDate);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear() % 100}년 ${q}분기`;
}

// 현장 status → 그룹 분류
function getSiteGroup(status) {
  if (!status) return 'wait';
  if (['진행중', '진행'].includes(status)) return 'active';
  if (['완료', '준공'].includes(status)) return 'done';
  return 'wait'; // 대기, 보류, 중단 등
}

const GROUP_META = {
  active: { label: '진행 중', dot: 'bg-blue-500' },
  wait:   { label: '대기 · 중단', dot: 'bg-amber-400' },
  done:   { label: '준공 완료', dot: 'bg-gray-300' },
};

function SiteCard({ site, plans, onClick }) {
  const uniquePlans = plans.filter((p, i, arr) =>
    arr.findIndex(x => getQuarterLabel(x.start_date) === getQuarterLabel(p.start_date)) === i
  );
  const router = useRouter();
  const isDone = getSiteGroup(site.status) === 'done';

  return (
    <div
      className={`flex items-center bg-white border rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group cursor-pointer ${
        isDone ? 'border-gray-100 opacity-60' : 'border-gray-100'
      }`}
      onClick={onClick}
    >
      <Building2 size={18} className={`mr-4 flex-shrink-0 ${isDone ? 'text-gray-200' : 'text-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <h2 className="text-sm font-bold text-gray-900 truncate">{site.name}</h2>
          {site.status && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
              getSiteGroup(site.status) === 'active' ? 'bg-blue-50 text-blue-500' :
              getSiteGroup(site.status) === 'done'   ? 'bg-gray-50 text-gray-400' :
                                                       'bg-amber-50 text-amber-500'
            }`}>{site.status}</span>
          )}
        </div>
        {uniquePlans.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {uniquePlans.map(p => (
              <button
                key={p.id}
                onClick={e => {
                  e.stopPropagation();
                  router.push(`/database/execution-plans/site/${site.id}?planId=${p.id}`);
                }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-opacity hover:opacity-70 ${
                  (() => { const s = computePlanStatus(p.start_date, p.end_date); return s === '진행' ? 'bg-blue-50 text-blue-600 border-blue-100' : s === '완료' ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-amber-50 text-amber-600 border-amber-100'; })()
                }`}
              >
                {getQuarterLabel(p.start_date)} · {computePlanStatus(p.start_date, p.end_date)}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-gray-300">공정표 없음</span>
        )}
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors ml-4 flex-shrink-0" />
    </div>
  );
}

export default function ExecutionPlansPage() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [plansBySite, setPlansBySite] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/execution-plans/overview')
      .then(r => r.json())
      .then(({ sites: s, plans: p, error: e }) => {
        if (e) { setError(e); setLoading(false); return; }
        const map = {};
        (p || []).forEach(plan => {
          if (!plan.site_id) return;
          if (!map[plan.site_id]) map[plan.site_id] = [];
          map[plan.site_id].push(plan);
        });
        setSites(s || []);
        setPlansBySite(map);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter(s => s.name?.toLowerCase().includes(q));
  }, [sites, search]);

  const grouped = useMemo(() => ({
    active: filtered.filter(s => getSiteGroup(s.status) === 'active'),
    wait:   filtered.filter(s => getSiteGroup(s.status) === 'wait'),
    done:   filtered.filter(s => getSiteGroup(s.status) === 'done'),
  }), [filtered]);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[11px] text-gray-400 font-semibold tracking-widest uppercase mb-1">전략기획부</p>
          <h1 className="text-2xl font-bold text-gray-900">공사 예정 공정표</h1>
          <p className="text-sm text-gray-400 mt-1">현장별 분기 공정표를 등록하고 관리합니다.</p>
        </div>
      </header>

      {/* 검색 */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="현장명 검색"
          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <X size={14} />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          데이터 로드 오류: {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white border border-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-300">
          <FileSpreadsheet size={40} className="mb-3" />
          <p className="text-sm font-medium">{search ? `"${search}" 검색 결과 없음` : '등록된 현장이 없습니다'}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {(['active', 'wait', 'done']).map(groupKey => {
            const groupSites = grouped[groupKey];
            if (groupSites.length === 0) return null;
            const meta = GROUP_META[groupKey];
            return (
              <section key={groupKey}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{meta.label}</p>
                  <span className="text-xs text-gray-300">({groupSites.length})</span>
                </div>
                <div className="space-y-2.5">
                  {groupSites.map(site => (
                    <SiteCard
                      key={site.id}
                      site={site}
                      plans={plansBySite[site.id] || []}
                      onClick={() => router.push(`/database/execution-plans/site/${site.id}`)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
