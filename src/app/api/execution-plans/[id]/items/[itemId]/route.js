import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PUT(req, { params }) {
  const { itemId } = params;
  const body = await req.json();

  const { data, error } = await supabase
    .from('execution_items')
    .update(body)
    .eq('id', itemId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_, { params }) {
  const { itemId } = params;
  const { error } = await supabase.from('execution_items').delete().eq('id', itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
