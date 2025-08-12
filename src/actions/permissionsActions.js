'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// 관리자인지 확인하는 함수 (보안 강화)
async function isAdmin(supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    return profile?.role === 'admin';
}

// 모든 사용자 목록과, 각 사용자가 가진 게시판 권한 정보를 함께 가져오는 함수
export async function getUsersWithPermissions() {
    const supabase = createServerActionClient({ cookies });
    if (!(await isAdmin(supabase))) return { error: '권한이 없습니다.' };

    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email');
    if (usersError) return { error: usersError.message };
    
    const { data: permissions, error: permsError } = await supabase
        .from('board_permissions')
        .select('user_id, board_id');
    if (permsError) return { error: permsError.message };

    // 사용자 목록에 각 사용자가 가진 권한 ID 배열을 추가
    const usersWithPerms = users.map(user => ({
        ...user,
        permissionIds: permissions
            .filter(p => p.user_id === user.id)
            .map(p => p.board_id)
    }));
    
    return { users: usersWithPerms };
}

// 모든 게시판 목록을 가져오는 함수
export async function getAllBoards() {
    const supabase = createServerActionClient({ cookies });
    if (!(await isAdmin(supabase))) return { error: '권한이 없습니다.' };
    
    const { data, error } = await supabase.from('resource_boards').select('id, name');
    if (error) return { error: error.message };
    return { boards: data };
}

// 특정 사용자에게 특정 게시판 권한을 부여하는 함수
export async function grantPermissionAction(userId, boardId) {
    const supabase = createServerActionClient({ cookies });
    if (!(await isAdmin(supabase))) return { error: '권한이 없습니다.' };

    const { error } = await supabase
        .from('board_permissions')
        .insert({ user_id: userId, board_id: boardId });
    
    if (error) return { error: error.message };
    revalidatePath('/admin/permissions'); // 관리자 페이지 캐시 갱신
    return { success: true };
}

// 특정 사용자에게서 특정 게시판 권한을 회수하는 함수
export async function revokePermissionAction(userId, boardId) {
    const supabase = createServerActionClient({ cookies });
    if (!(await isAdmin(supabase))) return { error: '권한이 없습니다.' };

    const { error } = await supabase
        .from('board_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('board_id', boardId);
        
    if (error) return { error: error.message };
    revalidatePath('/admin/permissions'); // 관리자 페이지 캐시 갱신
    return { success: true };
}