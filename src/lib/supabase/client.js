

// src/lib/supabase/client.js
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// 이 파일은 오직 클라이언트 컴포넌트에서만 사용됩니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수가 올바른지 확인하는 로그를 추가합니다.
console.log('Supabase URL:', supabaseUrl ? '로드됨' : '누락');
console.log('Supabase Key:', supabaseKey ? '로드됨' : '누락');

export const supabase = createClientComponentClient({
  supabaseUrl,
  supabaseKey,
});