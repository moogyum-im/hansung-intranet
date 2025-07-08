// src/app/(main)/approvals/[id]/actions.js

'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function processApprovalAction({ documentId, approverId, newStatus, comment, isFinalApprover }) {
    console.log(`[SERVER] 서버 액션 실행: documentId=${documentId}, approverId=${approverId}`);

    const supabase = createServerActionClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "인증되지 않은 사용자입니다." };
    }
    
    if (user.id !== approverId) {
        return { success: false, message: "결재 권한이 없습니다." };
    }

    try {
        const { error } = await supabase.rpc('process_approval_transaction', {
            p_document_id: documentId,
            p_approver_id: approverId,
            p_new_status: newStatus,
            p_comment: comment,
            p_is_final: isFinalApprover
        });

        if (error) {
            console.error('[SERVER] DB 함수 에러:', error);
            return { success: false, message: `결재 처리 중 데이터베이스 오류가 발생했습니다: ${error.message}` };
        }

        console.log('[SERVER] DB 함수 성공적으로 완료.');
        revalidatePath(`/approvals`);
        revalidatePath(`/approvals/${documentId}`);

        return { success: true, message: `결재가 성공적으로 처리되었습니다.` };
    } catch (err) {
        console.error("[SERVER] processApproval 함수 실행 중 예외 발생:", err);
        return { success: false, message: err.message || "결재 처리 중 알 수 없는 시스템 오류가 발생했습니다." };
    }
}