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
    
    // 1. 이메일/비밀번호로 1차 인증
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
        return { success: false, error: '로그인 실패: ' + authError.message };
    }

    // 2. 인증 성공 후, 재직 상태 확인
    if (authData.user) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('employment_status')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
            await supabase.auth.signOut(); // 프로필 조회 실패 시 보안을 위해 로그아웃
            return { success: false, error: '사용자 프로필을 불러올 수 없습니다.' };
        }

        // 🚀 [수정] 3. 휴직 및 퇴사 상태 세분화하여 로그인 차단
        if (profile.employment_status === '휴직') {
            await supabase.auth.signOut(); // 즉시 세션 파기
            return { success: false, error: '휴직 중에는 인트라넷 접속이 제한됩니다.' };
        } else if (profile.employment_status !== '재직') {
            await supabase.auth.signOut(); // 기타 비활성/퇴사 계정
            return { success: false, error: '퇴사 처리되었거나 비활성화된 계정입니다.' };
        }
    }
    
    redirect('/dashboard');
}

export async function signOutAction() {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    await supabase.auth.signOut();
    redirect('/login');
}

export async function updateProfileAction(formData) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: '사용자 인증에 실패했습니다.' };

    const fullName = formData.get('fullName');
    const position = formData.get('position');
    const phone = formData.get('phone'); 

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            position: position,
            phone: phone, 
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