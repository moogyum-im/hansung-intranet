import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { FileSpreadsheet, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function ExecutionEstimatesPage() {
  noStore();

  const { data: sites } = await supabase
    .from('construction_sites')
    .select('id, name, status, start_date, end_date')
    .order('name');

  const { data: estimates } = await supabase
    .from('execution_estimates')
    .select('site_id, version, version_label, is_current, created_at')
    .eq('is_current', true);

  const estimateMap = Object.fromEntries((estimates || []).map(e => [e.site_id, e]));

  const statusColor = { 진행: 'bg-blue-100 text-blue-700', 완료: 'bg-gray-100 text-gray-500', 대기: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase mb-0.5">데이터베이스</p>
        <h1 className="text-xl font-bold text-gray-900">내역 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">현장별 계약 내역 · 실행 내역서 및 설계변경 이력</p>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-2">
        {(sites || []).map(site => {
          const est = estimateMap[site.id];
          return (
            <Link
              key={site.id}
              href={`/database/execution-estimates/${site.id}`}
              className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{site.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {est ? `${est.version_label} 등록됨` : '실행 내역 없음'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[site.status] || 'bg-gray-100 text-gray-400'}`}>
                  {site.status || '알 수 없음'}
                </span>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
