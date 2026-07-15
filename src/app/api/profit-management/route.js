import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const { data: sites, error } = await supabase
    .from('construction_sites')
    .select('id, name, status, start_date, end_date, budget')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: plans } = await supabase
    .from('contract_profit_plans')
    .select('*');

  const planMap = Object.fromEntries((plans || []).map(p => [p.site_id, p]));

  const result = (sites || []).map(site => ({
    ...site,
    profitPlan: planMap[site.id] || null,
  }));

  return Response.json(result);
}
