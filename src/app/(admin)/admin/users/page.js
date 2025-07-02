import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UserManagementClient from './UserManagementClient'; // 클라이언트 컴포넌트

// 데이터 포맷팅 함수
const formatEmployeeData = (profiles) => {
    if (!profiles) return [];
    return profiles.map(p => ({
        id: p.id, name: p.full_name, email: p.email, department: p.department || '미지정',
        position: p.position || '미지정', phone: p.phone || '-', status: p.status || '오프라인',
        role: p.role,
    }));
};

// /admin/users 경로의 서버 컴포넌트
export default async function UserManagementPage() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // 미들웨어에서 로그인 여부는 이미 확인했으므로, 여기서는 바로 사용자 정보를 가져옵니다.
    const { data: { user } } = await supabase.auth.getUser();
    
    // 만약의 경우를 대비해 user 객체가 없는 경우를 한 번 더 처리할 수 있습니다.
    if (!user) {
        // 이 코드는 이론상 실행되지 않지만, 안정성을 위해 추가합니다.
        return redirect('/login');
    }

    // ★★★ 핵심 변경사항 ★★★
    // 'if (!session) ...' 와 같은 불필요한 로그인 확인 코드를 제거하고,
    // 바로 'role' 확인 로직으로 넘어갑니다.
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    // 관리자(admin)가 아니면 메인 페이지로 리디렉션하여 접근을 차단합니다.
    if (profile?.role !== 'admin') {
        redirect('/'); 
    }

    // 관리자가 맞으면, 모든 직원 목록을 DB에서 불러옵니다.
    const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

    if (error) {
        return <div className="p-8 text-red-500">직원 목록을 불러오는 중 에러 발생: {error.message}</div>;
    }

    const formattedUsers = formatEmployeeData(allUsers || []);
    
    // 최종적으로 클라이언트 컴포넌트에 데이터를 전달하여 페이지를 렌더링합니다.
    return <UserManagementClient initialUsers={formattedUsers} />;
}