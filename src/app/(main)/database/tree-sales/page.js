import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import SearchInput from './SearchInput'; // 검색창 컴포넌트

// 서버에서 데이터를 미리 가져오는 함수 (검색 기능 포함)
async function getSalesData(query) {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    let queryBuilder = supabase
        .from('tree_sales_info')
        .select('*');

    // 검색어가 있는 경우, 검색 조건 추가
    if (query) {
        // 'tree_name', 'region', 'size', 'company_name' 컬럼에서 검색
        // ilike는 대소문자를 무시하고 검색합니다.
        queryBuilder = queryBuilder.or(
            `tree_name.ilike.%${query}%,` +
            `region.ilike.%${query}%,` +
            `size.ilike.%${query}%,` +
            `company_name.ilike.%${query}%`
        );
    }
    
    // 항상 지역과 수목명 순서로 정렬
    const { data: salesData, error } = await queryBuilder
        .order('region', { ascending: true })
        .order('tree_name', { ascending: true });

    if (error) {
        console.error("조경수 판매 정보 로딩 오류:", error.message);
        return {};
    }

    // 지역별로 데이터 그룹화
    const groupedData = (salesData || []).reduce((acc, item) => {
        const region = item.region || '기타';
        (acc[region] = acc[region] || []).push(item);
        return acc;
    }, {});

    return groupedData;
}


// 최종적으로 화면에 표시될 페이지 컴포넌트
export default async function TreeSalesPage({ searchParams }) {
    const query = searchParams.q || ''; // URL에서 검색어(?q=...)를 가져옵니다.
    const groupedData = await getSalesData(query); // 가져온 검색어를 데이터 요청 함수에 전달
    const regions = Object.keys(groupedData);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">전국 조경수 DB</h1>
                <p className="text-sm text-gray-500 mt-1">데이터는 매 시간 정각에 구글 시트와 자동으로 동기화됩니다.</p>
            </header>
            
            {/* 검색창 컴포넌트 */}
            <SearchInput />

            <div className="space-y-12">
                {regions.length > 0 ? (
                    // 각 지역별로 반복하며 섹션 생성
                    regions.map((region) => (
                        <div key={region}>
                            <h2 className="text-xl font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2 mb-4">
                                {region}
                            </h2>
                            <div className="overflow-x-auto bg-white rounded-lg shadow">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지역</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">업체명</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수목명</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">규격</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가격</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수량</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비고</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {/* 해당 지역의 데이터들을 반복하며 테이블 행 생성 */}
                                        {groupedData[region].map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.region}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.company_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.tree_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.size}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.price ? `${item.price.toLocaleString()}원` : '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.quantity || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.contact_info}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.remarks}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                ) : (
                    // 데이터가 하나도 없을 경우 표시될 메시지
                    <div className="text-center py-20 bg-white rounded-lg shadow">
                        <p className="text-gray-500">
                            {query ? `'${query}'에 대한 검색 결과가 없습니다.` : '표시할 데이터가 없습니다.'}
                        </p>
                        {query && (
                           <Link href="/database/tree-sales" className="mt-4 text-sm text-indigo-600 hover:underline">
                                전체 목록 보기
                           </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}