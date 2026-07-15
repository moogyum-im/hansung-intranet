import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PUT(req, { params }) {
  const { periodId } = params;
  const body = await req.json();

  const { data, error } = await supabase
    .from('execution_item_periods')
    .update(body)
    .eq('id', periodId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_, { params }) {
  const { periodId } = params;
  const { error } = await supabase.from('execution_item_periods').delete().eq('id', periodId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
