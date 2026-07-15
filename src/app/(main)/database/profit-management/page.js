import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { TrendingUp, TrendingDown, Minus, ChevronRight, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function parseNotes(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

function safeNum(v) { return Number(v) || 0; }

const fmtB = (n) => {
  const v = Number(n) || 0;
  if (!v) return '-';
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (Math.abs(v) >= 10000)     return `${Math.round(v / 10000).toLocaleString()}만원`;
  return `${v.toLocaleString()}원`;
};

const STATUS_MAP = { '진행중': '진행', '진행': '진행', '완료': '완료', '대기': '계획', '보류': '계획', '중단': '중단' };
const STATUS_STYLE = {
  진행: 'bg-blue-100 text-blue-700',
  완료: 'bg-gray-100 text-gray-500',
  계획: 'bg-amber-100 text-amber-700',
  중단: 'bg-red-100 text-red-500',
};

export default async function ProfitManagementList() {
  noStore();

  const [{ data: sites }, { data: allReports }] = await Promise.all([
    supabase
      .from('construction_sites')
      .select('id, name, status, start_date, end_date, budget')
      .order('created_at', { ascending: false }),
    supabase
      .from('daily_site_reports')
      .select('site_id, report_date, notes')
      .order('report_date', { ascending: false }),
  ]);

  // 현장별 최신 일보 + 건수 집계
  const latestBySite = {};
  const countBySite = {};
  for (const r of (allReports || [])) {
    countBySite[r.site_id] = (countBySite[r.site_id] || 0) + 1;
    if (!latestBySite[r.site_id]) latestBySite[r.site_id] = r;
  }

  const rows = (sites || []).map(site => {
    const latest = latestBySite[site.id];
    if (!latest) return { ...site, hasReport: false, progressRate: 0, contractAmount: site.budget || 0, earnedValue: 0, totalCost: 0, profit: 0, profitRate: 0, reportCount: 0, lastDate: null };

    const notes = parseNotes(latest.notes);
    const progressRate   = safeNum(notes.progress_plant);
    const contractAmount = safeNum(notes.total_contract_amount) || safeNum(site.budget);
    const earnedValue    = Math.round(contractAmount * progressRate / 100);
    const totalCost      = (notes.settlement_costs || []).reduce((s, c) => s + safeNum(c.total), 0);
    const profit         = earnedValue - totalCost;
    const profitRate     = contractAmount > 0 ? (profit / contractAmount * 100) : 0;

    return {
      ...site,
      hasReport: true,
      progressRate,
      contractAmount,
      earnedValue,
      totalCost,
      profit,
      profitRate,
      reportCount: countBySite[site.id] || 0,
      lastDate: latest.report_date,
    };
  });

  const totalSites    = rows.length;
  const reportedCount = rows.filter(r => r.hasReport).length;
  const inProgress    = rows.filter(r => ['진행중','진행'].includes(r.status)).length;
  const noReportCount = rows.filter(r => !r.hasReport).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <p className="text-xs text-gray-400 font-semibold tracking-widest uppercase mb-1">수익 실행 관리</p>
          <h1 className="text-2xl font-bold text-gray-900">현장별 수익 현황</h1>
          <p className="text-sm text-gray-400 mt-1">작업일보 기준 공정률 · 투입비용 · 수익률 자동 집계</p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: '전체 현장',    value: totalSites,    unit: '건', color: 'text-gray-900' },
            { label: '진행 중',      value: inProgress,    unit: '건', color: 'text-blue-600' },
            { label: '일보 등록',    value: reportedCount, unit: '건', color: 'text-green-600' },
            { label: '일보 미등록',  value: noReportCount, unit: '건', color: 'text-gray-400' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400 font-medium mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>
                {card.value}<span className="text-sm font-normal ml-1">{card.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">현장명</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">상태</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">계약금액</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">공정률</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">기성 청구액</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">총 투입비용</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">수익률</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">일보</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => {
                const status = STATUS_MAP[row.status] || '계획';

                const profitColor = !row.hasReport
                  ? 'text-gray-300'
                  : row.profitRate >= 15 ? 'text-green-600'
                  : row.profitRate >= 0  ? 'text-amber-600'
                  : 'text-red-600';

                const ProfitIcon = !row.hasReport ? Minus
                  : row.profitRate >= 15 ? TrendingUp
                  : row.profitRate >= 0  ? Minus
                  : TrendingDown;

                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">{row.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {row.start_date?.slice(0,7)} ~ {row.end_date?.slice(0,7)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLE[status] || STATUS_STYLE['계획']}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-semibold text-gray-800">
                        {row.contractAmount > 0 ? fmtB(row.contractAmount) : <span className="text-gray-300 text-xs">-</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {row.hasReport
                        ? <span className="text-sm font-bold text-blue-600">{row.progressRate.toFixed(1)}%</span>
                        : <span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-gray-600">
                        {row.earnedValue > 0 ? fmtB(row.earnedValue) : <span className="text-gray-300 text-xs">-</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-gray-600">
                        {row.totalCost > 0
                          ? <span className={row.totalCost > row.earnedValue ? 'text-red-500 font-semibold' : ''}>{fmtB(row.totalCost)}</span>
                          : <span className="text-gray-300 text-xs">-</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-sm font-bold ${profitColor}`}>
                        <ProfitIcon size={13} />
                        {row.hasReport && row.contractAmount > 0 ? `${row.profitRate.toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {row.hasReport
                        ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                            <FileText size={11} />
                            {row.reportCount}건
                          </span>
                        )
                        : <span className="text-[10px] text-gray-300 font-medium">미등록</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/database/profit-management/${row.id}`}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity font-semibold whitespace-nowrap"
                      >
                        상세 <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="text-center py-16 text-gray-300 text-sm">등록된 현장이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
