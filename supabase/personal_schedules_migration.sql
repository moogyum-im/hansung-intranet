-- 개인 일정 테이블
CREATE TABLE IF NOT EXISTS personal_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    schedule_date DATE NOT NULL,
    memo TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 공개 범위 및 작성자 이름 컬럼 추가
ALTER TABLE personal_schedules ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private'));
ALTER TABLE personal_schedules ADD COLUMN IF NOT EXISTS employee_name TEXT;

-- 기존 데이터는 모두 나만보기로 처리
UPDATE personal_schedules SET visibility = 'private' WHERE visibility IS NULL;

-- RLS 활성화
ALTER TABLE personal_schedules ENABLE ROW LEVEL SECURITY;

-- 기존 조회 정책 삭제 후 재생성 (본인 + 공개 일정 조회 허용)
DROP POLICY IF EXISTS "본인 일정만 조회" ON personal_schedules;
CREATE POLICY "일정 조회" ON personal_schedules
    FOR SELECT USING (auth.uid() = user_id OR visibility = 'public');

DROP POLICY IF EXISTS "본인 일정만 삽입" ON personal_schedules;
CREATE POLICY "본인 일정만 삽입" ON personal_schedules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 일정만 수정" ON personal_schedules;
CREATE POLICY "본인 일정만 수정" ON personal_schedules
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 일정만 삭제" ON personal_schedules;
CREATE POLICY "본인 일정만 삭제" ON personal_schedules
    FOR DELETE USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS personal_schedules_user_date ON personal_schedules(user_id, schedule_date);
CREATE INDEX IF NOT EXISTS personal_schedules_visibility_date ON personal_schedules(visibility, schedule_date);
