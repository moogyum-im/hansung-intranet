import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
// 최종 업데이트 (2025-08-25)
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ message: '파일 경로가 없습니다.' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ message: '서버 설정 오류: Supabase 키 누락' }, { status: 500 });
    }

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
    return NextResponse.json({ 
      message: '파일 다운로드에 실패했습니다.',
      errorDetails: error.message
    }, { status: 500 });
  }
}