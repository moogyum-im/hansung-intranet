"use server";

import { createClient } from '@supabase/supabase-js';

export async function registerEmployeeAction(formData) {
    try {
        // 🚀 서버 에러(500) 방지: 클라이언트 생성 로직을 함수 내부로 이동
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // 환경 변수가 없으면 서버가 뻗지 않도록 프론트로 명확한 에러 메시지 반환
        if (!supabaseUrl || !serviceRoleKey) {
            return { error: "서버 환경변수 오류: SUPABASE_SERVICE_ROLE_KEY가 없거나 서버 재시작이 필요합니다." };
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false 
            }
        });

        const { 
            email, password, full_name, department, role, 
            position, phone, hire_date, birth_date, employment_status 
        } = formData;

        // 1. Supabase Auth에 신규 유저 생성
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, 
        });

        if (authError) {
            return { error: authError.message };
        }

        const newUserId = authData.user.id;

        // 2. profiles 테이블에 정보 반영 (연차 초기화 포함)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert([
                {
                    id: newUserId,
                    email: email, 
                    full_name: full_name,
                    department: department,
                    role: role,
                    position: position || null,
                    phone: phone || null,
                    hire_date: hire_date || null,
                    birth_date: birth_date || null,
                    employment_status: employment_status || '재직',
                    total_leave_days: 0,
                    used_leave_days: 0,
                    leave_days_remaining: 0,
                    remaining_leave_days: 0
                }
            ]);

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return { error: profileError.message };
        }

        return { success: true, data: authData.user };

    } catch (error) {
        console.error("사원 등록 중 서버 에러:", error);
        return { error: "서버 통신 중 알 수 없는 오류가 발생했습니다." };
    }
}