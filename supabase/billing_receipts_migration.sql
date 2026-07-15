-- progress_billings에 청구 기간 컬럼 추가
ALTER TABLE progress_billings
  ADD COLUMN IF NOT EXISTS billing_period_start DATE,
  ADD COLUMN IF NOT EXISTS billing_period_end   DATE,
  ADD COLUMN IF NOT EXISTS expected_receive_date DATE;

-- 기성금 수령 히스토리
CREATE TABLE IF NOT EXISTS progress_billing_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id      UUID REFERENCES progress_billings(id) ON DELETE CASCADE,
  received_date   DATE NOT NULL,
  received_amount NUMERIC NOT NULL DEFAULT 0,
  receipt_rate    NUMERIC,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_receipts_billing_id ON progress_billing_receipts(billing_id);
