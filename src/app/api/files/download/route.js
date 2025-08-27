import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. URL에서 파일의 실제 저장 경로와 원본 이름을 가져옵니다.
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path'); // Supabase 스토리지 내 실제 파일 경로
    const fileName = searchParams.get('name') || path.split('/').pop(); // 다운로드 시킬 파일의 원본 이름

    if (!path) {
      return new NextResponse('파일 경로가 없습니다.', { status: 400 });
    }

    // 2. 서버 환경에서 인증된 Supabase 클라이언트를 생성합니다.
    // 이 방식은 사용자가 로그인했을 때의 권한을 사용하므로 더 안전합니다.
    const supabase = createRouteHandlerClient({ cookies });

    // 3. Supabase 스토리지에서 파일을 직접 다운로드(가져오기)합니다.
    const { data, error } = await supabase.storage
      .from('resources') // '자료실' 파일이 저장된 버킷 이름
      .download(path);

    if (error) {
      console.error('Supabase 스토리지 다운로드 오류:', error);
      return new NextResponse(`스토리지에서 파일을 가져오지 못했습니다: ${error.message}`, { status: 500 });
    }

    // 4. "이 파일의 이름은 OOO입니다" 라는 꼬리표(헤더)를 준비합니다.
    const headers = new Headers();
    headers.set('Content-Type', data.type); // 파일의 종류 (e.g., 'image/png')
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    headers.set('Content-Length', data.size.toString());

    // 5. 파일 데이터와 헤더(꼬리표)를 함께 사용자에게 전송합니다.
    return new Response(data, { headers });

  } catch (err) {
    console.error('다운로드 API 처리 중 예외 발생:', err);
    return new NextResponse('서버 내부 오류가 발생했습니다.', { status: 500 });
  }
}