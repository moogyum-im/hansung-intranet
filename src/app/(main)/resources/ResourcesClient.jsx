'use client';

import { useState, useMemo } from 'react';

// 아이콘 컴포넌트들
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V3" /></svg>;

export default function ResourcesClient({ initialResources }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredResources = useMemo(() => {
        if (!searchTerm) return initialResources;
        return initialResources.filter(resource =>
            resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, initialResources]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">자료실</h1>
                <p className="mt-2 text-sm text-gray-600">
                    업무에 필요한 각종 로고, 서식, 템플릿 파일을 다운로드할 수 있습니다.
                </p>
            </header>

            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="자료명, 설명, 분류로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                    />
                </div>
            </div>

            <main>
                {filteredResources.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredResources.map(resource => (
                            <div key={resource.id} className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col overflow-hidden transition-transform hover:scale-105 hover:shadow-xl">
                                <div className="p-6 flex-grow">
                                    <div>
                                        <span className="px-2 py-1 text-xs font-semibold text-indigo-800 bg-indigo-100 rounded-full">{resource.category || '기타'}</span>
                                        <h3 className="mt-2 text-lg font-semibold text-gray-800">{resource.name}</h3>
                                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{resource.description}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 border-t">
                                    {/* [수정] a 태그의 href에 파일 원본 이름(name)을 추가로 전달합니다. */}
                                    <a
                                        href={`/api/download?path=${encodeURIComponent(resource.file_path)}&name=${encodeURIComponent(resource.name)}`}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                                    >
                                        <DownloadIcon />
                                        다운로드
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md border">
                        <h3 className="text-xl font-semibold text-gray-800">검색 결과가 없습니다.</h3>
                        <p className="mt-2 text-gray-500">다른 검색어를 입력해보세요.</p>
                    </div>
                )}
            </main>
        </div>
    );
}