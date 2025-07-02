"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 3c-1.31 0-2.5.34-3.54.9-1.22.65-2.26 1.5-3.09 2.58A10.012 10.012 0 0 0 1.99 10a10.012 10.012 0 0 0 1.41 3.51c.83 1.08 1.87 1.93 3.09 2.58A9.458 9.458 0 0 0 10 17c.53 0 1.05-.05 1.56-.14a.75.75 0 0 0 .6-.88l-.5-2.5a.75.75 0 0 1 .33-.7l3.23-2.02a.75.75 0 0 0 .34-.63V8.1a.75.75 0 0 0-.2-.5l-4.25-2.5a.75.75 0 0 0-.82.09l-1.92 1.92a.75.75 0 0 1-1.06 0l-.35-.35a.75.75 0 0 1 0-1.06l.75-.75A9.454 9.454 0 0 0 10 3Z" clipRule="evenodd" /></svg>;
const WriteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>;

export default function NoticeListClient({ initialNotices, currentUser }) {
    const router = useRouter();
    const isAdmin = currentUser?.role === 'admin';
    const formatDate = (dateString) => { const date = new Date(dateString); return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`; };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div><h1 className="text-3xl font-bold text-gray-800">공지사항</h1><p className="mt-1 text-gray-500">회사의 주요 소식을 확인하세요.</p></div>
                {isAdmin && (<Link href="/notices/new" className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"><WriteIcon /><span>글쓰기</span></Link>)}
            </header>
            <main className="bg-white rounded-xl shadow-md border border-gray-200/80 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 min-w-[600px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3 w-[80px] text-center">번호</th><th scope="col" className="px-6 py-3 flex-grow">제목</th>
                            <th scope="col" className="px-6 py-3 w-[150px]">작성자</th><th scope="col" className="px-6 py-3 w-[150px]">작성일</th>
                        </tr>
                    </thead>
                    <tbody>
                        {initialNotices.map((notice) => (
                            <tr key={notice.id} onClick={() => router.push(`/notices/${notice.id}`)} className={`border-b cursor-pointer ${notice.is_pinned ? 'bg-amber-50 hover:bg-amber-100 font-semibold' : 'bg-white hover:bg-gray-100/50'}`}>
                                <td className="px-6 py-4 text-center">
                                    {notice.is_pinned ? (<div className="flex justify-center items-center gap-1.5 text-red-600"><PinIcon /><span className="sr-only">고정</span></div>) 
                                    : (initialNotices.filter(n => !n.is_pinned).length - initialNotices.filter(n => !n.is_pinned).findIndex(n => n.id === notice.id))}
                                </td>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{notice.title}</th>
                                <td className="px-6 py-4">{notice.author?.full_name || '관리자'}</td>
                                <td className="px-6 py-4">{formatDate(notice.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {initialNotices.length === 0 && (<div className="text-center py-20 text-gray-500"><p>아직 등록된 공지사항이 없습니다.</p></div>)}
            </main>
        </div>
    );
}