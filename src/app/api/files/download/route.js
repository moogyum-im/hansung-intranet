// 파일 경로: src/app/api/files/download/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  // ★★★ 여기가 수정된 핵심입니다: 서버 환경에 맞는 클라이언트 생성 ★★★
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return new NextResponse('파일 경로가 필요합니다.', { status: 400 });
  }

  try {
    // 1. 현재 로그인한 사용자가 있는지 확인 (보안 강화)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('인증이 필요합니다.', { status: 401 });
    }

    // 2. 스토리지에서 파일 다운로드 시도
    const { data, error } = await supabase.storage.from('library-files').download(path);

    if (error) {
      console.error('파일 다운로드 오류:', error);
      return new NextResponse(`파일 다운로드 실패: ${error.message}`, { status: 500 });
    }

    // 3. 파일 이름 추출 및 헤더 설정
    const fileName = path.split('/').pop();
    const headers = new Headers();
    headers.set('Content-Type', data.type);
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    // 4. 파일 데이터와 함께 응답 반환
    return new NextResponse(data, { status: 200, headers });

  } catch (e) {
    console.error('다운로드 API 서버 오류:', e);
    return new NextResponse('서버 내부 오류가 발생했습니다.', { status: 500 });
  }
}