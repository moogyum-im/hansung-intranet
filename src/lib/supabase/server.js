// src/lib/supabase/server.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// 이 함수는 서버 컴포넌트에서만 사용됩니다.
// createServerComponentClient는 접두사가 없는 환경 변수를 자동으로 찾아서 사용합니다.
export const createServerClient = () => {
  const cookieStore = cookies();
  return createServerComponentClient({ cookies: () => cookieStore });
};