// 파일 경로: src/app/(main)/sites/page.js
'use client'; // 클라이언트 컴포넌트

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

// 로딩 스켈레톤 UI (선택사항, 필요 없다면 제거 가능)
const SiteSkeleton = () => (
  <div className="animate-pulse bg-white p-4 rounded-lg shadow mb-4">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    <div className="h-2 bg-gray-200 rounded w-full mt-2"></div>
  </div>
);

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('construction_sites') // Supabase 테이블 이름 확인
        .select('*')
        .order('name', { ascending: true }); // 현장 이름 순으로 정렬

      if (error) {
        console.error('현장 목록을 불러오는데 실패했습니다:', error);
      } else {
        setSites(data || []);
      }
      setLoading(false);
    };
    fetchSites();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">현장 목록</h1>
        {/* 새 현장 등록 페이지로 이동하는 버튼 */}
        <Link href="/sites/new" className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          새 현장 등록
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // 로딩 중일 때 스켈레톤 UI 표시
          Array.from({ length: 3 }).map((_, i) => <SiteSkeleton key={i} />)
        ) : sites.length > 0 ? (
          // 현장 목록이 있을 때 표시
          sites.map((site) => (
            // 각 현장을 클릭하면 개별 현장 상세 페이지로 이동
            <Link href={`/sites/${site.id}`} key={site.id} className="block bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-bold text-gray-800 truncate">{site.name}</h2>
              <p className="text-sm text-gray-500 mt-1">담당자: {site.manager || '미정'}</p> {/* manager 컬럼이 있다면 */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${site.progress || 0}%` }}></div>
              </div>
              <p className="text-right text-sm font-semibold text-gray-600 mt-2">{site.progress || 0}% 완료</p>
            </Link>
          ))
        ) : (
          // 현장 목록이 없을 때 메시지 표시
          <p className="text-center text-gray-500 col-span-full py-10">등록된 현장이 없습니다. 새 현장을 등록해보세요.</p>
        )}
      </div>
    </div>
  );
}