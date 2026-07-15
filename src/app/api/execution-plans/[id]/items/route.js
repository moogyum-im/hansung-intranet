import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req, { params }) {
  const { id } = params;
  const body = await req.json();
  const { category, species_name, spec, unit, quantity, sort_order } = body;

  if (!category || !species_name?.trim()) {
    return NextResponse.json({ error: '공종과 수종명은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('execution_items')
    .insert({
      plan_id: id,
      category,
      species_name: species_name.trim(),
      spec: spec?.trim() || '',
      unit: unit || '주',
      quantity: Number(quantity) || 0,
      sort_order: sort_order || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
