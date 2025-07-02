"use server";

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getSupabase() {
    const cookieStore = cookies();
    return createServerActionClient({ cookies: () => cookieStore });
}

// 저장 (추가/수정) 액션
export async function saveNoticeAction(noticeId, formData, authorId) {
    const supabase = await getSupabase();
    
    let result = null;

    try {
        if (noticeId) { // 수정 모드
            const { data, error } = await supabase
                .from('notices')
                .update({ 
                    title: formData.title,
                    content: formData.content,
                    is_pinned: formData.is_pinned 
                })
                .eq('id', noticeId)
                .select('id') // ★★★ id를 반드시 select 하도록 명시 ★★★
                .single();
            if (error) throw error;
            result = data;

        } else { // 추가 모드
            if (!authorId) throw new Error("작성자 정보가 없습니다. 다시 로그인해주세요.");
            
            const { data, error } = await supabase
                .from('notices')
                .insert({
                    title: formData.title,
                    content: formData.content,
                    is_pinned: formData.is_pinned,
                    author_id: authorId,
                })
                .select('id') // ★★★ id를 반드시 select 하도록 명시 ★★★
                .single();
            if (error) throw error;
            result = data;
        }

        revalidatePath('/notices');
        revalidatePath(`/notices/${result.id}`);

        // 이제 result 객체는 { id: ... } 형태를 보장합니다.
        return { data: result };

    } catch (error) {
        console.error('SaveNoticeAction Error:', error);
        return { error: error.message };
    }
}


// 삭제 액션
export async function deleteNoticeAction(noticeId) {
    const supabase = await getSupabase();
    
    try {
        const { error } = await supabase.from('notices').delete().eq('id', noticeId);
        if (error) throw error;

        revalidatePath('/notices');
        
        return { success: true };
    } catch (error) {
        console.error('DeleteNoticeAction Error:', error);
        return { error: error.message };
    }
}