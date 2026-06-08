'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Users, FileText, AlertCircle, Sparkles, Hammer, Zap, Banknote, BarChart2 } from 'lucide-react';
import ProgressBillingClient from '@/app/(main)/database/progress-billings/[siteId]/ProgressBillingClient';

/* ────────── 포맷 유틸 ────────── */
const fmtN = (n) => (Number(n) || 0).toLocaleString();
const fmtB = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(2)}억`;
  if (Math.abs(v) >= 10000)     return `${Math.round(v / 10000).toLocaleString()}만원`;
  return `${v.toLocaleString()}원`;
};
const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

/* ────────── 수종 매칭 ────────── */
function matchActual(planned, actuals) {
  const name = planned.species_name?.trim().toLowerCase();
  const spec = planned.spec?.trim().toLowerCase();
  return actuals.find(a =>
    a.item?.trim().toLowerCase() === name &&
    a.spec?.trim().toLowerCase() === spec
  ) || actuals.find(a => a.item?.trim().toLowerCase() === name);
}

/* ────────── KPI 카드 ────────── */
function KpiCard({ label, value, sub, color = 'gray', icon }) {
  const colorMap = {
    blue:  'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red:   'bg-red-50 text-red-600 border-red-100',
    gray:  'bg-gray-50 text-gray-600 border-gray-100',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold opacity-70">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-black">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

/* ────────── 진행 바 ────────── */
function ProgressBar({ pct, color = 'blue' }) {
  const colorMap = { blue: 'bg-blue-500', green: 'bg-green-500', amber: 'bg-amber-400', red: 'bg-red-500' };
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorMap[color]}`}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}

