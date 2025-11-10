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
    // 🚨 approverId (현재 승인하는 사용자 ID)와 documentId를 받도록 수정
    const { documentId, approverId } = await req.json(); 
    
    if (!documentId || !approverId) {
      throw new Error('문서 ID 및 승인자 ID가 필요합니다.');
    }
    
    // 서비스 키를 사용해야 admin 권한으로 DB에 접근 가능
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. 결재 문서와 결재선 정보 가져오기
    const { data: documentData, error: docError } = await supabaseAdmin
      .from('approval_documents')
      .select(`
        id, author_id, form_data, status, current_approver_id, current_step,
        approvers:approval_document_approvers (approver_id, step, status)
      `)
      .eq('id', documentId)
      .single();

    if (docError) throw docError;
    if (!documentData) throw new Error('결재 문서를 찾을 수 없습니다.');
    
    const { approvers, ...document } = documentData;
    const currentStep = document.current_step || 1;
    const allApprovers = approvers.sort((a, b) => a.step - b.step);
    
    // 2. 현재 결재자의 상태를 'approved'로 업데이트 (1단계 로직)
    const { error: approverUpdateError } = await supabaseAdmin
      .from('approval_document_approvers')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('document_id', documentId)
      .eq('approver_id', approverId);

    if (approverUpdateError) throw approverUpdateError;

    // 3. 다음 결재자 단계 업데이트 (2차 결재자 문제 해결의 핵심!)
    const nextStep = currentStep + 1;
    const nextApprover = allApprovers.find(a => a.step === nextStep);
    
    let isFinalApproval = false;
    
    if (nextApprover) {
      // 다음 결재자가 있다면, approval_documents 업데이트
      const { error: documentNextStepError } = await supabaseAdmin
        .from('approval_documents')
        .update({
          current_approver_id: nextApprover.approver_id,
          current_step: nextStep,
          status: '진행중' // 상태 유지
        })
        .eq('id', documentId);
        
      if (documentNextStepError) throw documentNextStepError;

      // 다음 결재자에게 넘겼으므로, 연차 차감 로직은 건너뛰고 종료합니다.
      return new Response(JSON.stringify({ message: '결재가 다음 단계로 넘어갔습니다.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else {
      // 다음 결재자가 없다면, 최종 승인 처리 (3단계 로직)
      isFinalApproval = true;
      const { error: finalUpdateError } = await supabaseAdmin
        .from('approval_documents')
        .update({ 
          status: '승인', // 최종 상태 변경
          current_approver_id: null, // 결재 완료
          current_step: nextStep // 마지막 단계 표시
        })
        .eq('id', documentId);
        
      if (finalUpdateError) throw finalUpdateError;
    }

    // 4. 최종 승인 시 연차 차감 로직 (기존 코드 유지)
    if (isFinalApproval) {
        // 이하는 기존 연차 차감 로직
        const formData = document.form_data;
        const leaveType = formData['휴가 종류']; // '연차', '반차' 등
        const leavePeriod = formData['휴가 기간']; // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }

        if (!leaveType || !leavePeriod || !leavePeriod.start || !leavePeriod.end) {
          // 최종 승인이지만 필수 정보 누락, 에러를 던지거나 경고 로직 필요
           console.error('Final approval but leave info missing for document:', documentId);
           // throw new Error('휴가 정보(종류, 기간)가 양식에 포함되어 있지 않습니다.'); 
        }

        // ... (이하 연차 차감 로직은 그대로 유지)
        let daysToDeduct = 0;
        if (leaveType === '반차') {
          daysToDeduct = 0.5;
        } else if (leaveType === '연차') {
          daysToDeduct = calculateBusinessDays(leavePeriod.start, leavePeriod.end);
        } else {
           // '병가' 등 다른 휴가는 연차를 차감하지 않음
           return new Response(JSON.stringify({ message: `${leaveType}는 최종 승인되었으나 연차 차감 대상이 아닙니다.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        if (daysToDeduct <= 0) {
           return new Response(JSON.stringify({ message: '연차 차감 일수가 0일 이하입니다. 최종 승인되었습니다.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        // 직원의 현재 연차 정보 가져오기
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('leave_days_remaining')
          .eq('id', document.author_id)
          .single();
          
        if (profileError) throw profileError;

        // 연차 차감 후 DB 업데이트
        const newLeaveDays = (profile.leave_days_remaining || 0) - daysToDeduct;
        
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ leave_days_remaining: newLeaveDays })
          .eq('id', document.author_id);

        if (updateError) throw updateError;
        
        return new Response(JSON.stringify({ message: `연차 ${daysToDeduct}일이 성공적으로 차감되고 최종 승인되었습니다.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
    }
    
    // (여기까지 코드가 도달하지 않아야 정상)
    return new Response(JSON.stringify({ message: '결재 처리 완료.' }), {
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