import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

async function getConstructionData() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    const { data, error } = await supabase
        .from('construction_site_info')
        .select('*')
        .order('region'); // 지역 순으로 정렬

    if (error) {
        console.error("공사 현황 정보 로딩 오류:", error.message);
        return [];
    }
    return data;
}

export default async function ConstructionStatusPage() {
    const sites = await getConstructionData();

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">전국 공사 현황 DB</h1>
                <p className="text-sm text-gray-500 mt-1">데이터는 매 시간 정각에 구글 시트와 자동으로 동기화됩니다.</p>
            </header>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        {/* ★★★ 테이블 헤더 순서 변경 ★★★ */}
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">업체명</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">브랜드명</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">단지명</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지역</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">입주예정</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비고</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {/* ★★★ 테이블 데이터 순서 변경 ★★★ */}
                        {sites.map((site) => (
                            <tr key={site.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{site.company_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{site.brand_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{site.complex_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{site.region}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{site.scheduled_move_in}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{site.remarks}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}