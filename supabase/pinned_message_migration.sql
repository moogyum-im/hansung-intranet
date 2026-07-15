-- chat_rooms 테이블에 고정 메시지 컬럼 추가
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS pinned_message JSONB DEFAULT NULL;
