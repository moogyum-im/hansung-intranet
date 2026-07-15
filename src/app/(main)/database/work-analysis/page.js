'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle, TrendingUp, CalendarDays, TreePine,
  ChevronDown, ChevronUp, Users, CheckCircle2, BarChart3
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    red:    'bg-red-50   text-red-600   border-red-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function OverStaffBadge({ isOver, overCount }) {
  if (!isOver) return <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">정상</span>;
  return (
    <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full">
      과투입 +{overCount}명
    </span>
  );
}

function SiteCard({ site }) {
  const [open, setOpen] = useState(false);
  const hasOverStaff = site.overStaffedDays > 0;

  return (
    <div className={`bg-white rounded-xl border ${hasOverStaff ? 'border-red-200' : 'border-slate-200'} overflow-hidden`}>
      {/* 헤더 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{site.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">작업일 {site.workDays}일 · 총 식재 {site.totalPlanted.toLocaleString()}주</p>
        </div>

        {/* 배지 */}
        <div className="flex items-center gap-2 shrink-0">
          {hasOverStaff ? (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <AlertTriangle size={13} className="text-red-500" />
              <span className="text-xs font-bold text-red-600">과투입 {site.overStaffedDays}일</span>
              <span className="text-xs text-red-400">({site.overStaffedRate}%)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span className="text-xs font-bold text-emerald-600">과투입 없음</span>
            </div>
          )}
          {site.avgProductivity && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-slate-600">{site.avgProductivity}주/인·일</span>
            </div>
          )}
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* 날짜별 상세 */}
      {open && (
        <div className="border-t border-slate-100">
          {/* 요약 바 */}
          {site.overStaffedDays > 0 && (
            <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-700">
                전체 작업일 중 <strong>{site.overStaffedDays}일({site.overStaffedRate}%)</strong> 과투입 발생 —
                권장 대비 평균 초과 인원:&nbsp;
                <strong>
                  {Math.round(
                    site.reports.filter(r => r.isOverStaffed).reduce((s, r) => s + r.overCount, 0) /
                    site.overStaffedDays
                  )}명
                </strong>
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-semibold">날짜</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">관목공</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">식재공</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">권장(관목)</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">권장(교목)</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">상태</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">관목식재</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">교목식재</th>
                  <th className="text-left px-3 py-2.5 text-slate-500 font-semibold">주요 수종</th>
                </tr>
              </thead>
              <tbody>
                {site.reports.map((r) => (
                  <tr
                    key={r.date}
                    className={`border-b border-slate-50 ${r.isOverStaffed ? 'bg-red-50/60' : ''}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{r.date}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold ${r.isShrubOver ? 'text-red-600' : 'text-slate-700'}`}>
                        {r.shrubWorkers > 0 ? `${r.shrubWorkers}명` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold ${r.isTreeOver ? 'text-red-600' : 'text-slate-700'}`}>
                        {r.treeWorkers > 0 ? `${r.treeWorkers}명` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-500">
                      {r.shrubRecommended > 0 ? `${r.shrubRecommended}명` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-500">
                      {r.treeRecommended > 0 ? `${r.treeRecommended}명` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <OverStaffBadge isOver={r.isOverStaffed} overCount={r.overCount} />
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">
                      {r.shrubPlanted > 0 ? r.shrubPlanted.toLocaleString() + '주' : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">
                      {r.treePlanted > 0 ? r.treePlanted.toLocaleString() + '주' : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[180px] truncate">
                      {r.items.length > 0
                        ? r.items.slice(0, 3).map(i => `${i.item}(${i.planted})`).join(', ')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkAnalysisPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [filterOver, setFilterOver] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sites/work-analysis?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const sites = data?.sites || [];
  const filtered = filterOver ? sites.filter(s => s.overStaffedDays > 0) : sites;

  // 전체 집계
  const totalWorkDays    = sites.reduce((s, x) => s + x.workDays, 0);
  const totalOverDays    = sites.reduce((s, x) => s + x.overStaffedDays, 0);
  const totalPlanted     = sites.reduce((s, x) => s + x.totalPlanted, 0);
  const overSites        = sites.filter(s => s.overStaffedDays > 0).length;
  const overRate         = totalWorkDays > 0 ? Math.round(totalOverDays / totalWorkDays * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-500" />
            작업일보 분석
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            현장별 투입 인원 vs 권장 인원 비교 · 과투입 내역 분석
          </p>
        </div>
        {/* 기간 선택 */}
        <div className="flex items-center gap-2">
          {[30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                days === d ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              최근 {d}일
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          분석 중...
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={CalendarDays}  label="전체 작업일" value={`${totalWorkDays}일`}       sub={`${sites.length}개 현장`} color="blue" />
            <StatCard icon={AlertTriangle} label="과투입 발생"  value={`${overSites}개 현장`}      sub={`총 ${totalOverDays}일 (${overRate}%)`} color="red" />
            <StatCard icon={TreePine}      label="총 식재량"    value={`${totalPlanted.toLocaleString()}주`} sub={`최근 ${days}일`} color="green" />
            <StatCard icon={Users}         label="정상 운영"    value={`${sites.length - overSites}개 현장`} sub="과투입 0일" color="amber" />
          </div>

          {/* 필터 */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">{filtered.length}개 현장</span>
            <button
              onClick={() => setFilterOver(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterOver ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle size={12} />
              과투입 현장만 보기
            </button>
          </div>

          {/* 현장 목록 */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                {filterOver ? '과투입이 발생한 현장이 없습니다.' : '분석할 데이터가 없습니다.'}
              </div>
            )}
            {filtered.map(site => (
              <SiteCard key={site.id} site={site} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
