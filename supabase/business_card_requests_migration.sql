-- business_card_requests 테이블 생성
-- 직원이 명함 재발급을 신청할 때 사용합니다.

CREATE TABLE IF NOT EXISTS public.business_card_requests (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity   INT         NOT NULL DEFAULT 100,
  notes      TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

ALTER TABLE public.business_card_requests ENABLE ROW LEVEL SECURITY;

-- 직원 본인은 자신의 요청만 조회/생성 가능
CREATE POLICY "Users can view own card requests"
  ON public.business_card_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own card requests"
  ON public.business_card_requests FOR INSERT
  
  WITH CHECK (user_id = auth.uid());

-- 관리자는 전체 조회 및 상태 변경 가능
CREATE POLICY "Admins can view all card requests"
  ON public.business_card_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR department = '관리부')
    )
  );

CREATE POLICY "Admins can update card request status"
  ON public.business_card_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR department = '관리부')
    )
  );
