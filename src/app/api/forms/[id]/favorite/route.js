import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  // 이미 즐겨찾기 여부 확인
  const { data: existing } = await supabase
    .from('form_favorites')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('form_id', params.id)
    .single();

  if (existing) {
    await supabase.from('form_favorites').delete().eq('user_id', user.id).eq('form_id', params.id);
    return NextResponse.json({ is_favorite: false });
  } else {
    await supabase.from('form_favorites').insert({ user_id: user.id, form_id: params.id });
    return NextResponse.json({ is_favorite: true });
  }
}
