import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { data: forwards, error } = await adminSupabase
      .from('form_forwards')
      .select(`
        id, sender_name, message, created_at, read_at,
        form:forms!form_id(
          id, title, description, access_level, is_pinned, download_count,
          label:form_labels!label_id(id, name, color),
          latest_version:form_versions(version_number)
        )
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 즐겨찾기 여부 조회
    const { data: favs } = await adminSupabase
      .from('form_favorites')
      .select('form_id')
      .eq('user_id', user.id);

    const favSet = new Set((favs || []).map(f => f.form_id));

    const enriched = (forwards || []).map(fw => ({
      ...fw,
      form: fw.form ? {
        ...fw.form,
        is_favorite: favSet.has(fw.form.id),
        latest_version: Array.isArray(fw.form.latest_version)
          ? fw.form.latest_version[0] || null
          : fw.form.latest_version,
      } : null,
    }));

    return NextResponse.json({ forwards: enriched });
  } catch (err) {
    console.error('GET /api/form-forwards error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
