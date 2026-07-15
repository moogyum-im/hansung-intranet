import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import SiteGanttClient from './SiteGanttClient';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 공사기간에 해당하는 모든 분기 목록 생성
function getExpectedQuarters(startDate, endDate, siteName) {
  const quarters = [];
  if (!startDate || !endDate) return quarters;

  const start = new Date(startDate);
  const end   = new Date(endDate);

  let year = start.getFullYear();
  let q    = Math.ceil((start.getMonth() + 1) / 3);

  while (true) {
    const qStartMonth = (q - 1) * 3;
    const qStart = new Date(year, qStartMonth, 1);
    if (qStart > end) break;

    const qEndMonth = q * 3;         // 0-indexed: Mar=2→3, Jun=5→6 …
    const qEnd = new Date(year, qEndMonth, 0); // 해당 월 마지막 날

    const mm = (m) => String(m + 1).padStart(2, '0');
    quarters.push({
      year,
      quarter: q,
      key: `${year}-${q}`,
      start_date: `${year}-${mm(qStartMonth)}-01`,
      end_date:   `${year}-${mm(qEndMonth - 1)}-${qEnd.getDate()}`,
      title:      `${siteName} ${year}년 ${q}분기`,
    });

    q++;
    if (q > 4) { q = 1; year++; }
  }
  return quarters;
}

export default async function SiteExecutionPlanPage({ params, searchParams }) {
  noStore();
  const { siteId } = params;
  const initialPlanId = searchParams?.planId || null;

  const { data: site, error } = await supabase
    .from('construction_sites')
    .select('id, name, start_date, end_date, budget, status')
    .eq('id', siteId)
    .single();

  if (error || !site) notFound();

  // 기존 플랜 조회
  const { data: existingPlans } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('site_id', siteId)
    .order('start_date', { ascending: true });

  const existingKeys = new Set(
    (existingPlans || []).map(p => {
      const d = new Date(p.start_date);
      return `${d.getFullYear()}-${Math.ceil((d.getMonth() + 1) / 3)}`;
    })
  );

  // 공사기간 기반 필요 분기 계산 후 없는 분기 자동 생성
  const expectedQuarters = getExpectedQuarters(site.start_date, site.end_date, site.name);
  const toCreate = expectedQuarters.filter(q => !existingKeys.has(q.key));

  if (toCreate.length > 0) {
    await supabase.from('execution_plans').insert(
      toCreate.map(q => ({
        site_id:         siteId,
        title:           q.title,
        start_date:      q.start_date,
        end_date:        q.end_date,
        execution_price: 0,
        status:          '계획',
      }))
    );
  }

  // 전체 플랜 재조회 (새로 생성된 것 포함)
  const { data: plans } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('site_id', siteId)
    .order('start_date', { ascending: true });

  const plansWithItems = await Promise.all(
    (plans || []).map(async (plan) => {
      const { data: items } = await supabase
        .from('execution_items')
        .select('*, periods:execution_item_periods(*)')
        .eq('plan_id', plan.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      return { ...plan, items: items || [] };
    })
  );

  return <SiteGanttClient site={site} initialPlans={plansWithItems} initialPlanId={initialPlanId} />;
}
