'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useEmployee } from '@/contexts/EmployeeContext';
import { 
  Megaphone, 
  PlusCircle, 
  Search, 
  ChevronRight, 
  User, 
  Calendar,
  ShieldCheck,
  FileText
} from 'lucide-react';

// --- 현장 스타일의 로딩 스켈레톤 UI ---
const NoticeSkeleton = () => (
  <div className="animate-pulse flex justify-between items-center p-6">
    <div className="flex-1">
        <div className="h-5 bg-slate-100 rounded-lg w-2/3 mb-3"></div>
        <div className="flex gap-4">
            <div className="h-3 bg-slate-50 rounded w-20"></div>
            <div className="h-3 bg-slate-50 rounded w-24"></div>
        </div>
    </div>
    <div className="h-8 w-8 bg-slate-50 rounded-full"></div>
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
    <div className="p-6 sm:p-10 bg-[#f8fafc] min-h-screen">
      {/* --- 헤더 섹션 --- */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-black text-[11px] tracking-widest uppercase mb-2">
            <ShieldCheck size={14} /> Official Announcements
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            공지사항 <Megaphone className="text-blue-600" size={28} />
          </h1>
          <p className="text-slate-500 text-[14px] mt-2 font-medium">한성 인트라넷의 주요 소식과 업무 지침을 전달합니다.</p>
        </div>

        <div className="flex items-center gap-3">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="공지 제목 검색..." 
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all w-64 shadow-sm font-medium"
                />
            </div>
            {isAdmin && (
                <Link 
                    href="/notices/new" 
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 group"
                >
                    <PlusCircle size={18} />
                    <span className="hidden sm:inline text-sm">새 공지 작성</span>
                </Link>
            )}
        </div>
      </header>

      {/* --- 공지사항 리스트 섹션 --- */}
      <main className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <NoticeSkeleton key={index} />
              ))
            ) : notices.length > 0 ? (
              notices.map((notice, index) => (
                <Link 
                    key={notice.id} 
                    href={`/notices/${notice.id}`} 
                    className="group flex items-center justify-between p-6 hover:bg-blue-50/30 transition-all"
                >
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                            {index === 0 && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black rounded uppercase tracking-wider">NEW</span>
                            )}
                            <p className="text-[16px] font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                {notice.title}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-[12px] font-semibold text-slate-400">
                            <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                <User size={12} className="text-slate-400" />
                                {notice.author?.full_name || '한성 관리자'}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Calendar size={12} />
                                {new Date(notice.created_at).toLocaleDateString('ko-KR', {
                                    year: 'numeric', month: '2-digit', day: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex w-9 h-9 rounded-full bg-slate-50 items-center justify-center text-slate-300 group-hover:bg-white group-hover:text-blue-500 group-hover:shadow-md transition-all">
                            <ChevronRight size={18} />
                        </div>
                    </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                <FileText size={50} strokeWidth={1} />
                <p className="text-[15px] font-bold mt-4 text-slate-400">등록된 공지사항이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 하단 요약 정보 */}
        <div className="mt-6 flex justify-between items-center px-2">
            <p className="text-[12px] text-slate-400 font-bold">
                TOTAL: <span className="text-blue-600">{notices.length}</span> 건의 공지사항
            </p>
            <div className="flex gap-1">
                {/* 페이지네이션이 필요한 경우 여기에 추가 가능 */}
            </div>
        </div>
      </main>
    </div>
  );
}