-- 하이웍스 메일 IMAP 연동을 위한 profiles 테이블 컬럼 추가
-- Supabase SQL Editor에서 실행

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS hiworks_email TEXT,
    ADD COLUMN IF NOT EXISTS hiworks_password_enc TEXT;

COMMENT ON COLUMN profiles.hiworks_email IS '하이웍스 로그인 이메일 (예: user@han-sung.com)';
COMMENT ON COLUMN profiles.hiworks_password_enc IS '하이웍스 비밀번호 AES-256 암호화 저장값';
