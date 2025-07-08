import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * 서버 컴포넌트에서 사용할 Supabase 클라이언트를 생성합니다.
 * Next.js App Router 환경에서 쿠키를 통해 세션을 관리합니다.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase 클라이언트 인스턴스
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies(); // Next.js headers에서 쿠키 저장소 가져오기
  return createServerComponentClient({
    cookies: () => cookieStore, // Supabase 클라이언트에 쿠키 저장소 제공
  });
}