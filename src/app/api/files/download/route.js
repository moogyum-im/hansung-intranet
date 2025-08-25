import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // ⭐⭐⭐ 모든 코드를 try...catch로 감싸서 어떤 에러라도 잡을 수 있도록 합니다. ⭐⭐⭐
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
    // ⭐ 어떤 에러가 발생하든, 여기서 에러 메시지를 잡아 화면에 보여줍니다. ⭐
    console.error('API 실행 중 에러 발생:', error);
    return NextResponse.json({ 
      message: '파일 다운로드에 실패했습니다.',
      errorDetails: error.message // 에러 메시지 내용을 직접 반환합니다.
    }, { status: 500 });
  }
}