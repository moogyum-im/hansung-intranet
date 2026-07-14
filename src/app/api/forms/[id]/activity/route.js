import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/formAccessLevel';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department')
    .eq('id', user.id)
    .single();

  if (!isAdmin(profile)) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

  const { data, error } = await supabase
    .from('form_activity_log')
    .select('*')
    .eq('form_id', params.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data });
}
