import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(_, { params }) {
  const { siteId } = params;

  const { data: plans, error } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('site_id', siteId)
    .order('start_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 각 플랜의 items + periods 함께 조회
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

  return NextResponse.json(plansWithItems);
}
