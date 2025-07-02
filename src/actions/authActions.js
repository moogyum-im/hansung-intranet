// src/actions/authActions.js
"use server";
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function loginAction(formData) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) return { success: false, error: '이메일과 비밀번호를 모두 입력해주세요.' };
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return { success: false, error: '로그인 실패: ' + error.message };
    
    return { success: true };
}

export async function signOutAction() {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    await supabase.auth.signOut();
    // 여기서도 redirect는 하지 않습니다. 클라이언트가 처리합니다.
}