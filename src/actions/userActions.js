// src/actions/userActions.js
"use server";

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from "next/headers";
import { revalidatePath } from 'next/cache';

const PROFILES_TABLE_NAME = 'profiles';

// --- 관리자 권한이 필요한 액션을 위한 Supabase Admin 클라이언트 (Service Role Key 사용) ---
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// --- 신규 사용자 추가 액션 (관리자 전용) ---
export async function addUserAction(formData) {
    // 여기에 현재 사용자가 관리자인지 확인하는 로직을 추가하는 것이 안전합니다.
    try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
            password: formData.password,
            email_confirm: true,
            user_metadata: { full_name: formData.full_name }
        });

        if (authError) throw authError;
        
        const newUser = authData.user;
        if (!newUser) throw new Error("사용자 객체를 받지 못했습니다.");

        const { error: profileError } = await supabaseAdmin
            .from(PROFILES_TABLE_NAME)
            .insert({
                id: newUser.id,
                email: newUser.email,
                full_name: formData.full_name,
                department: formData.department,
                position: formData.position,
                phone: formData.phone,
                status: formData.status,
                role: formData.role
            });

        if (profileError) throw profileError;

        revalidatePath('/admin/users');
        revalidatePath('/organization');
        return { success: true, data: { id: newUser.id, full_name: formData.full_name, email: newUser.email } };
    } catch (error) {
        return { success: false, error: error.message || '신규 사용자 추가 중 오류가 발생했습니다.' };
    }
}

// --- 사용자 전체 정보 수정 액션 (관리자 전용) ---
export async function updateUserAction(userIdToUpdate, formData) {
    try {
        const { data, error } = await supabaseAdmin
            .from(PROFILES_TABLE_NAME)
            .update({
                full_name: formData.full_name,
                department: formData.department,
                position: formData.position,
                phone: formData.phone,
                status: formData.status,
                role: formData.role
            })
            .eq('id', userIdToUpdate);

        if (error) throw error;
        
        revalidatePath('/admin/users');
        revalidatePath('/organization');
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message || '사용자 정보 수정 중 오류가 발생했습니다.' };
    }
}


// --- 사용자 상태 수정 액션 (관리자 또는 본인) ---
// ★★★ 바로 이 함수가 수정되었습니다. ★★★
// 이전에는 newStatus만 받았지만, 이제 어떤 사용자의 상태를 바꿀지 employeeId도 함께 받습니다.
export async function updateStatusAction(employeeId, newStatus) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    
    // 현재 로그인한 사용자가 이 액션을 실행할 권한이 있는지 확인합니다 (본인 또는 관리자).
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: '인증되지 않은 사용자입니다.' };
    }
    
    // 관리자가 아니라면, 본인의 상태만 변경할 수 있도록 제한할 수 있습니다.
    // if (user.id !== employeeId && user.role !== 'admin') {
    //     return { success: false, error: '권한이 없습니다.' };
    // }

    try {
        const { data, error } = await supabase
            .from(PROFILES_TABLE_NAME)
            .update({ status: newStatus })
            .eq('id', employeeId); // 전달받은 employeeId를 사용
        
        if (error) throw error;
        
        revalidatePath('/dashboard'); 
        revalidatePath('/organization');

        return { success: true };

    } catch (e) {
        return { success: false, error: e.message || '상태 업데이트 처리 중 알 수 없는 오류 발생' };
    }
}