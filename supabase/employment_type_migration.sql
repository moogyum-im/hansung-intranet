-- 고용형태(정직원/수습직원/계약직) 구분 및 서식함 고용형태별 열람 제한
-- 1. profiles: 고용형태 + 수습/계약 만료(예정)일
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS employment_type text NOT NULL DEFAULT '정직원',
    ADD COLUMN IF NOT EXISTS employment_type_end_date date;

-- 2. forms: 고용형태 한정 공개 (null 또는 빈 배열 = 전체 고용형태 공개)
ALTER TABLE public.forms
    ADD COLUMN IF NOT EXISTS allowed_employment_types text[];
