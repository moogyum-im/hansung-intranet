// 파일 경로: src/app/(main)/approvals/[id]/actions.js
'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function updateApprovalStatus(docId, newStatus, currentUserId) {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    try {
        const { data: doc, error: docError } = await supabase.from('approval_documents').select('current_step').eq('id', docId).single();
        if (docError) throw new Error('문서 정보를 가져오지 못했습니다.');

        // 1. 현재 결재자의 상태를 '승인' 또는 '반려'로 업데이트
        await supabase.from('approval_document_approvers')
            .update({ status: newStatus, processed_at: new Date().toISOString() })
            .eq('document_id', docId)
            .eq('approver_id', currentUserId)
            .eq('sequence', doc.current_step);
        
        if (newStatus === '반려') {
            // 반려 시 즉시 문서 상태를 '반려'로 변경하고 종료
            await supabase.from('approval_documents').update({ status: '반려' }).eq('id', docId);
        } else if (newStatus === '승인') {
            const { data: allApprovers, error: allApproversError } = await supabase
                .from('approval_document_approvers').select('sequence').eq('document_id', docId);
            if(allApproversError) throw new Error('전체 결재자 정보 조회 실패');

            const maxSequence = Math.max(...allApprovers.map(a => a.sequence));

            if (doc.current_step < maxSequence) {
                // 다음 결재 단계가 남았을 경우
                const nextStep = doc.current_step + 1;
                // 1) 문서의 현재 단계를 +1 업데이트
                await supabase.from('approval_documents').update({ current_step: nextStep }).eq('id', docId);
                // 2) 다음 차례 결재자의 상태를 '대기'로 변경
                const { data: nextApproverData } = await supabase.from('approval_document_approvers').update({ status: '대기' }).eq('document_id', docId).eq('sequence', nextStep).select('approver_id').single();
                // 3) 다음 결재자에게 알림 전송
                if(nextApproverData) {
                    await supabase.from('notifications').insert({
                        recipient_id: nextApproverData.approver_id,
                        type: 'approval_request',
                        content: `결재 문서가 도착했습니다.`,
                        link: `/approvals/${docId}`
                    });
                }
            } else {
                // 최종 승인일 경우
                await supabase.from('approval_documents').update({ status: '승인' }).eq('id', docId);
                // (필요 시) 연차 차감 로직 등 최종 승인 후 처리...
            }
        }
        
        revalidatePath(`/approvals/${docId}`);
        revalidatePath('/mypage'); 
        
        return { success: true };
    } catch (error) {
        console.error("결재 처리 액션 오류:", error);
        return { error: error.message };
    }
}