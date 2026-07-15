import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/formAccessLevel';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, department, full_name')
      .eq('id', user.id)
      .single();
    if (!isAdmin(profile)) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

    const body = await request.json();
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await adminSupabase
      .from('forms')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    adminSupabase.from('form_activity_log').insert({
      form_id: params.id,
      form_title: data.title,
      user_id: user.id,
      actor_name: profile?.full_name || '알 수 없음',
      action: 'edit',
      detail: { changes: Object.keys(body) },
    }).catch(() => {});

    return NextResponse.json({ form: data });
  } catch (err) {
    console.error('PATCH /api/forms/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, department, full_name')
      .eq('id', user.id)
      .single();
    if (!isAdmin(profile)) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: form } = await adminSupabase
      .from('forms')
      .select('title')
      .eq('id', params.id)
      .single();

    const { data: versions } = await adminSupabase
      .from('form_versions')
      .select('file_path')
      .eq('form_id', params.id);

    if (versions?.length > 0) {
      await adminSupabase.storage.from('forms').remove(versions.map(v => v.file_path));
    }

    await adminSupabase.from('form_activity_log').insert({
      form_id: params.id,
      form_title: form?.title || '',
      user_id: user.id,
      actor_name: profile?.full_name || '알 수 없음',
      action: 'delete',
      detail: {},
    }).catch(() => {});

    const { error } = await adminSupabase.from('forms').delete().eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/forms/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
