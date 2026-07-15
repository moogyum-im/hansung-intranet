-- 서식 활동 이력 테이블
CREATE TABLE IF NOT EXISTS form_activity_log (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id      UUID        NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  form_title   TEXT        NOT NULL DEFAULT '',
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   TEXT        NOT NULL DEFAULT '알 수 없음',
  action       TEXT        NOT NULL CHECK (action IN ('download', 'edit', 'version_upload', 'delete', 'create')),
  detail       JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_activity_form_id
  ON form_activity_log(form_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_activity_user_id
  ON form_activity_log(user_id, created_at DESC);




ALTER TABLE form_activity_log ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 읽기 가능
CREATE POLICY "Authenticated can read activity logs"
  ON form_activity_log FOR SELECT
  TO authenticated
  USING (true);

-- INSERT는 service_role key 사용하므로 RLS 우회