/* ────────── 섹션 헤더 ────────── */
function SectionHeader({ title, count, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 px-0 text-left group"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        {count != null && <span className="text-xs text-gray-400">({count})</span>}
      </div>
      {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
    </button>
  );
}

/* ────────── 메인 컴포넌트 ────────── */
export default function ProfitDetailClient({ site }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'billing'

  const [showCosts, setShowCosts]   = useState(true);
  const [showTrees, setShowTrees]   = useState(true);
  const [showLabor, setShowLabor]   = useState(false);
  const [showOverInvest, setShowOverInvest] = useState(true);
  const [showEfficiency, setShowEfficiency] = useState(true);
  const [effDetailDate, setEffDetailDate]   = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);

  useEffect(() => {
    fetch(`/api/profit-management/${site.id}`)
      .then(r => {
        if (!r.ok) throw new Error(`서버 오류 (${r.status})`);
        return r.json();
      })
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [site.id]);

  /* ── 수종별 계획 vs 실적 매핑 ── */
  const treeRows = useMemo(() => {
    if (!data) return [];
    const { plannedItems = [], treeActuals = [] } = data;

    const matched = new Set();
    const rows = plannedItems.map(p => {
      const actual = matchActual(p, treeActuals);
      if (actual) matched.add(actual.item + '|' + actual.spec);
      return {
        species: p.species_name,
        spec: p.spec || '-',
        planned: Number(p.quantity) || 0,
        actual: actual ? (actual.accum || 0) : 0,
        unit: p.unit || '주',
        totalAmount: actual ? actual.total : 0,
        onlyPlan: !actual,
      };
    });

    // 계획에 없는 실적 항목 추가
    treeActuals.forEach(a => {
      const key = a.item + '|' + a.spec;
      if (!matched.has(key) && a.accum > 0) {
        rows.push({
          species: a.item,
          spec: a.spec || '-',
          planned: 0,
          actual: a.accum,
          unit: '주',
          totalAmount: a.total,
          onlyActual: true,
        });
      }
    });

    return rows.sort((a, b) => (b.actual || 0) - (a.actual || 0));
  }, [data]);

  const { summary, settlementCosts = [], dailyLabor = [], laborPlan, laborActual, plantingAnalysis = [], efficiencyAnalysis } = data || {};
  const effOverall  = efficiencyAnalysis?.overall;
  const effDaily    = efficiencyAnalysis?.daily || [];
  const effSpecies  = efficiencyAnalysis?.bySpecies || [];

  /* ── AI 과투입 분석 요청 ── */
  const fetchAiAnalysis = async () => {
    if (!laborPlan || !laborActual || !summary) return;
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/profit-management/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: site.name,
          progressRate: summary.progressRate,
          laborPlan,
          laborActual,
          plantingAnalysis: plantingAnalysis.filter(p => p.planned),
        }),
      });
      const d = await res.json();
      setAiAnalysis(d.analysis || d.error || '분석 실패');
    } catch (e) {
      setAiAnalysis('오류: ' + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const profitColor = !summary ? 'gray'
    : summary.profitRate >= 15 ? 'green'
    : summary.profitRate >= 0  ? 'amber'
    : 'red';

  const profitIcon = !summary ? <Minus size={16} />
    : summary.profitRate >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;

  const totalLaborPersonDays = dailyLabor.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <button
          onClick={() => router.push('/database/profit-management')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={13} /> 목록으로
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase mb-0.5">수익 실행 관리</p>
            <h1 className="text-xl font-bold text-gray-900">{site.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {site.start_date} ~ {site.end_date}
              {summary && ` · 일보 ${summary.reportCount}건 · 마지막 ${summary.lastReportDate}`}
            </p>
            {data?.hasEstimate && (
              <p className="text-[11px] mt-1 text-blue-500 font-semibold">
                계약금액 기준: 계약내역 {data.estimateVersionLabel}
              </p>
            )}
            {data && !data.hasEstimate && (
              <p className="text-[11px] mt-1 text-amber-500 font-semibold">
                계약내역 미등록 — 일보 입력 금액 기준
              </p>
            )}
          </div>
          {/* 탭 네비게이션 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
            {[
              { key: 'overview', label: '개요', icon: <BarChart2 size={12} /> },
              { key: 'billing',  label: '기성 청구', icon: <Banknote size={12} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 기성 청구 탭 */}
      {activeTab === 'billing' && (
        <div className="max-w-4xl mx-auto p-6">
          <ProgressBillingClient site={site} embedded={true} />
        </div>
      )}

      {/* 개요 탭 */}
      {activeTab === 'overview' && <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* ── 에러 ── */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertCircle size={16} /> 데이터 로드 오류: {error}
          </div>
        )}

        {/* ── 로딩 스켈레톤 ── */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}
            </div>
            <div className="h-48 bg-white border border-gray-100 rounded-2xl animate-pulse" />
          </div>
        )}

        {/* ── 일보 없음 ── */}
        {!loading && !error && !summary && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <FileText size={40} className="mb-3" />
            <p className="text-sm font-medium">등록된 작업일보가 없습니다</p>
            <p className="text-xs mt-1">현장 일보를 등록하면 수익 현황이 자동 집계됩니다</p>
          </div>
        )}

        {!loading && !error && summary && (
          <>
            {/* ── 1. KPI 요약 카드 ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard
                label="계약금액"
                value={fmtB(summary.contractAmount)}
                color="gray"
                icon={<FileText size={16} />}
              />
              <KpiCard
                label="기성 공정률"
                value={fmtPct(summary.progressRate)}
                sub={`기성 청구액 ${fmtB(summary.earnedValue)}`}
                color="blue"
                icon={<TrendingUp size={16} />}
              />
              <KpiCard
                label="총 투입비용"
                value={fmtB(summary.totalCost)}
                sub={summary.earnedValue > 0 ? `기성 대비 ${fmtPct(summary.totalCost / summary.earnedValue * 100)}` : undefined}
                color={summary.totalCost > summary.earnedValue ? 'red' : 'gray'}
                icon={<Minus size={16} />}
              />
              <KpiCard
                label="예상 수익"
                value={fmtB(summary.profit)}
                sub={`수익률 ${fmtPct(summary.profitRate)}`}
                color={profitColor}
                icon={profitIcon}
              />
            </div>

            {/* ── 1-2. 작업일보 물리 공정률 ── */}
            {(summary.physicalProgressPlant != null || summary.physicalProgressFacility != null) && (
              <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-500" />
                    <span className="text-xs font-bold text-gray-800">작업일보 물리 공정률</span>
                    {summary.physicalProgressDate && (
                      <span className="text-[10px] text-gray-400">기준일: {summary.physicalProgressDate}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">기성 공정률 {fmtPct(summary.progressRate)}과 비교</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {summary.physicalProgressPlant != null && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500 font-semibold">식재 공정률</span>
                        <span className="font-black text-gray-800">{summary.physicalProgressPlant.toFixed(2)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(summary.physicalProgressPlant, 100)}%` }} />
                      </div>
                    </div>
                  )}
                  {summary.physicalProgressFacility != null && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500 font-semibold">시설 공정률</span>
                        <span className="font-black text-gray-800">{summary.physicalProgressFacility.toFixed(2)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(summary.physicalProgressFacility, 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 2. 식재 효율 분석 (수기장부 × 표준품셈) ── */}
            {effOverall && (
              <div className="bg-white border border-gray-100 rounded-2xl">
                <div className="px-5 border-b border-gray-100">
                  <SectionHeader
                    title="식재 효율 분석"
                    open={showEfficiency}
                    onToggle={() => setShowEfficiency(v => !v)}
                  />
                </div>
                {showEfficiency && (() => {
                  // ir = 실제/표준 * 100 (공수 투입률): 100% 초과 = 과투입, 미만 = 절약
                  const ir = effOverall.stdPersonDays > 0
                    ? Math.round(effOverall.actualPersonDays / effOverall.stdPersonDays * 100)
                    : null;
                  const color = !ir ? 'gray' : ir <= 110 ? 'green' : ir <= 150 ? 'amber' : 'red';
                  const colorMap = {
                    green: { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
                    amber: { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700' },
                    red:   { bar: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50',   badge: 'bg-red-100 text-red-700' },
                    gray:  { bar: 'bg-gray-300',  text: 'text-gray-600',  bg: 'bg-gray-50',  badge: 'bg-gray-100 text-gray-600' },
                  };
                  const c = colorMap[color];
                  const label = !ir ? '데이터 부족' : ir <= 110 ? '양호' : ir <= 150 ? '주의' : '과투입';

                  return (
                    <div className="px-5 py-4 space-y-5">
                      {/* 전체 효율 게이지 */}
                      <div className={`rounded-xl p-4 ${c.bg}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Zap size={15} className={c.text} />
                            <span className="text-sm font-bold text-gray-800">전체 식재 효율</span>
                            <span className="text-[10px] text-gray-400">실제 투입 / 표준 공수</span>
                          </div>
                          {ir && (
                            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${c.badge}`}>
                              {label} {ir}%
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold mb-0.5">표준 필요 공수</p>
                            <p className="text-lg font-black text-gray-800">{fmtN(effOverall.stdPersonDays)}인·일</p>
                            <p className="text-[10px] text-gray-400">표준품셈 기준</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold mb-0.5">실제 투입 공수</p>
                            <p className={`text-lg font-black ${c.text}`}>{fmtN(effOverall.actualPersonDays)}인·일</p>
                            <p className="text-[10px] text-gray-400">식재공 유형 합산</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold mb-0.5">공수 투입률</p>
                            <p className={`text-lg font-black ${c.text}`}>{ir ? `${ir}%` : '-'}</p>
                            <p className="text-[10px] text-gray-400">100% = 표준과 동일</p>
                          </div>
                        </div>
                        {ir && (
                          <div>
                            <div className="h-2 bg-white rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width: `${Math.min(ir, 100)}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {ir > 100 ? `표준 대비 ${ir - 100}% 초과 투입` : `표준의 ${ir}% 수준`}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 수종별 집계 */}
                      {effSpecies.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-700 mb-2">수종별 식재 현황</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[480px]">
                              <thead>
                                <tr className="text-[10px] text-gray-400 font-semibold border-b border-gray-50">
                                  <th className="text-left pb-2">수종</th>
                                  <th className="text-left pb-2">규격</th>
                                  <th className="text-center pb-2">구분</th>
                                  <th className="text-right pb-2">일당 기준</th>
                                  <th className="text-right pb-2">식재 누계</th>
                                  <th className="text-right pb-2">표준 공수</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {effSpecies.map((s, i) => (
                                  <tr key={i}>
                                    <td className="py-1.5 font-medium text-gray-800">{s.item}</td>
                                    <td className="py-1.5 text-gray-400">{s.spec || '-'}</td>
                                    <td className="py-1.5 text-center">
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${s.category === '교목' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                        {s.category}
                                      </span>
                                    </td>
                                    <td className="py-1.5 text-right text-gray-500">{fmtN(s.treesPerDay)}주/일</td>
                                    <td className="py-1.5 text-right font-bold text-gray-800">{fmtN(s.totalPlanted)}주</td>
                                    <td className="py-1.5 text-right text-gray-600">{s.totalStdPD}인·일</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 일별 효율 테이블 */}
                      {effDaily.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-700 mb-2">일별 효율 상세</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[520px]">
                              <thead>
                                <tr className="text-[10px] text-gray-400 font-semibold border-b border-gray-50">
                                  <th className="text-left pb-2">날짜</th>
                                  <th className="text-right pb-2">식재 인원</th>
                                  <th className="text-right pb-2">표준 공수</th>
                                  <th className="text-right pb-2">효율</th>
                                  <th className="text-left pb-2 pl-3">상태</th>
                                  <th className="text-right pb-2">굴삭기</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {[...effDaily].reverse().map((d) => {
                                  const dr = d.stdPersonDays > 0
                                    ? Math.round(d.actualPlantWorkers / d.stdPersonDays * 100)
                                    : null;
                                  const ec = !dr ? 'gray'
                                    : dr <= 110 ? 'green'
                                    : dr <= 150 ? 'amber'
                                    : 'red';
                                  const ecMap = {
                                    green: 'bg-green-100 text-green-700',
                                    amber: 'bg-amber-100 text-amber-700',
                                    red:   'bg-red-100 text-red-700',
                                    gray:  'bg-gray-100 text-gray-500',
                                  };
                                  return (
                                    <Fragment key={d.date}>
                                      <tr
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setEffDetailDate(v => v === d.date ? null : d.date)}
                                      >
                                        <td className="py-2 text-gray-600 font-medium">{d.date}</td>
                                        <td className="py-2 text-right text-gray-700">{d.actualPlantWorkers}명</td>
                                        <td className="py-2 text-right text-gray-600">{d.stdPersonDays}인·일</td>
                                        <td className="py-2 text-right font-bold text-gray-800">
                                          {dr ? `${dr}%` : '-'}
                                        </td>
                                        <td className="py-2 pl-3">
                                          {dr && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ecMap[ec]}`}>
                                              {dr <= 110 ? '양호' : dr <= 150 ? '주의' : '과투입'}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 text-right text-gray-400">
                                          {d.actualExcavator > 0 ? `${d.actualExcavator}일` : '-'}
                                        </td>
                                      </tr>
                                      {effDetailDate === d.date && d.species?.length > 0 && (
                                        <tr>
                                          <td colSpan={6} className="pb-2 pt-0">
                                            <div className="ml-4 bg-gray-50 rounded-lg px-3 py-2">
                                              <p className="text-[10px] text-gray-400 font-semibold mb-1">당일 식재 내역</p>
                                              {d.species.map((s, j) => (
                                                <div key={j} className="flex items-center justify-between text-[11px] py-0.5">
                                                  <span className="text-gray-700">{s.item} <span className="text-gray-400">{s.spec}</span></span>
                                                  <span className="text-gray-600">{fmtN(s.planted)}주 · 기준 {s.treesPerDay}주/일 · 표준 {s.stdPersonDays}인·일</span>
                                                </div>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── 3. 수목 식재 과투입 분석 ── */}
            {laborPlan && laborPlan.total > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl">
                <div className="px-5 border-b border-gray-100">
                  <SectionHeader
                    title="수목 식재 공수 분석"
                    open={showOverInvest}
                    onToggle={() => setShowOverInvest(v => !v)}
                  />
                </div>
                {showOverInvest && (
                  <div className="px-5 py-4 space-y-4">
                    {/* 공수 요약 게이지 */}
                    {(() => {
                      const ratio = laborActual?.ratio;
                      const actual = laborActual?.total || 0;
                      const planned = laborActual?.plannedSoFar || laborPlan.total;
                      const color = !ratio ? 'gray'
                        : ratio <= 110 ? 'green'
                        : ratio <= 130 ? 'amber'
                        : 'red';
                      const colorMap = {
                        green: { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
                        amber: { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
                        red:   { bar: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50',   badge: 'bg-red-100 text-red-700' },
                        gray:  { bar: 'bg-gray-300',  text: 'text-gray-600',  bg: 'bg-gray-50',  badge: 'bg-gray-100 text-gray-600' },
                      };
                      const c = colorMap[color];
                      const label = !ratio ? '데이터 부족' : ratio <= 110 ? '정상' : ratio <= 130 ? '주의' : '과투입';
                      return (
                        <div className={`rounded-xl p-4 ${c.bg}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Hammer size={15} className={c.text} />
                              <span className="text-sm font-bold text-gray-800">인원 투입 현황</span>
                            </div>
                            {ratio && (
                              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${c.badge}`}>
                                {label} {fmtPct(ratio)}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div>
                              <p className="text-[10px] text-gray-400 font-semibold mb-0.5">총 계획 공수</p>
                              <p className="text-lg font-black text-gray-800">{fmtN(Math.round(laborPlan.total))}인·일</p>
                              <p className="text-[10px] text-gray-400">조경공 {fmtN(Math.round(laborPlan.skilled))} + 인부 {fmtN(Math.round(laborPlan.unskilled))}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-semibold mb-0.5">공정률 기준 예상</p>
                              <p className={`text-lg font-black ${c.text}`}>{planned ? fmtN(Math.round(planned)) : '-'}인·일</p>
                              <p className="text-[10px] text-gray-400">공정률 {fmtPct(summary.progressRate)} 적용</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 font-semibold mb-0.5">실제 누계 공수</p>
                              <p className={`text-lg font-black ${c.text}`}>{fmtN(actual)}인·일</p>
                              <p className="text-[10px] text-gray-400">일보 누계 기준</p>
                            </div>
                          </div>
                          {planned > 0 && (
                            <div>
                              <div className="h-2 bg-white rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${c.bar}`}
                                  style={{ width: `${Math.min(ratio || 0, 200) / 2}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">예상 대비 {fmtPct(ratio || 0)} 투입</p>
                            </div>
                          )}
                          {laborPlan.excavator > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/50 grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[10px] text-gray-400">계획 굴착기</p>
                                <p className="text-sm font-bold text-gray-700">{fmtN(Math.round(laborPlan.excavator * 10) / 10)}일</p>
                              </div>
                              {laborActual?.excavator > 0 && (
                                <div>
                                  <p className="text-[10px] text-gray-400">실제 굴착기 누계</p>
                                  <p className="text-sm font-bold text-gray-700">{fmtN(laborActual.excavator)}시간</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 수종별 계획 공수 테이블 */}
                    {plantingAnalysis.filter(p => p.planned).length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[500px]">
                          <thead>
                            <tr className="text-[10px] text-gray-400 font-semibold border-b border-gray-50">
                              <th className="text-left pb-2">수종</th>
                              <th className="text-left pb-2">규격</th>
                              <th className="text-right pb-2">수량</th>
                              <th className="text-right pb-2">일/주 기준</th>
                              <th className="text-right pb-2">계획 인원·일</th>
                              <th className="text-right pb-2">장비</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {plantingAnalysis.filter(p => p.planned).map((p, i) => (
                              <tr key={i}>
                                <td className="py-1.5 font-medium text-gray-700">{p.species_name}</td>
                                <td className="py-1.5 text-gray-400">{p.spec}</td>
                                <td className="py-1.5 text-right text-gray-600">{fmtN(p.quantity)}주</td>
                                <td className="py-1.5 text-right text-gray-500">{p.planned.treesPerDay}주/일</td>
                                <td className="py-1.5 text-right font-semibold text-gray-800">
                                  {fmtN(Math.round((p.planned.skilled + p.planned.unskilled) * 10) / 10)}인·일
                                </td>
                                <td className="py-1.5 text-right text-gray-400">
                                  {p.planned.excavator > 0 && `굴착기 ${Math.round(p.planned.excavator * 10) / 10}일`}
                                  {p.planned.crane > 0 && ` 크레인 ${Math.round(p.planned.crane * 10) / 10}일`}
                                  {!p.planned.excavator && !p.planned.crane && '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* AI 분석 버튼 */}
                    <div className="pt-2 border-t border-gray-100">
                      {!aiAnalysis ? (
                        <button
                          onClick={fetchAiAnalysis}
                          disabled={aiLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          {aiLoading
                            ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />분석 중...</>
                            : <><Sparkles size={13} />AI 과투입 분석</>
                          }
                        </button>
                      ) : (
                        <div className="bg-purple-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Sparkles size={13} className="text-purple-600" />
                              <span className="text-xs font-bold text-purple-800">AI 분석 결과</span>
                            </div>
                            <button onClick={() => setAiAnalysis(null)} className="text-xs text-purple-400 hover:text-purple-600">재분석</button>
                          </div>
                          <p className="text-xs text-purple-900 leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 3. 비용 현황 ── */}
            <div className="bg-white border border-gray-100 rounded-2xl">
              <div className="px-5 border-b border-gray-100">
                <SectionHeader
                  title="비용 현황"
                  count={settlementCosts.filter(s => s.total > 0).length}
                  open={showCosts}
                  onToggle={() => setShowCosts(v => !v)}
                />
              </div>
              {showCosts && (
                <div className="px-5 py-4">
                  {settlementCosts.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-4">비용 내역 없음</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] text-gray-400 font-semibold border-b border-gray-50">
                          <th className="text-left pb-2 font-semibold">항목</th>
                          <th className="text-right pb-2 font-semibold">누계 금액</th>
                          <th className="text-right pb-2 font-semibold w-16">기성 대비</th>
                          <th className="pb-2 w-24 pl-4" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {settlementCosts.map((s, i) => {
                          const pct = summary.earnedValue > 0 ? (s.total / summary.earnedValue * 100) : 0;
                          const barColor = pct > 100 ? 'red' : pct > 70 ? 'amber' : 'blue';
                          return (
                            <tr key={i} className={s.total === 0 ? 'opacity-30' : ''}>
                              <td className="py-2.5 text-xs font-medium text-gray-700">{s.item}</td>
                              <td className="py-2.5 text-right text-xs font-bold text-gray-800">{fmtN(s.total)}원</td>
                              <td className="py-2.5 text-right text-xs text-gray-400">{pct > 0 ? fmtPct(pct) : '-'}</td>
                              <td className="py-2.5 pl-4">
                                {s.total > 0 && <ProgressBar pct={pct} color={barColor} />}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-gray-200">
                          <td className="pt-3 text-xs font-bold text-gray-900">합계</td>
                          <td className="pt-3 text-right text-xs font-black text-gray-900">{fmtN(summary.totalCost)}원</td>
                          <td className="pt-3 text-right text-xs font-bold text-gray-600">
                            {summary.earnedValue > 0 ? fmtPct(summary.totalCost / summary.earnedValue * 100) : '-'}
                          </td>
                          <td className="pt-3 pl-4">
                            {summary.earnedValue > 0 && (
                              <ProgressBar
                                pct={summary.totalCost / summary.earnedValue * 100}
                                color={summary.totalCost > summary.earnedValue ? 'red' : 'green'}
                              />
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* ── 3. 수종별 계획 vs 실적 ── */}
            <div className="bg-white border border-gray-100 rounded-2xl">
              <div className="px-5 border-b border-gray-100">
                <SectionHeader
                  title={`수종별 계획 vs 반입 실적${data?.hasEstimate ? ' (계약내역 기준)' : ' (공정표 기준)'}`}
                  count={treeRows.length}
                  open={showTrees}
                  onToggle={() => setShowTrees(v => !v)}
                />
              </div>
              {showTrees && (
                <div className="px-5 py-4 overflow-x-auto">
                  {treeRows.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-4">공정표 또는 수목반입 데이터 없음</p>
                  ) : (
                    <table className="w-full text-sm min-w-[540px]">
                      <thead>
                        <tr className="text-[11px] text-gray-400 font-semibold border-b border-gray-50">
                          <th className="text-left pb-2 font-semibold">수종</th>
                          <th className="text-left pb-2 font-semibold">규격</th>
                          <th className="text-right pb-2 font-semibold">계획</th>
                          <th className="text-right pb-2 font-semibold">반입 누계</th>
                          <th className="text-right pb-2 font-semibold">진행률</th>
                          <th className="text-right pb-2 font-semibold">반입 금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {treeRows.map((row, i) => {
                          const pct = row.planned > 0 ? (row.actual / row.planned * 100) : (row.actual > 0 ? 100 : 0);
                          return (
                            <tr key={i} className={row.onlyActual ? 'bg-amber-50/40' : ''}>
                              <td className="py-2 text-xs font-medium text-gray-800">
                                {row.species}
                                {row.onlyActual && <span className="ml-1 text-[9px] text-amber-500 font-bold">공정표 미등록</span>}
                                {row.onlyPlan && row.actual === 0 && <span className="ml-1 text-[9px] text-gray-300 font-bold">미반입</span>}
                              </td>
                              <td className="py-2 text-xs text-gray-500">{row.spec}</td>
                              <td className="py-2 text-right text-xs text-gray-500">{row.planned > 0 ? `${fmtN(row.planned)}${row.unit}` : '-'}</td>
                              <td className="py-2 text-right text-xs font-bold text-gray-800">{row.actual > 0 ? `${fmtN(row.actual)}${row.unit}` : '-'}</td>
                              <td className="py-2 text-right text-xs font-semibold">
                                {pct > 0 ? (
                                  <span className={pct >= 100 ? 'text-green-600' : pct >= 50 ? 'text-blue-600' : 'text-amber-500'}>
                                    {fmtPct(pct)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="py-2 text-right text-xs text-gray-500">{row.totalAmount > 0 ? fmtN(row.totalAmount) + '원' : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* ── 4. 현장 인원 투입 이력 ── */}
            <div className="bg-white border border-gray-100 rounded-2xl">
              <div className="px-5 border-b border-gray-100">
                <SectionHeader
                  title="현장 인원 투입 이력"
                  count={dailyLabor.length > 0 ? `${dailyLabor.length}일 · 총 ${fmtN(totalLaborPersonDays)}인` : null}
                  open={showLabor}
                  onToggle={() => setShowLabor(v => !v)}
                />
              </div>
              {showLabor && (
                <div className="px-5 py-4 overflow-x-auto">
                  {dailyLabor.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-4">현장출력현황 데이터 없음</p>
                  ) : (
                    <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] text-gray-400 font-semibold border-b border-gray-50">
                            <th className="text-left pb-2 font-semibold">날짜</th>
                            <th className="text-right pb-2 font-semibold">투입 인원</th>
                            <th className="text-right pb-2 font-semibold">당일 노무비</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {[...dailyLabor].reverse().map((d, i) => (
                            <tr key={i}>
                              <td className="py-2 text-xs text-gray-600">{d.date}</td>
                              <td className="py-2 text-right text-xs font-bold text-gray-800">
                                <span className="inline-flex items-center gap-1">
                                  <Users size={11} className="text-gray-400" />
                                  {fmtN(d.count)}명
                                </span>
                              </td>
                              <td className="py-2 text-right text-xs text-gray-500">{d.amount > 0 ? fmtN(d.amount) + '원' : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td className="pt-3 text-xs font-bold text-gray-900">합계</td>
                            <td className="pt-3 text-right text-xs font-black text-gray-900">{fmtN(totalLaborPersonDays)}인</td>
                            <td className="pt-3 text-right text-xs font-bold text-gray-600">
                              {fmtN(settlementCosts.find(s => s.item === '노무비')?.total || 0)}원
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                      <p className="text-[10px] text-gray-300 mt-3">* 당일 노무비는 일보 작성 시점 현장출력현황 기준이며, 누계 노무비는 기성내역(상단)을 기준으로 합니다.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>}
    </div>
  );
}
