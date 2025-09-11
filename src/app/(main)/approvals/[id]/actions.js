'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function updateApprovalStatus(documentId, newStatus, approverId, comment) {
    const supabase = createServerActionClient({ cookies });

    try {
        // [핵심 수정] 우리가 만든 최종 데이터베이스 함수 'process_approval_transaction'를 호출합니다.
        const { error } = await supabase
            .rpc('process_approval_transaction', {
                p_document_id: documentId,
                p_approver_id: approverId,
                p_action: newStatus, // 'approve' 또는 'reject'
                p_comment: comment
            });

        if (error) {
            throw new Error(error.message);
        }

        // 성공 시 해당 경로의 캐시를 업데이트하여 화면을 갱신합니다.
        revalidatePath(`/approvals/${documentId}`);
        return { success: true };

    } catch (error) {
        console.error('결재 처리 액션 오류:', error);
        return { error: error.message };
    }
}