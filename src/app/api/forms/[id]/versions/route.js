import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/formAccessLevel';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
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

    const formData = await request.formData();
    const file = formData.get('file');
    const changeNote = formData.get('change_note') || '';

    if (!file) return NextResponse.json({ error: '파일이 필요합니다' }, { status: 400 });

    const { data: versions } = await adminSupabase
      .from('form_versions')
      .select('version_number')
      .eq('form_id', params.id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (versions?.[0]?.version_number || 0) + 1;

    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${params.id}_v${nextVersion}_${Date.now()}.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminSupabase.storage
      .from('forms')
      .upload(filePath, fileBuffer, { contentType: file.type });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: newVersion, error } = await adminSupabase
      .from('form_versions')
      .insert({
        form_id: params.id,
        version_number: nextVersion,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        change_note: changeNote,
        uploader_id: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: form } = await adminSupabase.from('forms').select('title').eq('id', params.id).single();

    await Promise.all([
      adminSupabase.from('forms').update({ updated_at: new Date().toISOString() }).eq('id', params.id),
      adminSupabase.from('form_activity_log').insert({
        form_id: params.id,
        form_title: form?.title || '',
        user_id: user.id,
        actor_name: profile?.full_name || '알 수 없음',
        action: 'version_upload',
        detail: { version_number: nextVersion, file_name: file.name, change_note: changeNote },
      }),
    ]).catch(() => {});

    return NextResponse.json({ version: newVersion }, { status: 201 });
  } catch (err) {
    console.error('POST /api/forms/[id]/versions error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
