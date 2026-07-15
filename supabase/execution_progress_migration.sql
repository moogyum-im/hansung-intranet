-- ─────────────────────────────────────────
-- 실행 내역서 (execution_estimates)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS execution_estimates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID REFERENCES construction_sites(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL DEFAULT 1,
  version_label TEXT NOT NULL DEFAULT '원본',
  version_date  DATE,
  notes         TEXT,
  is_current    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_estimate_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id          UUID REFERENCES execution_estimates(id) ON DELETE CASCADE,
  category             TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_execution_estimates_site_id ON execution_estimates(site_id);
CREATE INDEX IF NOT EXISTS idx_execution_estimate_items_estimate_id ON execution_estimate_items(estimate_id);

-- ─────────────────────────────────────────
-- 기성 청구 (progress_billings)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_billings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID REFERENCES construction_sites(id) ON DELETE CASCADE,
  billing_round INTEGER NOT NULL DEFAULT 1,
  billing_date  DATE,
  total_amount  NUMERIC DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress_billing_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id        UUID REFERENCES progress_billings(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,
  sort_order        INTEGER DEFAULT 0,
  item_name         TEXT NOT NULL,
  spec              TEXT DEFAULT '',
  unit              TEXT DEFAULT '',
  contract_quantity NUMERIC DEFAULT 0,
  billing_quantity  NUMERIC DEFAULT 0,
  billing_rate      NUMERIC DEFAULT 0,
  unit_price        NUMERIC DEFAULT 0,
  contract_amount   NUMERIC DEFAULT 0,
  billing_amount    NUMERIC DEFAULT 0,
  notes             TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_progress_billings_site_id ON progress_billings(site_id);
CREATE INDEX IF NOT EXISTS idx_progress_billing_items_billing_id ON progress_billing_items(billing_id);
