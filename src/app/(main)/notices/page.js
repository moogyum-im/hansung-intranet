import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import NoticeListClient from './NoticeListClient';

export default async function NoticesPage() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // 1. 현재 로그인한 사용자 정보를 가져옵니다.
    const { data: { user } } = await supabase.auth.getUser();

    // 2. ★★★ 핵심 수정사항 ★★★
    // 사용자 정보가 있을 경우, profiles 테이블에서 role을 포함한 상세 정보를 조회합니다.
    let currentUserProfile = null;
    if(user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role') // role 정보만 필요하므로, role만 요청
            .eq('id', user.id)
            .single();
        // user 객체와 profile 객체를 합쳐 완전한 사용자 정보를 만듭니다.
        currentUserProfile = { ...user, ...profile };
    }
    
    // 3. 공지사항 목록을 가져옵니다 (이 부분은 이전과 동일).
    const { data: notices, error } = await supabase
        .from('notices')
        .select(`*, profiles(full_name)`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error("공지사항 목록 불러오기 실패:", error);
    }
    
    // 4. 클라이언트 컴포넌트에 'role' 정보가 포함된 완전한 사용자 객체를 전달합니다.
    return (
        <NoticeListClient 
            initialNotices={notices || []} 
            currentUser={currentUserProfile} 
        />
    );
}