import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(_req, { params }) {
  const { code } = params;

  const { data: token, error } = await supabaseAdmin
    .from('supplier_tokens')
    .select('code, company_name, is_active')
    .eq('code', code)
    .single();

  if (error || !token) {
    return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 404 });
  }
  if (!token.is_active) {
    return NextResponse.json({ error: '비활성화된 코드입니다.' }, { status: 403 });
  }

  const { data: trees } = await supabaseAdmin
    .from('tree_sales_info')
    .select('*')
    .eq('supplier_token_code', code)
    .order('tree_name', { ascending: true });

  return NextResponse.json({ company_name: token.company_name, trees: trees || [] });
}
