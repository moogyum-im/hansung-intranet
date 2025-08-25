// 파일 경로: src/app/api/files/download/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  // ★★★ 여기가 수정된 핵심입니다: 환경 변수를 직접 사용해서 클라이언트 생성 ★★★
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse('Supabase 환경 변수가 설정되지 않았습니다.', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return new NextResponse('파일 경로가 필요합니다.', { status: 400 });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('인증이 필요합니다.', { status: 401 });
    }

    // 파일 다운로드
    const { data, error } = await supabase.storage.from('library-files').download(path);

    if (error) {
      console.error('파일 다운로드 오류:', error);
      return new NextResponse(`파일 다운로드 실패: ${error.message}`, { status: 500 });
    }

    const fileName = path.split('/').pop();

    // NextResponse를 사용하여 파일 스트림과 헤더를 설정합니다.
    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });

  } catch (e) {
    console.error('서버 오류:', e);
    return new NextResponse('서버 내부 오류가 발생했습니다.', { status: 500 });
  }
}