import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// API 라우트는 항상 동적으로 실행되도록 설정합니다.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: '파일 경로가 필요합니다.' }, { status: 400 });
  }

  // ⭐⭐ 여기가 바뀐 부분입니다! ⭐⭐
  // 환경 변수를 직접 변수로 가져옵니다.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // 키가 올바르게 로드되지 않았을 경우, 명확한 에러를 발생시킵니다.
  if (!supabaseUrl || !supabaseKey) {
    console.error('환경 변수 누락: Supabase URL 또는 Key가 로드되지 않았습니다.');
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 });
  }

  // Supabase 클라이언트를 만들 때 환경 변수 키를 직접 전달합니다.
  const supabase = createRouteHandlerClient(
    { cookies },
    {
      supabaseUrl: supabaseUrl,
      supabaseKey: supabaseKey,
    }
  );

  try {
    const { data, error } = await supabase.storage
      .from('resources')
      .createSignedUrl(path, 60);

    if (error) {
      throw error;
    }

    return NextResponse.redirect(data.signedUrl);

  } catch (error) {
    console.error('다운로드 링크 생성 오류:', error);
    return NextResponse.json({ error: '파일을 다운로드하는 데 실패했습니다.' }, { status: 500 });
  }
}