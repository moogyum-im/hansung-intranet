import { supabase } from '@/lib/supabase/client';

// document_type -> 작성 폼 경로. "이어쓰기" 링크 및 임시저장함 목록에서 사용.
export const DRAFT_FORM_PATHS = {
    leave_request: '/approvals/leave',
    business_trip: '/approvals/business-trip',
    expense_report: '/approvals/expense',
    expense_settlement: '/approvals/expense-settlement',
    internal_approval: '/approvals/internal',
    work_report: '/approvals/work-report',
    meeting_minutes: '/approvals/meeting-minutes',
    resignation: '/approvals/resignation',
    apology: '/approvals/apology',
    pdf_form: '/approvals/pdf-upload',
};

export const DRAFT_TYPE_LABELS = {
    leave_request: '휴가 신청서',
    business_trip: '출장 신청서',
    expense_report: '지출 결의서',
    expense_settlement: '출장 여비 정산서',
    internal_approval: '내부 결재서',
    work_report: '업무 보고서',
    meeting_minutes: '회의록',
    resignation: '사직서',
    apology: '시말서',
    pdf_form: '서식 결재 (PDF)',
};

// 임시저장: draftId가 없으면 새로 생성, 있으면 갱신. { id }를 반환.
export async function saveApprovalDraft({ draftId, document_type, title, content, attachments, approvers, referrers }) {
    const res = await fetch('/api/approval-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            draftId: draftId || undefined,
            document_type,
            title: title || '(제목 없음)',
            content: typeof content === 'string' ? content : JSON.stringify(content || {}),
            attachments: attachments || [],
            approvers: approvers || [],
            referrers: referrers || [],
        }),
    });
    if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || '임시저장 실패');
    }
    return res.json();
}

// 임시저장 문서 불러오기 (본인 소유 + status='draft' 인 문서만 RLS로 조회 가능)
export async function loadApprovalDraft(draftId) {
    const { data, error } = await supabase
        .from('approval_documents')
        .select('*')
        .eq('id', draftId)
        .eq('status', 'draft')
        .single();

    if (error || !data) throw new Error('임시저장 문서를 찾을 수 없습니다.');

    return {
        id: data.id,
        title: data.title,
        content: typeof data.content === 'string' ? JSON.parse(data.content || '{}') : (data.content || {}),
        attachments: data.attachments || [],
        approvers: data.draft_approvers || [],
        referrers: data.draft_referrers || [],
    };
}

export async function deleteApprovalDraft(draftId) {
    const res = await fetch(`/api/approval-drafts?id=${draftId}`, { method: 'DELETE' });
    if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || '삭제 실패');
    }
    return res.json();
}
