import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import NoticeEditor from '../NoticeEditor';

export default async function NewNoticePage() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // 1. 현재 로그인한 사용자의 정보를 '안전하게' 가져옵니다.
    const { data: { user } } = await supabase.auth.getUser();

    // 2. 로그인하지 않은 경우 리디렉션
    if (!user) {
        redirect('/login');
    }

    // 3. 관리자 여부를 확인하기 위해 'profiles' 테이블을 조회합니다.
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
    // 4. 관리자가 아니면 공지사항 목록으로 리디렉션 (보안)
    if (profile?.role !== 'admin') {
        redirect('/notices'); 
    }

    // NoticeEditor에 완전한 사용자 정보를 prop으로 전달합니다.
    return <NoticeEditor currentUser={{...user, ...profile}} />;
}