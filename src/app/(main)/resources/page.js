import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ResourcesClient from './ResourcesClient'; // 2단계에서 만들 클라이언트 컴포넌트

export const revalidate = 0; // 페이지를 동적으로 렌더링하도록 설정

export default async function ResourcesPage() {
    const supabase = createServerComponentClient({ cookies });

    const { data: resources, error } = await supabase
        .from('resources')
        .select(`
            id,
            name,
            description,
            category,
            file_path,
            created_at,
            uploader:profiles (full_name)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('자료실 데이터 로딩 실패:', error);
    }
    
    // 실제 UI와 검색 로직은 Client 컴포넌트에 위임하고, 서버에서는 데이터만 전달합니다.
    return <ResourcesClient initialResources={resources || []} />;
}
