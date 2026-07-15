
-- 계약 내역 버전 관리 테이블
CREATE TABLE IF NOT EXISTS contract_estimates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID REFERENCES construction_sites(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL DEFAULT 1,
  version_label TEXT NOT NULL DEFAULT '원계약',
  version_date  DATE,
  notes         TEXT,
  is_current    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 계약 내역 항목 테이블
CREATE TABLE IF NOT EXISTS contract_estimate_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id          UUID REFERENCES contract_estimates(id) ON DELETE CASCADE,
  category             TEXT NOT NULL,
  -- evergreen_tree / deciduous_tree / evergreen_shrub / deciduous_shrub
  -- ground_flower / supplementary / maintenance
  sort_order           INTEGER DEFAULT 0,
  item_name            TEXT NOT NULL,
  spec                 TEXT DEFAULT '',
  unit                 TEXT DEFAULT '',
  quantity             NUMERIC DEFAULT 0,
  material_unit_price  NUMERIC DEFAULT 0,
  labor_unit_price     NUMERIC DEFAULT 0,
  overhead_unit_price  NUMERIC DEFAULT 0,
  material_amount      NUMERIC DEFAULT 0,
  labor_amount         NUMERIC DEFAULT 0,
  overhead_amount      NUMERIC DEFAULT 0,
  total_amount         NUMERIC DEFAULT 0,
  notes                TEXT DEFAULT ''
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_contract_estimates_site_id ON contract_estimates(site_id);
CREATE INDEX IF NOT EXISTS idx_contract_estimate_items_estimate_id ON contract_estimate_items(estimate_id);
