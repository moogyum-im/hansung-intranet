import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import NoticeEditor from '../../NoticeEditor'; // 경로가 한 단계 더 깊어졌으므로 '../'가 두 번입니다.
import { notFound, redirect } from 'next/navigation';

export default async function EditNoticePage({ params }) {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // 로그인 정보 및 관리자 권한 확인
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'admin') redirect(`/notices/${params.id}`); // 관리자가 아니면 상세 페이지로 리디렉션

    // 수정할 게시글의 데이터를 가져옵니다.
    const { data: notice } = await supabase
        .from('notices')
        .select('*')
        .eq('id', params.id)
        .single();
    
    if (!notice) {
        notFound();
    }

    // NoticeEditor에 게시글(notice)과 함께 isEditing prop을 true로 전달하여 '수정 모드'로 실행
    return <NoticeEditor notice={notice} isEditing={true} />;
}