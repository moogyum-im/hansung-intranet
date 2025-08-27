import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const downloadName = searchParams.get('name') || path.split('/').pop();

    if (!path) {
      return new NextResponse('파일 경로가 없습니다.', { status: 400 });
    }

    // [수정] Vercel 환경 변수에서 URL과 '마스터 키(service_role)'를 가져옵니다.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    // 환경 변수가 설정되지 않은 경우 에러를 반환합니다.
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL 또는 Service Key가 환경 변수에 없습니다.");
        return new NextResponse('서버 환경 변수 설정에 오류가 있습니다.', { status: 500 });
    }

    // [수정] '마스터 키'를 사용하여 모든 보안 규칙(RLS)을 우회하는 관리자용 클라이언트를 생성합니다.
    // 이 코드는 서버에서만 실행되므로 안전합니다.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 이제 관리자 권한으로 파일을 다운로드합니다.
    const { data, error } = await supabase.storage
      .from('resources')
      .download(path);

    if (error) {
      console.error('Supabase 스토리지 다운로드 오류:', error);
      return new NextResponse(`스토리지에서 파일을 가져오지 못했습니다: ${error.message}`, { status: 500 });
    }

    // 헤더를 설정하여 올바른 파일 이름으로 다운로드되도록 합니다.
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
    headers.set('Content-Type', data.type);
    headers.set('Content-Length', data.size.toString());

    return new Response(data, { headers });

  } catch (err) {
    console.error('다운로드 API에서 예측하지 못한 오류 발생:', err);
    return new NextResponse('서버 내부 오류가 발생했습니다.', { status: 500 });
  }
}