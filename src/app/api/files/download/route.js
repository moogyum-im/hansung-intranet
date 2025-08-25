import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // ⭐⭐ 서버 환경 변수들을 직접 읽어옵니다. ⭐⭐
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const nextPublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // 에러를 발생시키지 않고, 환경 변수 값들을 JSON 형식으로 반환합니다.
  return NextResponse.json({
    message: '디버깅 모드입니다. 아래 값을 확인해주세요.',
    environmentVariables: {
      SUPABASE_URL: supabaseUrl || '누락',
      SUPABASE_ANON_KEY: supabaseKey || '누락',
      NEXT_PUBLIC_SUPABASE_URL: nextPublicUrl || '누락',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: nextPublicKey || '누락'
    }
  });
}