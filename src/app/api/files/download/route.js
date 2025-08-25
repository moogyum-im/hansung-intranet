import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ message: '파일 경로가 없습니다.' }, { status: 400 });
    }

    // ⭐⭐ 서버용 환경 변수(접두사 없음)를 먼저 시도합니다.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Supabase 클라이언트를 생성합니다.
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.storage
      .from('resources')
      .createSignedUrl(path, 60);

    if (error) {
      throw error;
    }

    return NextResponse.redirect(data.signedUrl);
    
  } catch (error) {
    console.error('API 실행 중 에러 발생:', error);
    // 에러 발생 시, 디버깅을 위해 환경 변수 값을 반환합니다.
    return NextResponse.json({ 
      message: '파일 다운로드에 실패했습니다.',
      errorDetails: error.message,
      checkEnvVars: {
        SUPABASE_URL: process.env.SUPABASE_URL ? '존재' : '누락',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '존재' : '누락'
      }
    }, { status: 500 });
  }
}