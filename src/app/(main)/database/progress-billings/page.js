import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { Receipt, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function ProgressBillingsPage() {
  noStore();

  const { data: sites } = await supabase
    .from('construction_sites')
    .select('id, name, status, start_date, end_date')
    .order('name');

  const { data: billings } = await supabase
    .from('progress_billings')
    .select('site_id, billing_round, total_amount, billing_date')
    .order('billing_round', { ascending: false });

  const { data: receipts } = await supabase
    .from('progress_billing_receipts')
    .select('billing_id, received_amount');

  const billingBySite = {};
  for (const b of billings || []) {
    if (!billingBySite[b.site_id]) billingBySite[b.site_id] = { rounds: 0, totalBilled: 0 };
    billingBySite[b.site_id].rounds = Math.max(billingBySite[b.site_id].rounds, b.billing_round);
    billingBySite[b.site_id].totalBilled += Number(b.total_amount) || 0;
  }
  const billingIds = (billings || []).map(b => b.id);
  const receiptMap = {};
  for (const r of receipts || []) {
    receiptMap[r.billing_id] = (receiptMap[r.billing_id] || 0) + (Number(r.received_amount) || 0);
  }

  const fmtB = (n) => {
    const v = Number(n) || 0;
    if (!v) return '-';
    if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(2)}억`;
    return `${Math.round(v / 10000).toLocaleString()}만원`;
  };
  const statusColor = { 진행: 'bg-blue-100 text-blue-700', 완료: 'bg-gray-100 text-gray-500', 대기: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase mb-0.5">데이터베이스</p>
        <h1 className="text-xl font-bold text-gray-900">기성 청구 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">현장별 기성 청구 내역 및 수령 이력</p>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-2">
        {(sites || []).map(site => {
          const info = billingBySite[site.id];
          return (
            <Link
              key={site.id}
              href={`/database/progress-billings/${site.id}`}
              className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <Receipt size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{site.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {info ? `${info.rounds}회차 청구 · 누계 ${fmtB(info.totalBilled)}` : '청구 내역 없음'}
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
