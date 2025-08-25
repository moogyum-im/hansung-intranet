import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: '파일 경로가 필요합니다.' }, { status: 400 });
  }

  // ⭐⭐ 여기가 바뀐 부분입니다! ⭐⭐
  // 서버에서만 사용되므로, 접두사 없이 환경 변수를 읽습니다.
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
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