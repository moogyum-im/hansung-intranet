"use server";

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from "next/headers";
import { revalidatePath } from 'next/cache';

const PROFILES_TABLE_NAME = 'profiles';

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

// --- 신규 사용자 추가 액션 ---
export async function addUserAction(formData) {
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
                role: formData.role,
                employment_status: formData.employment_status
            });
        if (profileError) throw profileError;

        revalidatePath('/admin/users');
        revalidatePath('/organization');
        return { success: true, data: { id: newUser.id, full_name: formData.full_name, email: newUser.email } };
    } catch (error) {
        return { success: false, error: error.message || '신규 사용자 추가 중 오류가 발생했습니다.' };
    }
}

// --- 사용자 전체 정보 수정 액션 ---
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
                role: formData.role,
                employment_status: formData.employment_status
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

// --- 사용자 상태 수정 액션 ---
export async function updateStatusAction(employeeId, newStatus) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '인증되지 않은 사용자입니다.' };
    
    try {
        const { data, error } = await supabase
            .from(PROFILES_TABLE_NAME)
            .update({ status: newStatus })
            .eq('id', employeeId);
        if (error) throw error;
        
        revalidatePath('/dashboard'); 
        revalidatePath('/organization');
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message || '상태 업데이트 처리 중 알 수 없는 오류 발생' };
    }
}

// --- [수정] 사용자 삭제 액션 ---
export async function deleteUserAction(userIdToDelete) {
    try {
        // 1. profiles 테이블에서 먼저 프로필 정보를 삭제합니다.
        const { error: profileError } = await supabaseAdmin
            .from(PROFILES_TABLE_NAME)
            .delete()
            .eq('id', userIdToDelete);

        if (profileError) {
            // RLS 정책 등으로 여기서 오류가 발생할 수 있습니다.
            throw new Error(`프로필 삭제 실패: ${profileError.message}`);
        }

        // 2. Supabase Auth에서 사용자를 삭제합니다.
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
        
        // 사용자가 이미 auth.users에 없는 경우(예: 이전 단계에서 부분적으로만 삭제된 경우) 오류가 발생할 수 있으나,
        // 최종 목표는 삭제이므로 특정 오류 코드는 무시하고 성공으로 처리할 수 있습니다.
        if (authError && authError.code !== 'resource_not_found') {
             throw new Error(`인증 사용자 삭제 실패: ${authError.message}`);
        }

        revalidatePath('/admin/users');
        revalidatePath('/organization');
        return { success: true };
        
    } catch (error) {
        return { success: false, error: error.message || '사용자 삭제 중 오류가 발생했습니다.' };
    }
}