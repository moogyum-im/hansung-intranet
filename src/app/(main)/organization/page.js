// 파일 경로: src/app/(main)/organization/page.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OrganizationClient from './OrganizationClient'; // 클라이언트 컴포넌트를 import

// 서버에서 조직도 데이터를 미리 가져오는 함수
async function getOrganizationData() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    const { data: employees, error } = await supabase
        .from('profiles')
        .select('*')
        .filter('department', 'neq', '시스템 관리팀'); // 시스템 관리팀 제외

    if (error) {
        console.error("조직도 데이터 로딩 실패:", error);
        return [];
    }
    return employees;
}

export default async function OrganizationPage() {
    const initialEmployees = await getOrganizationData();

    // 서버에서 가져온 초기 데이터를 클라이언트 컴포넌트에 props로 전달
    return <OrganizationClient initialEmployees={initialEmployees} />;
}