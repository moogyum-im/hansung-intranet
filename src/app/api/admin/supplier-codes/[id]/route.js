import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PATCH(req, { params }) {
  const { id } = params;
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from('supplier_tokens')
    .update({ is_active: body.is_active })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req, { params }) {
  const { id } = params;

  // 코드 조회
  const { data: token } = await supabaseAdmin
    .from('supplier_tokens')
    .select('code')
    .eq('id', id)
    .single();

  if (token?.code) {
    // 연결된 수목 데이터 먼저 삭제
    await supabaseAdmin
      .from('tree_sales_info')
      .delete()
      .eq('supplier_token_code', token.code);
  }

  const { error } = await supabaseAdmin
    .from('supplier_tokens')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
