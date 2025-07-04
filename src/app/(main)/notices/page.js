// 파일 경로: src/app/(main)/notices/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useEmployee } from '@/contexts/EmployeeContext';

// 로딩 스켈레톤 UI
const NoticeSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
  </div>
);

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useEmployee(); // 현재 로그인한 사용자 정보 가져오기

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notices')
        .select(`
          id,
          title,
          created_at,
          author:author_id ( full_name )
        `)
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

  const isAdmin = employee?.role === 'admin'; // 사용자가 관리자인지 확인

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">공지사항</h1>
        {/* 관리자일 경우에만 '새 공지 작성' 버튼 보이기 */}
        {isAdmin && (
          <Link href="/notices/new" className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            새 공지 작성
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md">
        <ul className="divide-y divide-gray-100">
          {loading ? (
            // 로딩 중일 때 스켈레톤 UI 보여주기
            Array.from({ length: 5 }).map((_, index) => (
              <li key={index} className="p-4">
                <NoticeSkeleton />
              </li>
            ))
          ) : notices.length > 0 ? (
            // 공지사항 목록 보여주기
            notices.map(notice => (
              <li key={notice.id} className="p-4 hover:bg-gray-50 transition-colors">
                <Link href={`/notices/${notice.id}`} className="block">
                  <div className="flex justify-between items-baseline">
                    <h2 className="text-lg font-semibold text-gray-800 truncate">{notice.title}</h2>
                    <p className="text-sm text-gray-500 shrink-0 ml-4">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    작성자: {notice.author?.full_name || '알 수 없음'}
                  </p>
                </Link>
              </li>
            ))
          ) : (
            // 공지사항이 없을 때 메시지 보여주기
            <li className="p-10 text-center text-gray-500">
              등록된 공지사항이 없습니다.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}