import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { canAccessForm } from '@/lib/formAccessLevel';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, position, department, role, full_name')
    .eq('id', user.id)
    .single();

  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get('version_id');

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('*, versions:form_versions(*)')
    .eq('id', params.id)
    .single();

  if (formError || !form) return NextResponse.json({ error: '서식을 찾을 수 없습니다' }, { status: 404 });
  if (!canAccessForm(form, profile)) return NextResponse.json({ error: '접근 권한 없음' }, { status: 403 });

  const version = versionId
    ? form.versions.find(v => v.id === versionId)
    : form.versions.sort((a, b) => b.version_number - a.version_number)[0];

  if (!version) return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 });

  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  await adminSupabase
    .from('forms')
    .update({ download_count: (form.download_count || 0) + 1 })
    .eq('id', params.id);

  const { data: fileData, error: dlError } = await adminSupabase.storage
    .from('forms')
    .download(version.file_path);

  if (dlError) return NextResponse.json({ error: dlError.message }, { status: 500 });

  // 활동 이력 기록 (실패해도 다운로드는 정상 반환)
  adminSupabase.from('form_activity_log').insert({
    form_id: params.id,
    form_title: form.title,
    user_id: user.id,
    actor_name: profile?.full_name || '알 수 없음',
    action: 'download',
    detail: { version_number: version.version_number, file_name: version.file_name },
  }).catch(() => {});

  const headers = new Headers();
  headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(version.file_name)}`);
  headers.set('Content-Type', fileData.type || 'application/octet-stream');
  return new Response(fileData, { headers });
}
