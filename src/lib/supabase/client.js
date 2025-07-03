// 파일 경로: src/lib/supabase/client.js
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// 이 파일은 오직 클라이언트 컴포넌트에서만 사용됩니다.
export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})