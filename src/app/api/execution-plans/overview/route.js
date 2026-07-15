import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const [{ data: sites, error: sErr }, { data: plans, error: pErr }] = await Promise.all([
    supabase.from('construction_sites').select('id, name, start_date, end_date, status, budget').order('name'),
    supabase.from('execution_plans').select('id, site_id, start_date, end_date, status, title').order('start_date', { ascending: true }),
  ]);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ sites: sites || [], plans: plans || [] });
}
