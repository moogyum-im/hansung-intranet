import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 휴일 목록 (주말 외 공휴일) - 필요에 따라 추가
const HOLIDAYS = ['2024-01-01', '2024-03-01', '2024-05-01', '2024-05-05'];

// 주말과 공휴일을 제외한 실제 휴가일수 계산 함수
function calculateBusinessDays(startDate: string, endDate: string): number {
  let count = 0;
  const curDate = new Date(startDate);
  const lastDate = new Date(endDate);

  while (curDate <= lastDate) {
    const dayOfWeek = curDate.getDay();
    const dateString = curDate.toISOString().split('T')[0];

    // 토요일(6)과 일요일(0)이 아니고, 공휴일 목록에 없으면 일수 추가
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.includes(dateString)) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    if (!documentId) {
      throw new Error('문서 ID가 필요합니다.');
    }
    
    // 서비스 키를 사용해야 admin 권한으로 DB에 접근 가능
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. 결재 문서 정보 가져오기
    const { data: document, error: docError } = await supabaseAdmin
      .from('approval_documents')
      .select('author_id, form_data, status')
      .eq('id', documentId)
      .single();

    if (docError) throw docError;
    if (!document) throw new Error('결재 문서를 찾을 수 없습니다.');
    if (document.status !== '승인') {
      return new Response(JSON.stringify({ message: '아직 최종 승인되지 않은 문서입니다.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. 휴가 종류 및 기간 추출
    const formData = document.form_data;
    const leaveType = formData['휴가 종류']; // '연차', '반차' 등
    const leavePeriod = formData['휴가 기간']; // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }

    if (!leaveType || !leavePeriod || !leavePeriod.start || !leavePeriod.end) {
      throw new Error('휴가 정보(종류, 기간)가 양식에 포함되어 있지 않습니다.');
    }
    
    // 3. 차감할 연차일수 계산
    let daysToDeduct = 0;
    if (leaveType === '반차') {
      daysToDeduct = 0.5;
    } else if (leaveType === '연차') {
      daysToDeduct = calculateBusinessDays(leavePeriod.start, leavePeriod.end);
    } else {
      // '병가' 등 다른 휴가는 연차를 차감하지 않음
      return new Response(JSON.stringify({ message: `${leaveType}는 연차 차감 대상이 아닙니다.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (daysToDeduct <= 0) {
       return new Response(JSON.stringify({ message: '연차 차감 일수가 0일 이하입니다.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. 직원의 현재 연차 정보 가져오기 (트랜잭션 대신 RPC 사용 권장)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('leave_days_remaining')
      .eq('id', document.author_id)
      .single();
      
    if (profileError) throw profileError;

    // 5. 연차 차감 후 DB 업데이트
    const newLeaveDays = (profile.leave_days_remaining || 0) - daysToDeduct;
    
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ leave_days_remaining: newLeaveDays })
      .eq('id', document.author_id);

    if (updateError) throw updateError;
    
    return new Response(JSON.stringify({ message: `연차 ${daysToDeduct}일이 성공적으로 차감되었습니다.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});