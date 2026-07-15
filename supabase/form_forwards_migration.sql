-- form_forwards: 서식 전달 기록
CREATE TABLE IF NOT EXISTS public.form_forwards (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id     UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES public.profiles(id),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id),
    sender_name TEXT NOT NULL DEFAULT '',
    message     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at     TIMESTAMPTZ,
    UNIQUE (form_id, sender_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS form_forwards_recipient_idx ON public.form_forwards(recipient_id);
CREATE INDEX IF NOT EXISTS form_forwards_form_idx      ON public.form_forwards(form_id);

ALTER TABLE public.form_forwards ENABLE ROW LEVEL SECURITY;

-- 발신자·수신자 본인만 조회/삽입 가능
CREATE POLICY "forward_select" ON public.form_forwards
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "forward_insert" ON public.form_forwards
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
