"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { revalidatePath } from 'next/cache';

export async function addTaskAction(department, formData) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: '로그인이 필요합니다.' };

    const { error } = await supabase.from('tasks').insert({
        title: formData.title,
        department: department, // 현재 페이지의 부서
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: '진행', // 기본 상태
        assignee_id: user.id, // 담당자는 글을 등록하는 본인
    });
    
    if (error) {
        console.error("Task Add Error:", error);
        return { error: error.message };
    }

    // 해당 부서 캘린더 페이지 캐시를 갱신
    revalidatePath(`/work/${department}/calendar`);
    return { success: true };
}