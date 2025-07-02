// src/app/api/construction-status/route.js
// ★★★ 여기가 최종 수정된 부분입니다 ★★★

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    // construction_sites 라는 테이블이 있다고 가정하고 데이터를 가져옵니다.
    // 실제 테이블 이름과 컬럼에 맞게 수정이 필요할 수 있습니다.
    const { data, error } = await supabase
      .from('construction_sites') // 실제 공사현황 테이블 이름
      .select('id, created_at, company_name, brand_name, complex_name, location, move_in_schedule, remarks'); // 필요한 컬럼들

    if (error) {
      throw error;
    }

    return NextResponse.json({ sites: data });

  } catch (error) {
    console.error('API Route Error (construction-status):', error);
    return new NextResponse(
      JSON.stringify({ error: '데이터를 가져오는 중 오류가 발생했습니다.' }),
      { status: 500 }
    );
  }
}