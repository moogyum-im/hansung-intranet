// 파일 경로: src/actions/resourceActions.js
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'company-resources';

export async function createResource(previousState, formData) {
    const supabase = createServerActionClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '로그인이 필요합니다.' };

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (profileError || profile.role !== 'admin') {
        return { error: '관리자만 자료를 생성할 수 있습니다.' };
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const name = formData.get('name');
    const description = formData.get('description');
    const category = formData.get('category');
    const file = formData.get('file');

    if (!name || !file || file.size === 0) {
        return { error: '자료명과 파일은 필수입니다.' };
    }
    
    // [수정] 한글 및 특수문자를 포함한 파일 이름을 안전하게 인코딩합니다.
    const safeFileName = encodeURIComponent(file.name.replace(/\s/g, '_'));
    const filePath = `uploads/${user.id}/${Date.now()}-${safeFileName}`;

    try {
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: dbError } = await supabaseAdmin
            .from('resources')
            .insert({ name, description, category, file_path: filePath, uploader_id: user.id });
        if (dbError) throw dbError;

    } catch (error) {
        console.error('자료 생성 실패 (관리자 모드):', error);
        return { error: `자료 생성 실패: ${error.message}` };
    }

    revalidatePath('/resources');
    revalidatePath('/admin/resources');
    
    return { success: true, message: '자료가 성공적으로 생성되었습니다.' };
}

// (deleteResource 함수는 기존과 동일)
export async function deleteResource(resourceId, filePath) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
    try {
        const { error: storageError } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]);
        if (storageError) throw storageError;
        const { error: dbError } = await supabaseAdmin.from('resources').delete().eq('id', resourceId);
        if (dbError) throw dbError;
    } catch (error) {
        console.error('자료 삭제 실패 (관리자 모드):', error);
        return { error: '자료를 삭제하는 데 실패했습니다.' };
    }
    revalidatePath('/admin/resources');
    return { success: true, message: '자료가 성공적으로 삭제되었습니다.' };
}