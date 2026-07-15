import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import GanttClient from './GanttClient';

export default async function ExecutionPlanPage({ params }) {
  const { id } = params;
  const supabase = createServerComponentClient({ cookies });

  const { data: plan, error: planErr } = await supabase
    .from('execution_plans')
    .select('*, site:construction_sites(name)')
    .eq('id', id)
    .single();

  if (planErr || !plan) notFound();

  const { data: items } = await supabase
    .from('execution_items')
    .select('*, periods:execution_item_periods(*)')
    .eq('plan_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  return <GanttClient plan={plan} items={items || []} />;
}
