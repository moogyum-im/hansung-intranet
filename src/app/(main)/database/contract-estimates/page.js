import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { ChevronRight, FileSpreadsheet } from 'lucide-react';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getSiteGroup(status) {
  if (!status) return 'wait';
  if (['진행중', '진행'].includes(status)) return 'active';
  if (['완료', '준공'].includes(status)) return 'done';
  return 'wait';
}

const GROUP_META = {
  active: { label: '진행 중',     dot: 'bg-blue-500' },
  wait:   { label: '대기 · 보류', dot: 'bg-amber-400' },
  done:   { label: '준공 완료',   dot: 'bg-gray-300' },
};

export default async function ContractEstimatesListPage() {
  noStore();

  const [{ data: sites }, { data: estimates }] = await Promise.all([
    supabase
      .from('construction_sites')
      .select('id, name, status, start_date, end_date')
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_estimates')
      .select('site_id, version, version_label, version_date, is_current')
      .order('version', { ascending: false }),
  ]);

  // 현장별 최신 버전 및 버전 수
  const latestBySite = {};
  const countBySite = {};
  for (const est of (estimates || [])) {
    countBySite[est.site_id] = (countBySite[est.site_id] || 0) + 1;
    if (!latestBySite[est.site_id]) latestBySite[est.site_id] = est;
  }

  const rows = (sites || []).map(site => ({
    ...site,
    group: getSiteGroup(site.status),
    latest: latestBySite[site.id] || null,
    versionCount: countBySite[site.id] || 0,
  }));

  const grouped = {
    active: rows.filter(r => r.group === 'active'),
    wait:   rows.filter(r => r.group === 'wait'),
    done:   rows.filter(r => r.group === 'done'),
  };

  const totalWithEstimate = rows.filter(r => r.latest).length;

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      {/* 헤더 */}
      <header className="mb-6">
        <p className="text-[11px] text-gray-400 font-semibold tracking-widest uppercase mb-1">전략기획부</p>
        <h1 className="text-2xl font-bold text-gray-900">계약 내역 관리</h1>
        <p className="text-sm text-gray-400 mt-1">
          엑셀 업로드 → AI 자동 분석 · 설계변경 버전 관리
          {totalWithEstimate > 0 && (
            <span className="ml-2 text-[11px] text-gray-300">내역 등록 {totalWithEstimate}개 현장</span>
          )}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-300">
          <FileSpreadsheet size={40} className="mb-3" />
          <p className="text-sm font-medium">등록된 현장이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-10">
          {(['active', 'wait', 'done']).map(groupKey => {
            const groupSites = grouped[groupKey];
            if (groupSites.length === 0) return null;
            const meta = GROUP_META[groupKey];
            return (
              <section key={groupKey}>
                {/* 그룹 헤더 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{meta.label}</p>
                  <span className="text-xs text-gray-300">({groupSites.length})</span>
                </div>

                {/* 현장 카드 목록 */}
                <div className="space-y-2.5">
                  {groupSites.map(site => {
                    const isDone = site.group === 'done';
                    return (
                      <Link
                        key={site.id}
                        href={`/database/contract-estimates/${site.id}`}
                        className={`flex items-center bg-white border rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group ${
                          isDone ? 'border-gray-100 opacity-60' : 'border-gray-100'
                        }`}
                      >
                        <FileSpreadsheet
                          size={18}
                          className={`mr-4 flex-shrink-0 ${isDone ? 'text-gray-200' : 'text-gray-300'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h2 className="text-sm font-bold text-gray-900 truncate">{site.name}</h2>
                            {site.status && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                                site.group === 'active' ? 'bg-blue-50 text-blue-500' :
                                site.group === 'done'   ? 'bg-gray-50 text-gray-400' :
                                                          'bg-amber-50 text-amber-500'
                              }`}>{site.status}</span>
                            )}
                          </div>

                          {/* 버전 배지들 */}
                          {site.latest ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                v{site.latest.version} · {site.latest.version_label}
                                {site.latest.version_date && ` (${site.latest.version_date})`}
                              </span>
                              {site.versionCount > 1 && (
                                <span className="text-[10px] text-gray-400">
                                  총 {site.versionCount}개 버전
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-300">내역 미등록</span>
                          )}
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-gray-300 group-hover:text-gray-500 transition-colors ml-4 flex-shrink-0"
                        />
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
