import { supabase } from '@/lib/supabase/client';

/**
 * 결재 승인/반려 처리 직후 호출해 관련자에게 알림을 발송합니다.
 * - 반려: 상신자 + 이미 승인했던 이전 결재자 전체 (본인의 승인이 무효화됨을 알림)
 * - 중간 단계 승인: 상신자에게 진행 상황 알림
 * - 최종 승인: 상신자 + 참조인 전체
 * 코멘트가 있으면 알림 내용에 포함됩니다.
 *
 * 알림 발송 실패가 결재 처리 자체를 막지 않도록 이 함수는 예외를 던지지 않습니다.
 */
export async function notifyApprovalAction({ doc, approvals = [], referrers = [], currentStep, newStatus, comment }) {
    try {
        const authorId = doc?.author_id || doc?.requester_id;
        const title = doc?.title || doc?.document_number || '결재 문서';
        const link = `/approvals/${doc.id}`;
        const trimmedComment = comment?.trim();
        const notifications = [];

        if (newStatus === '반려') {
            if (authorId) {
                notifications.push({
                    recipient_id: authorId,
                    type: 'approval_rejected',
                    content: trimmedComment
                        ? `상신하신 '${title}' 문서가 반려되었습니다. (사유: ${trimmedComment})`
                        : `상신하신 '${title}' 문서가 반려되었습니다.`,
                    link,
                });
            }

            approvals
                .filter(step => step.sequence < currentStep.sequence && step.status === '승인' && step.approver_id !== currentStep.approver_id)
                .forEach(step => {
                    notifications.push({
                        recipient_id: step.approver_id,
                        type: 'approval_rejected',
                        content: `승인하셨던 '${title}' 문서가 이후 단계에서 반려되었습니다.`,
                        link,
                    });
                });
        } else if (newStatus === '승인') {
            const hasNextStep = approvals.some(step => step.sequence === currentStep.sequence + 1);

            if (authorId) {
                const base = hasNextStep
                    ? `상신하신 '${title}' 문서가 ${currentStep.sequence}차 결재에서 승인되었습니다.`
                    : `상신하신 '${title}' 문서가 최종 승인되었습니다.`;
                notifications.push({
                    recipient_id: authorId,
                    type: 'approval_approved',
                    content: trimmedComment ? `${base} (의견: ${trimmedComment})` : base,
                    link,
                });
            }

            if (!hasNextStep) {
                referrers.forEach(ref => {
                    if (!ref?.referrer_id) return;
                    notifications.push({
                        recipient_id: ref.referrer_id,
                        type: 'approval_referrer',
                        content: `참조하신 '${title}' 문서의 결재가 완료되었습니다.`,
                        link,
                    });
                });
            }
        }

        if (notifications.length === 0) return;

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) console.error('결재 알림 발송 실패:', error.message);
    } catch (error) {
        console.error('결재 알림 발송 중 오류:', error);
    }
}
