'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useEmployee } from '@/contexts/EmployeeContext';

// 로딩 스켈레톤 UI
const NoticeSkeleton = () => (
  <div className="animate-pulse flex justify-between items-center">
    <div>
        <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-24"></div>
  </div>
);

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useEmployee();

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notices')
        .select(`id, title, created_at, author:author_id ( full_name )`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('공지사항 목록을 불러오는데 실패했습니다:', error);
      } else {
        setNotices(data);
      }
      setLoading(false);
    };

    fetchNotices();
  }, []);

  const isAdmin = employee?.role === 'admin';

  return (
    // ✨ [수정] 전체 컨테이너에 여백(padding)을 추가합니다.
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">공지사항</h1>
        {isAdmin && (
          <Link href="/notices/new" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            + 새 공지 작성
          </Link>
        )}
      </header>

      <div className="bg-white rounded-xl shadow-sm border">
        {/* ✨ [수정] ul 태그를 div로 바꾸고, 내부 리스트에 더 나은 스타일을 적용합니다. */}
        <div className="divide-y divide-gray-200">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="p-5">
                <NoticeSkeleton />
              </div>
            ))
          ) : notices.length > 0 ? (
            notices.map(notice => (
              <Link key={notice.id} href={`/notices/${notice.id}`} className="block p-5 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center">
                    <div className="min-w-0">
                        <p className="text-lg font-semibold text-gray-800 truncate">{notice.title}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            작성자: {notice.author?.full_name || '알 수 없음'}
                        </p>
                    </div>
                    <p className="text-sm text-gray-500 shrink-0 ml-6">
                        {new Date(notice.created_at).toLocaleDateString()}
                    </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-16 text-center text-gray-500">
              <p>등록된 공지사항이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}