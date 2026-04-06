"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false 
        }
    }
);

export async function registerEmployeeAction(formData) {
    try {
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

        // 2. profiles 테이블에 정보 반영
        // 🚀 에러 해결 및 연차 0일 초기화 설정
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
                    
                    // 🚀 [추가] 신규 사원 연차 데이터를 0으로 강제 초기화
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
        return { error: "서버 통신 중 오류가 발생했습니다." };
    }
}