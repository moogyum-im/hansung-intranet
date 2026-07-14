import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/formAccessLevel';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase
    .from('form_labels')
    .select('*')
    .order('sort_order')
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ labels: data });
}

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, department').eq('id', user.id).single();
  if (!isAdmin(profile)) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const body = await request.json();
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await adminSupabase
    .from('form_labels')
    .insert({ name: body.name, color: body.color || '#3b82f6' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ label: data }, { status: 201 });
}

export async function DELETE(request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, department').eq('id', user.id).single();
  if (!isAdmin(profile)) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await adminSupabase.from('form_labels').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
