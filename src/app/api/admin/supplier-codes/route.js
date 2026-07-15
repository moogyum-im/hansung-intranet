import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('supplier_tokens')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const { company_name } = await req.json();
  if (!company_name?.trim()) {
    return NextResponse.json({ error: '업체명을 입력해주세요.' }, { status: 400 });
  }

  let code, attempts = 0;
  do {
    code = generateCode();
    const { data } = await supabaseAdmin.from('supplier_tokens').select('code').eq('code', code).single();
    if (!data) break;
    attempts++;
  } while (attempts < 5);

  const { data, error } = await supabaseAdmin
    .from('supplier_tokens')
    .insert({ code, company_name: company_name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
