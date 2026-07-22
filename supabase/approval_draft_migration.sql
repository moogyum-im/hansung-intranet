-- 전자결재 임시저장 기능
-- approval_documents.status 는 이미 자유 텍스트 컬럼이라 'draft' 값을 그대로 사용한다.
-- 임시저장 시점에는 실제 결재선(approval_document_approvers/referrers)을 만들지 않고,
-- 선택해둔 결재자/참조인 목록만 아래 컬럼에 JSON으로 보관해뒀다가 최종 상신 시점에
-- /api/submit-approval 이 이 값을 읽어 실제 결재선 테이블에 반영한다.

ALTER TABLE public.approval_documents
    ADD COLUMN IF NOT EXISTS draft_approvers jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS draft_referrers jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS last_saved_at timestamptz;

-- 내 임시저장함 목록 조회(author_id + status='draft')를 빠르게 하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_approval_documents_drafts
    ON public.approval_documents (author_id, last_saved_at DESC)
    WHERE status = 'draft';
