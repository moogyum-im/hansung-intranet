-- 입찰 기록 관리 마이그레이션
-- 실행: Supabase SQL Editor에서 실행

-- 1. 입찰 프로젝트
CREATE TABLE IF NOT EXISTS bid_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  bid_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 회사 정보 (프로젝트별 A/B/C사)
CREATE TABLE IF NOT EXISTS bid_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES bid_projects(id) ON DELETE CASCADE,
  company_key TEXT NOT NULL CHECK (company_key IN ('A', 'B', 'C')),
  company_name TEXT NOT NULL DEFAULT '',
  is_ours BOOLEAN DEFAULT false,
  pdf_url TEXT,
  pdf_filename TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, company_key)
);

-- 3. 항목 (비교 행)
CREATE TABLE IF NOT EXISTS bid_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES bid_projects(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  unit TEXT DEFAULT '식',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 항목별 회사별 금액
CREATE TABLE IF NOT EXISTS bid_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES bid_items(id) ON DELETE CASCADE,
  company_key TEXT NOT NULL CHECK (company_key IN ('A', 'B', 'C')),
  amount NUMERIC DEFAULT 0,
  notes TEXT,
  UNIQUE (item_id, company_key)
);

-- RLS 비활성화 (사내 인트라넷 전용)
ALTER TABLE bid_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE bid_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE bid_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE bid_costs DISABLE ROW LEVEL SECURITY;

-- Storage 버킷: bid-pdfs (Supabase 대시보드 Storage에서 직접 생성 필요)
-- bucket name: bid-pdfs, public: false
