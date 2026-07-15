import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validateCode(code) {
  const { data } = await supabaseAdmin
    .from('supplier_tokens')
    .select('is_active')
    .eq('code', code)
    .single();
  return data?.is_active ?? false;
}

export async function PATCH(req, { params }) {
  const { code, id } = params;
  if (!await validateCode(code)) {
    return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 403 });
  }

  const body = await req.json();
  const { region, tree_name, size, price, quantity, contact_info, remarks } = body;

  const { data, error } = await supabaseAdmin
    .from('tree_sales_info')
    .update({
      region,
      tree_name,
      size,
      price: price ? parseInt(String(price).replace(/,/g, ''), 10) : null,
      quantity: quantity ? parseInt(String(quantity).replace(/,/g, ''), 10) : null,
      contact_info,
      remarks,
      last_updated: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('supplier_token_code', code)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req, { params }) {
  const { code, id } = params;
  if (!await validateCode(code)) {
    return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('tree_sales_info')
    .delete()
    .eq('id', id)
    .eq('supplier_token_code', code);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
