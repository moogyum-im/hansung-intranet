import { supabase } from '@/lib/supabaseClient';
import ConstructionSitesClient from './ConstructionSitesClient'; // 우리가 곧 만들 클라이언트 컴포넌트

// page.js는 이제 async 함수가 되어 서버에서 직접 데이터를 가져옵니다.
export default async function ConstructionSitesPage() {
    
    // 1. 서버에서 데이터를 미리 가져옵니다. 'use client'가 없다는 점에 주목하세요!
    const { data: initialSites, error } = await supabase
        .from('construction_sites')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching initial data:', error);
        // 여기서 에러 페이지를 보여주는 것도 좋은 방법입니다.
        return <div className="text-center p-10 text-red-500">데이터를 불러오는 중 에러가 발생했습니다.</div>;
    }
    
    // 2. 가져온 데이터(initialSites)를 클라이언트 컴포넌트에 props로 넘겨줍니다.
    return <ConstructionSitesClient initialSites={initialSites} />;
}