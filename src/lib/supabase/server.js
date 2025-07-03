// 파일 경로: src/lib/supabase/server.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// 이 파일은 오직 서버 컴포넌트에서만 사용됩니다.
export const createSupabaseServerClient = () => {
  const cookieStore = cookies()
  return createServerComponentClient({
    cookies: () => cookieStore,
  })
}