import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // ⭐⭐ 현재 서버 환경 변수들을 로그에 기록합니다. ⭐⭐
  console.log('--- VERCEL 환경 변수 디버깅 로그 ---');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log('-----------------------------------');
  
  // 에러를 발생시키지 않고 바로 응답을 보냅니다.
  return NextResponse.json({ message: '디버깅 모드입니다. 로그를 확인해주세요.' });
}