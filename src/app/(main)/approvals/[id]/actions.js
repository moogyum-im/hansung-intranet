'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function processApprovalAction({ documentId, approverId, newStatus, comment, isFinalApprover }) {
    const supabase = createServerActionClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== approverId) {
        return { success: false, message: "결재 권한이 없습니다." };
    }

    try {
        // ★★★★★ 핵심 수정사항 ★★★★★
        // DB 함수가 반환하는 텍스트(data)를 resultMessage 변수에 저장합니다.
        const { data: resultMessage, error } = await supabase.rpc('process_approval_transaction', {
            p_document_id: documentId,
            p_approver_id: approverId,
            p_new_status: newStatus,
            p_comment: comment,
            p_is_final: isFinalApprover
        });

        if (error) {
            throw new Error(`DB 함수 에러: ${error.message}`);
        }
        
        // 데이터 변경 후, 관련 페이지 캐시를 무효화합니다.
        revalidatePath(`/approvals`);
        revalidatePath(`/approvals/${documentId}`);
        revalidatePath('/mypage');

        // ★★★★★ DB가 돌려준 결과 메시지를 그대로 반환 ★★★★★
        return { success: true, message: resultMessage };

    } catch (err) {
        console.error("[SERVER] processApproval 함수 실행 중 예외 발생:", err);
        return { success: false, message: err.message || "결재 처리 중 알 수 없는 시스템 오류가 발생했습니다." };
    }
}