-- menu_permissions 테이블 생성
-- 관리자가 직원별 사이드바 메뉴 표시 여부를 제어합니다.
-- 레코드가 없는 직원은 기존 부서 기반 기본 규칙이 적용됩니다.

CREATE TABLE IF NOT EXISTS public.menu_permissions (
    user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    menu_key TEXT NOT NULL,
    PRIMARY KEY (user_id, menu_key)
);

ALTER TABLE public.menu_permissions ENABLE ROW LEVEL SECURITY;

-- 직원 본인은 자신의 권한만 조회 가능
CREATE POLICY "Users can view own menu permissions"
    ON public.menu_permissions FOR SELECT
    USING (user_id = auth.uid());

-- 관리자는 모든 직원 권한 조회 가능
CREATE POLICY "Admins can view all menu permissions"
    ON public.menu_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR department = '관리부')
        )
    );

-- 관리자만 삽입/삭제 가능
CREATE POLICY "Admins can insert menu permissions"
    ON public.menu_permissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR department = '관리부')
        )
    );

CREATE POLICY "Admins can delete menu permissions"
    ON public.menu_permissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR department = '관리부')
        )
    );
