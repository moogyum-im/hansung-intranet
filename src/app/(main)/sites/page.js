'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useEmployee } from '@/contexts/EmployeeContext';

// 로딩 스켈레톤 UI
const SiteSkeleton = () => (
    <div className="p-6 bg-white rounded-xl shadow-sm border animate-pulse">
       <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
       <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
       <div className="h-2 bg-gray-200 rounded-full"></div>
    </div>
);

// 카드 형태의 현장 아이템 컴포넌트
const SiteCard = ({ site }) => {
    const statusStyles = {
        '진행중': 'bg-blue-100 text-blue-800',
        '완료': 'bg-green-100 text-green-800',
        '보류': 'bg-yellow-100 text-yellow-800',
        '중단': 'bg-red-100 text-red-800',
    };

    return (
        <Link href={`/sites/${site.id}`} className="block p-6 bg-white rounded-xl shadow-sm border hover:shadow-md hover:-translate-y-1 transition-all duration-200">
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-gray-900 truncate">{site.name}</h3>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyles[site.status] || 'bg-gray-100 text-gray-800'}`}>
                    {site.status || '상태 없음'}
                </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">담당자: {site.manager || '미지정'}</p>
            <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
                    <span>공정률</span>
                    <span>{site.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${site.progress || 0}%` }}></div>
                </div>
            </div>
        </Link>
    );
};

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useEmployee(); // 관리자 여부 확인을 위해 추가

  useEffect(() => {
    const fetchSites = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('construction_sites')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('현장 목록을 불러오는데 실패했습니다:', error);
      } else {
        setSites(data || []);
      }
      setLoading(false);
    };
    fetchSites();
  }, []);

  const isAdmin = employee?.role === 'admin';

  return (
    // ✨ [수정] 전체 컨테이너에 여백(padding)을 추가합니다.
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">현장 목록</h1>
        {/* ✨ 관리자일 때만 버튼이 보이도록 수정 */}
        {isAdmin && (
            <Link href="/sites/new" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                + 새 현장 등록
            </Link>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <SiteSkeleton key={i} />)}
        </div>
      ) : sites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sites.map((site) => (
                <SiteCard key={site.id} site={site} />
            ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border">
            <p className="text-gray-500">등록된 현장이 없습니다.</p>
            {isAdmin && <p className="text-sm text-gray-400 mt-2">새 현장 등록 버튼을 눌러 현장을 추가해보세요.</p>}
        </div>
      )}
    </div>
  );
}