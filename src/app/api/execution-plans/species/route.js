import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 카테고리별 기존 수종명 목록 (execution_items에서 중복 제거 후 반환)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  let query = supabase.from('execution_items').select('species_name');
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return NextResponse.json([], { status: 200 });

  const unique = [...new Set((data || []).map(d => d.species_name).filter(Boolean))].sort();
  return NextResponse.json(unique);
}
