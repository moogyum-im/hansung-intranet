// 파일 경로: src/app/(main)/construction-sites/page.js

// 1. [변경] supabase 대신 서버용 클라이언트 생성 함수를 import 합니다.
import { createSupabaseServerClient } from 'lib/supabase/server'; // (../../ 사라짐)
// ConstructionSitesClient import도 확인:
import ConstructionSitesClient from 'app/(main)/construction-sites/ConstructionSitesClient'; // src 기준으로 변경
// page.js는 async 함수이므로 서버에서 실행됩니다.
export default async function ConstructionSitesPage() {
    
    // 2. [변경] 페이지 컴포넌트 안에서 서버용 클라이언트 인스턴스를 생성합니다.
    const supabaseServer = createSupabaseServerClient(); 

    // 3. [변경] 생성된 서버용 클라이언트(supabaseServer)를 사용해서 데이터를 가져옵니다.
    const { data: initialSites, error } = await supabaseServer
        .from('construction_sites')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching initial data:', error.message);
        return (
            <div className="text-center p-10 text-red-500">
                데이터를 불러오는 중 에러가 발생했습니다: {error.message}
            </div>
        );
    }
    
    // 가져온 데이터를 클라이언트 컴포넌트에 props로 넘겨주는 것은 그대로 유지합니다.
    return <ConstructionSitesClient initialSites={initialSites} />;
}