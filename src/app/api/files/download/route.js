import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const downloadName = searchParams.get('name') || path.split('/').pop();
    const bucket = searchParams.get('bucket'); // [수정] 어느 버킷에서 찾을지 전달받습니다.

    if (!path || !downloadName || !bucket) {
      return new NextResponse('파일 경로, 이름, 또는 버킷 정보가 누락되었습니다.', { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL 또는 Service Key가 환경 변수에 없습니다.");
        return new NextResponse('서버 환경 변수 설정에 오류가 있습니다.', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // [수정] 전달받은 bucket 변수를 사용하여 해당 버킷에서 파일을 다운로드합니다.
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      console.error('Supabase 스토리지 다운로드 오류:', error);
      return new NextResponse(`스토리지에서 파일을 가져오지 못했습니다: ${error.message}`, { status: 500 });
    }

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
    headers.set('Content-Type', data.type);
    headers.set('Content-Length', data.size.toString());

    return new Response(data, { headers });

  } catch (err) {
    console.error('다운로드 API에서 예측하지 못한 오류 발생:', err);
    return new NextResponse('서버 내부 오류가 발생했습니다.', { status: 500 });
  }
}