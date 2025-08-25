import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// API 라우트는 항상 동적으로 실행되도록 설정합니다.
export const dynamic = 'force-dynamic';

// GET 요청을 처리하는 함수입니다. (예: /api/download?path=...)
export async function GET(request) {
  // 요청 URL에서 'path'라는 파라미터 값을 가져옵니다.
  // 예: 'resources/hansung_logo.png'
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  // 만약 path 파라미터가 없으면, 잘못된 요청이라는 에러를 보냅니다.
  if (!path) {
    return NextResponse.json({ error: '파일 경로가 필요합니다.' }, { status: 400 });
  }

  // ⭐ API 라우트 전용 Supabase 클라이언트를 생성합니다.
  // 이렇게 해야 Vercel 환경 변수를 제대로 읽어올 수 있어요!
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Supabase Storage에서 파일을 다운로드할 수 있는 임시 URL을 생성합니다.
    // 보안을 위해 60초 동안만 유효한 링크를 만들어줍니다.
    const { data, error } = await supabase.storage
      .from('resources') // Supabase Storage에 만드신 버킷(폴더) 이름을 넣어주세요.
      .createSignedUrl(path, 60);

    // URL 생성 중 에러가 발생하면 서버 에러를 보냅니다.
    if (error) {
      throw error;
    }

    // 성공적으로 생성된 임시 URL로 사용자를 이동(리다이렉트)시킵니다.
    // 그러면 브라우저가 자동으로 파일 다운로드를 시작할 거예요.
    return NextResponse.redirect(data.signedUrl);

  } catch (error) {
    console.error('다운로드 링크 생성 오류:', error);
    return NextResponse.json({ error: '파일을 다운로드하는 데 실패했습니다.' }, { status: 500 });
  }
}