// 파일 경로: src/app/(main)/notices/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';

export default function NoticeDetailPage({ params }) {
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const { employee } = useEmployee();
  const noticeId = params.id;

  useEffect(() => {
    if (!noticeId) return;

    const fetchNotice = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notices')
        .select(`*, profiles ( full_name )`)
        .eq('id', noticeId)
        .single();

      if (error || !data) {
        console.error('공지사항 로딩 실패:', error);
        alert('해당 공지사항을 찾을 수 없습니다.');
        router.push('/notices');
      } else {
        setNotice(data);
      }
      setLoading(false);
    };

    fetchNotice();
  }, [noticeId, supabase, router]);

  // ★★★★★ 삭제 버튼을 위한 함수 추가 ★★★★★
  const handleDelete = async () => {
    // 사용자에게 다시 한번 확인받습니다.
    if (window.confirm('정말로 이 공지사항을 삭제하시겠습니까? 되돌릴 수 없습니다.')) {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', noticeId);

      if (error) {
        console.error('삭제 실패:', error);
        alert('삭제에 실패했습니다. 권한을 확인해주세요.');
      } else {
        alert('공지사항이 삭제되었습니다.');
        router.push('/notices'); // 삭제 후 목록 페이지로 이동
        router.refresh(); // 목록 페이지 캐시를 새로고침하여 삭제된 내용이 바로 반영되도록 함
      }
    }
  };

  const isAdmin = employee?.role === 'admin';

  if (loading) {
    return <div className="p-8 text-center">공지사항을 불러오는 중...</div>;
  }

  if (!notice) {
    return null; 
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 break-words">{notice.title}</h1>
          <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
            <span>작성자: {notice.profiles?.full_name || '알 수 없음'}</span>
            <span>작성일: {new Date(notice.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="prose prose-lg max-w-none text-gray-800" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {notice.content}
        </div>

        {/* ★★★★★ 관리자에게만 보이는 버튼 영역 수정 ★★★★★ */}
        {isAdmin && (
          <div className="flex justify-end items-center gap-4 mt-8 border-t border-gray-200 pt-6">
            <Link 
              href={`/notices/${notice.id}/edit`}
              className="py-2 px-4 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-colors"
            >
              수정
            </Link>
            <button
              onClick={handleDelete}
              className="py-2 px-4 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}