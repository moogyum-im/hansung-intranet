'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchInput() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // URL에 있는 기존 검색어를 가져와서 검색창의 기본값으로 설정
    const initialQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = (e) => {
        e.preventDefault();
        // 검색어가 있으면 ?q=검색어 형식으로, 없으면 ?q= 없이 주소를 변경
        if (query) {
            router.push(`/database/tree-sales?q=${query}`);
        } else {
            router.push(`/database/tree-sales`);
        }
    };

    return (
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="수목명, 규격, 지역 등으로 검색..."
                className="flex-grow px-4 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700"
            >
                검색
            </button>
        </form>
    );
}