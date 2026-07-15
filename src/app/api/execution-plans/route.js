import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const { data, error } = await supabase
    .from('execution_plans')
    .select('*, site:construction_sites(name)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const body = await req.json();
  const { title, site_id, start_date, end_date, execution_price, status } = body;

  if (!title?.trim() || !start_date || !end_date) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
  }

  // 같은 현장 + 같은 분기 중복 방지
  if (site_id) {
    const { data: existing } = await supabase
      .from('execution_plans')
      .select('id')
      .eq('site_id', site_id)
      .eq('start_date', start_date)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 분기입니다.', existingId: existing.id },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from('execution_plans')
    .insert({ title: title.trim(), site_id: site_id || null, start_date, end_date, execution_price: execution_price || 0, status: status || '계획' })
    .select('*, site:construction_sites(name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
