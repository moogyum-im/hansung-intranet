import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req, { params }) {
  const { itemId } = params;
  const body = await req.json();
  const { start_date, end_date, note } = body;

  if (!start_date || !end_date) {
    return NextResponse.json({ error: '시작일과 종료일은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('execution_item_periods')
    .insert({ item_id: itemId, start_date, end_date, note: note || '' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
