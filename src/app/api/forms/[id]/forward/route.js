import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { recipient_ids, message } = await request.json();
    if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return NextResponse.json({ error: '수신자를 지정해주세요' }, { status: 400 });
    }

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const inserts = recipient_ids.map(rid => ({
      form_id: params.id,
      sender_id: user.id,
      recipient_id: rid,
      sender_name: profile?.full_name || '알 수 없음',
      message: message || null,
    }));

    const { error } = await adminSupabase
      .from('form_forwards')
      .upsert(inserts, { onConflict: 'form_id,sender_id,recipient_id', ignoreDuplicates: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, count: inserts.length });
  } catch (err) {
    console.error('POST /api/forms/[id]/forward error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
