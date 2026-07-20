-- 전자결재 문서 공유 기록 테이블
-- 이미 구버전 스키마(doc_id/sender_id/receiver_id/reason만 존재)로 테이블이 있을 수 있으므로
-- CREATE TABLE은 최초 생성용으로만 두고, 누락된 컬럼은 ALTER TABLE로 보강한다.
CREATE TABLE IF NOT EXISTS public.approval_share_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id     UUID NOT NULL REFERENCES public.approval_documents(id) ON DELETE CASCADE,
    sender_id  UUID NOT NULL REFERENCES public.profiles(id),
    receiver_id UUID NOT NULL REFERENCES public.profiles(id),
    reason     TEXT NOT NULL DEFAULT '문서 공유 전달'
);

ALTER TABLE public.approval_share_logs ADD COLUMN IF NOT EXISTS doc_title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.approval_share_logs ADD COLUMN IF NOT EXISTS sender_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.approval_share_logs ADD COLUMN IF NOT EXISTS receiver_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.approval_share_logs ADD COLUMN IF NOT EXISTS receiver_position TEXT DEFAULT '';
ALTER TABLE public.approval_share_logs ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '문서 공유 전달';
ALTER TABLE public.approval_share_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS approval_share_logs_doc_idx      ON public.approval_share_logs(doc_id, created_at DESC);
CREATE INDEX IF NOT EXISTS approval_share_logs_sender_idx   ON public.approval_share_logs(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS approval_share_logs_receiver_idx ON public.approval_share_logs(receiver_id, created_at DESC);

ALTER TABLE public.approval_share_logs ENABLE ROW LEVEL SECURITY;

-- 보낸 사람·받은 사람 본인만 조회 가능
DROP POLICY IF EXISTS "approval_share_logs_select" ON public.approval_share_logs;
CREATE POLICY "approval_share_logs_select" ON public.approval_share_logs
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 본인이 보낸 공유 기록만 삽입 가능
DROP POLICY IF EXISTS "approval_share_logs_insert" ON public.approval_share_logs;
CREATE POLICY "approval_share_logs_insert" ON public.approval_share_logs
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 구버전 코드로 생성되어 doc_title/sender_name/receiver_name이 비어있는 레거시 레코드 백필
UPDATE public.approval_share_logs l
SET doc_title = d.title
FROM public.approval_documents d
WHERE l.doc_id = d.id AND (l.doc_title IS NULL OR l.doc_title = '');

UPDATE public.approval_share_logs l
SET sender_name = p.full_name
FROM public.profiles p
WHERE l.sender_id = p.id AND (l.sender_name IS NULL OR l.sender_name = '');

UPDATE public.approval_share_logs l
SET receiver_name = p.full_name, receiver_position = p.position
FROM public.profiles p
WHERE l.receiver_id = p.id AND (l.receiver_name IS NULL OR l.receiver_name = '');
