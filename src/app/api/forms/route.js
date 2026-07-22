import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserMinLevel, canAccessForm, isAdmin } from '@/lib/formAccessLevel';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, position, department, role, employment_type')
      .eq('id', user.id)
      .single();

    const { data: forms, error } = await supabase
      .from('forms')
      .select(`
        *,
        label:form_labels(id, name, color),
        uploader:profiles!uploader_id(full_name, position, department),
        versions:form_versions(id, version_number, file_path, file_name, file_size, change_note, created_at),
        favorites:form_favorites(user_id)
      `)
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const filtered = (forms || [])
      .filter(f => canAccessForm(f, profile))
      .map(f => {
        const sortedVersions = (f.versions || []).sort((a, b) => b.version_number - a.version_number);
        return {
          ...f,
          is_favorite: (f.favorites || []).some(fav => fav.user_id === user.id),
          latest_version: sortedVersions[0] || null,
          versions: sortedVersions,
          favorites: undefined,
        };
      });

    return NextResponse.json({
      forms: filtered,
      userMinLevel: getUserMinLevel(profile),
      isAdmin: isAdmin(profile),
    });
  } catch (err) {
    console.error('GET /api/forms error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department, full_name')
    .eq('id', user.id)
    .single();

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const formData = await request.formData();
  const file = formData.get('file');
  const title = formData.get('title');
  const description = formData.get('description') || null;
  const labelId = formData.get('label_id') || null;
  const accessLevel = parseInt(formData.get('access_level') || '5');
  const allowedDepts = formData.get('allowed_departments');
  const allowedEmploymentTypes = formData.get('allowed_employment_types');
  const isPinned = formData.get('is_pinned') === 'true';
  const expiresAt = formData.get('expires_at') || null;
  const changeNote = formData.get('change_note') || '최초 등록';

  if (!file || !title) return NextResponse.json({ error: '파일과 제목은 필수입니다' }, { status: 400 });

  const ext = file.name.split('.').pop();
  const filePath = `${user.id}/${Date.now()}.${ext}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminSupabase.storage
    .from('forms')
    .upload(filePath, fileBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: newForm, error: formError } = await adminSupabase
    .from('forms')
    .insert({
      title,
      description,
      label_id: labelId,
      access_level: accessLevel,
      allowed_departments: allowedDepts ? JSON.parse(allowedDepts) : null,
      allowed_employment_types: allowedEmploymentTypes ? JSON.parse(allowedEmploymentTypes) : null,
      is_pinned: isPinned,
      expires_at: expiresAt,
      uploader_id: user.id,
    })
    .select()
    .single();

  if (formError) return NextResponse.json({ error: formError.message }, { status: 500 });

  await adminSupabase.from('form_versions').insert({
    form_id: newForm.id,
    version_number: 1,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    change_note: changeNote,
    uploader_id: user.id,
  });

  try {
    await adminSupabase.from('form_activity_log').insert({
      form_id: newForm.id,
      form_title: newForm.title,
      user_id: user.id,
      actor_name: profile?.full_name || '알 수 없음',
      action: 'create',
      detail: { department: profile?.department || '알 수 없음', position: profile?.position || '' },
    });
  } catch {}

  return NextResponse.json({ form: newForm }, { status: 201 });
  } catch (err) {
    console.error('POST /api/forms error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
