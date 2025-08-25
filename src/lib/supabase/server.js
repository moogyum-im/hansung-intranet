// src/lib/supabase/server.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// ⭐⭐ 함수 이름을 createSupabaseServerClient로 통일했습니다. ⭐⭐
export const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerComponentClient({ cookies: () => cookieStore });
};