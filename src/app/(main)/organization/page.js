// 파일 경로: src/app/(main)/organization/page.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OrganizationClient from './OrganizationClient';

// 서버에서 조직도 데이터를 미리 가져오는 함수
async function getOrganizationData() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    const { data: employees, error } = await supabase
        .from('profiles')
        .select('*')
        .filter('department', 'neq', '시스템 관리팀')
        .order('id', { ascending: true }); // 일관된 순서를 위해 ID 정렬 추가 (선택 사항)

    if (error) {
        console.error("조직도 데이터 로딩 실패:", error);
        return [];
    }
    return employees;
}

// 이 페이지의 렌더링 동작을 조정합니다.
// 매 요청마다 새로운 데이터를 가져오도록 캐싱을 비활성화합니다.
export const dynamic = 'force-dynamic'; // 서버 컴포넌트가 동적으로 렌더링되도록 강제

export default async function OrganizationPage() {
    const initialEmployees = await getOrganizationData();

    return <OrganizationClient initialEmployees={initialEmployees} />;
}