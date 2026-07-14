-- 서식함 마이그레이션
-- 등급: 1=임원만(이사/대표/회장), 2=부장/차장이상, 3=과장이상, 4=주임/대리이상, 5=전직원

-- 1. Storage bucket 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('forms', 'forms', false)
ON CONFLICT (id) DO NOTHING;

-- 2. 라벨 테이블
CREATE TABLE IF NOT EXISTS public.form_labels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text DEFAULT '#3b82f6',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.form_labels (name, color, sort_order) VALUES
  ('인사/총무', '#6366f1', 1),
  ('현장/공사', '#f59e0b', 2),
  ('회계/재무', '#10b981', 3),
  ('계약/견적', '#3b82f6', 4),
  ('기타', '#94a3b8', 5)
ON CONFLICT (name) DO NOTHING;

-- 3. 서식 메인 테이블
CREATE TABLE IF NOT EXISTS public.forms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  label_id uuid REFERENCES public.form_labels(id) ON DELETE SET NULL,
  -- 접근 등급: 1=임원만, 2=부장/차장이상, 3=과장이상, 4=주임/대리이상, 5=전직원
  access_level integer NOT NULL DEFAULT 5 CHECK (access_level BETWEEN 1 AND 5),
  -- 부서 한정 공개 (null or 빈배열 = 전체 공개)
  allowed_departments text[],
  is_pinned boolean DEFAULT false,
  expires_at date,
  uploader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  download_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. 버전 테이블
CREATE TABLE IF NOT EXISTS public.form_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  change_note text,
  uploader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(form_id, version_number)
);

-- 5. 즐겨찾기 테이블
CREATE TABLE IF NOT EXISTS public.form_favorites (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, form_id)
);

-- RLS 활성화
ALTER TABLE public.form_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_favorites ENABLE ROW LEVEL SECURITY;

-- form_labels 정책
CREATE POLICY "Anyone can read labels"
  ON public.form_labels FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage labels"
  ON public.form_labels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR department = '관리부')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR department = '관리부')));

-- forms 정책 (접근 등급·부서 필터는 API 레이어에서 처리)
CREATE POLICY "Authenticated can read forms"
  ON public.forms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage forms"
  ON public.forms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR department = '관리부')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR department = '관리부')));

-- form_versions 정책
CREATE POLICY "Authenticated can read versions"
  ON public.form_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage versions"
  ON public.form_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR department = '관리부')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR department = '관리부')));

-- form_favorites 정책
CREATE POLICY "Users can manage own favorites"
  ON public.form_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage 정책
CREATE POLICY "Authenticated can download forms"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'forms');

CREATE POLICY "Admins can upload forms"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forms' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR department = '관리부'))
  );

CREATE POLICY "Admins can delete forms files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'forms' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR department = '관리부'))
  );

-- updated_at 트리거 (함수가 없을 경우에만 생성)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS forms_updated_at ON public.forms;
CREATE TRIGGER forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
