// 파일 경로: src/app/api/download/route.js

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
        return new NextResponse('파일 경로가 필요합니다.', { status: 400 });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const { data, error } = await supabaseAdmin.storage
            .from('company-resources')
            .download(filePath);

        if (error) {
            throw error;
        }

        // [수정] 인코딩된 파일 경로에서 원래 파일 이름을 추출하고 디코딩합니다.
        const encodedFileNameWithTimestamp = filePath.split('/').pop();
        const decodedFileNameWithTimestamp = decodeURIComponent(encodedFileNameWithTimestamp);
        const originalFileName = decodedFileNameWithTimestamp.substring(decodedFileNameWithTimestamp.indexOf('-') + 1);

        const headers = new Headers();
        headers.set('Content-Type', data.type);
        // [수정] 디코딩된 원래 한글 파일 이름을 다운로드 파일명으로 지정합니다.
        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalFileName)}`);

        return new Response(data, { status: 200, headers });

    } catch (error) {
        console.error('파일 다운로드 오류:', error);
        return new NextResponse('파일을 다운로드할 수 없습니다.', { status: 500 });
    }
}