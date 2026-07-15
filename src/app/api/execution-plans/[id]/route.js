import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(_, { params }) {
  const { id } = params;

  const { data: plan, error: planErr } = await supabase
    .from('execution_plans')
    .select('*, site:construction_sites(name)')
    .eq('id', id)
    .single();

  if (planErr) return NextResponse.json({ error: planErr.message }, { status: 404 });

  const { data: items, error: itemErr } = await supabase
    .from('execution_items')
    .select('*, periods:execution_item_periods(*)')
    .eq('plan_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });

  return NextResponse.json({ ...plan, items: items || [] });
}

export async function DELETE(_, { params }) {
  const { id } = params;
  const { error } = await supabase.from('execution_plans').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
