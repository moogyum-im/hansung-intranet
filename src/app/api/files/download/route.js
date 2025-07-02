// 파일 경로: src/app/api/files/download/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const fileName = searchParams.get('name');

    if (!filePath) {
        return new NextResponse('File path is required', { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // 1. Storage에서 파일 데이터를 blob 형태로 다운로드합니다.
    const { data: blob, error } = await supabase.storage
        .from('chat-attachments')
        .download(filePath);

    if (error) {
        console.error("파일 다운로드 실패:", error);
        return new NextResponse(error.message, { status: 500 });
    }
    
    // 2. 브라우저에게 "이것은 다운로드할 파일이다" 라고 알려주는 헤더를 설정합니다.
    const headers = new Headers();
    // 'attachment'는 다운로드를, 'inline'은 브라우저에서 바로 열기를 의미합니다.
    // filename* 지시어는 한글 파일명을 안전하게 인코딩합니다.
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    headers.set('Content-Type', blob.type); // 파일의 MIME 타입 설정

    // 3. 파일 데이터와 헤더를 함께 응답으로 보냅니다.
    return new NextResponse(blob, { status: 200, statusText: 'OK', headers });
}