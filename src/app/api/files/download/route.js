import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// API 라우트는 항상 동적으로 실행되도록 설정합니다.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: '파일 경로가 필요합니다.' }, { status: 400 });
  }

  // ⭐⭐⭐ 여기가 가장 중요한 변경점입니다! ⭐⭐⭐
  // Supabase 클라이언트를 만드는 가장 기본적인 방법입니다.
  // 이 방법은 라이브러리의 도움 없이 환경 변수를 직접 사용합니다.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // 환경 변수 누락을 다시 한 번 확인합니다.
  if (!supabaseUrl || !supabaseKey) {
    console.error('환경 변수 누락: Supabase URL 또는 Key가 로드되지 않았습니다.');
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 });
  }

  // 직접 환경 변수를 전달하여 Supabase 클라이언트를 만듭니다.
  const supabase = createClient(supabaseUrl, supabaseKey);

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