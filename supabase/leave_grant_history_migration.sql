-- 연차 자동 부여 이력 테이블
-- 동일 직원에게 같은 날짜/종류로 중복 부여되는 것을 UNIQUE 제약으로 방지(멱등성 보장)
CREATE TABLE IF NOT EXISTS public.leave_grant_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  grant_type text NOT NULL CHECK (grant_type IN ('monthly', 'annual')),
  grant_date date NOT NULL,
  amount numeric NOT NULL,
  years_of_service integer,
  resulting_carry_over numeric,
  resulting_total numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE (profile_id, grant_date, grant_type)
);

ALTER TABLE public.leave_grant_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read leave grant history"
  ON public.leave_grant_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR department = '관리부')));

CREATE POLICY "Users can read own leave grant history"
  ON public.leave_grant_history FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
