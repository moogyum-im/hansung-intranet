"use server";
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function loginAction(formData) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
        return { success: false, error: '이메일과 비밀번호를 모두 입력해주세요.' };
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return { success: false, error: '로그인 실패: ' + error.message };
    }
    
    redirect('/dashboard');
}

export async function signOutAction() {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    await supabase.auth.signOut();
    redirect('/login');
}

// ★★★ 개인정보 업데이트를 위한 서버 액션 수정 ★★★
export async function updateProfileAction(formData) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: '사용자 인증에 실패했습니다.' };

    const fullName = formData.get('fullName');
    const position = formData.get('position');
    const phone = formData.get('phone'); // phone_number -> phone으로 수정

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            position: position,
            phone: phone, // phone_number -> phone으로 수정
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    if (error) {
        return { success: false, error: '프로필 업데이트에 실패했습니다: ' + error.message };
    }
    
    revalidatePath('/(main)/mypage/settings', 'page');
    revalidatePath('/(main)/layout', 'layout');
    return { success: true, message: '프로필이 성공적으로 업데이트되었습니다.' };
}

// ★★★ 비밀번호 변경을 위한 서버 액션 ★★★
export async function updateUserPasswordAction(formData) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword.length < 6) {
        return { success: false, error: '비밀번호는 6자 이상이어야 합니다.' };
    }
    if (newPassword !== confirmPassword) {
        return { success: false, error: '새 비밀번호가 일치하지 않습니다.' };
    }
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
        return { success: false, error: '비밀번호 변경에 실패했습니다: ' + error.message };
    }

    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
}