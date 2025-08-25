// src/lib/supabase/client.js
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// 이 파일은 클라이언트 컴포넌트에서 사용됩니다.
// createClientComponentClient는 NEXT_PUBLIC_ 접두사가 붙은
// 환경 변수를 자동으로 찾아서 사용합니다.
export const supabase = createClientComponentClient();