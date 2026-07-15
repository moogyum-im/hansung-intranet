import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validateCode(code) {
  const { data } = await supabaseAdmin
    .from('supplier_tokens')
    .select('company_name, is_active')
    .eq('code', code)
    .single();
  if (!data || !data.is_active) return null;
  return data.company_name;
}

export async function POST(req, { params }) {
  const { code } = params;
  const company_name = await validateCode(code);
  if (!company_name) {
    return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 403 });
  }

  const body = await req.json();
  const { region, tree_name, size, price, quantity, contact_info, remarks } = body;
  const row_company_name = body.company_name || company_name;

  const { data, error } = await supabaseAdmin
    .from('tree_sales_info')
    .insert({
      region,
      tree_name,
      size,
      price: price ? parseInt(String(price).replace(/,/g, ''), 10) : null,
      quantity: quantity ? parseInt(String(quantity).replace(/,/g, ''), 10) : null,
      company_name: row_company_name,
      contact_info,
      remarks,
      supplier_token_code: code,
      last_updated: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
