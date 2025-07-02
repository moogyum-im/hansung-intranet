"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
// 바로 아래에 만들 actions.js 파일에서 함수들을 가져옵니다.
import { saveNoticeAction, deleteNoticeAction } from './actions'; 

export default function NoticeEditor({ notice, isEditing: initialIsEditing, currentUser }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // notice prop 존재 여부로 '조회'와 '쓰기' 모드를,
    // isEditing prop으로 '수정' 모드를 결정합니다.
    const [isEditing, setIsEditing] = useState(initialIsEditing || !notice);
    
    // 폼 데이터 상태
    const [formData, setFormData] = useState({
        title: notice?.title || '',
        content: notice?.content || '',
        is_pinned: notice?.is_pinned || false,
    });
    
    // 현재 로그인 사용자의 관리자 여부 확인
    const isAdmin = currentUser?.role === 'admin';

    // '저장' 버튼 클릭 시 실행될 함수
    const handleSave = () => {
        // 새 글 작성 시 작성자 ID가 없으면 중단 (보안)
        if (!notice && !currentUser?.id) {
            alert('로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.');
            return;
        }
        startTransition(async () => {
            const result = await saveNoticeAction(notice?.id, formData, currentUser.id);
            if (result.error) {
                alert(`저장 실패: ${result.error}`);
            } else {
                alert('성공적으로 저장되었습니다.');
                // 저장 후 해당 게시글의 상세 페이지로 이동합니다.
                router.push(`/notices/${result.data.id}`);
                router.refresh(); 
            }
        });
    };
    
    // '삭제' 버튼 클릭 시 실행될 함수
    const handleDelete = () => {
        if(!notice?.id) return;
        if(confirm('정말로 이 공지사항을 삭제하시겠습니까? 되돌릴 수 없습니다.')) {
            startTransition(async () => {
                const result = await deleteNoticeAction(notice.id);
                if(result.error) { alert(`삭제 실패: ${result.error}`); }
                else {
                    alert('삭제되었습니다.');
                    router.push('/notices'); // 목록 페이지로 이동
                    router.refresh();
                }
            });
        }
    };
    
    // ========================
    //      UI 렌더링 부분
    // ========================

    // 1. 조회 모드 (isEditing이 false일 때)
    if (!isEditing) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                 <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg border">
                     <div className="border-b pb-4 mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 break-words">{notice.title}</h1>
                        <div className="text-sm text-gray-500 mt-3 flex items-center gap-4">
                             <span>작성자: {notice.profiles?.full_name || '관리자'}</span>
                             <span>작성일: {new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                     </div>
                     {/* 내용은 줄바꿈(\n)을 <br> 태그로 변환하여 HTML로 렌더링합니다. */}
                     <div className="prose prose-lg max-w-none min-h-[300px] py-4" dangerouslySetInnerHTML={{ __html: notice.content.replace(/\n/g, '<br />') }} />
                     
                     <div className="flex justify-between items-center mt-8 border-t pt-6">
                         <button onClick={() => router.push('/notices')} className="px-5 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">목록</button>
                         {isAdmin && <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">수정</button>}
                     </div>
                </div>
            </div>
        );
    }
    
    // 2. 글쓰기 또는 수정 모드 (isEditing이 true일 때)
    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg border">
                <h1 className="text-3xl font-bold mb-8">{notice ? '공지사항 수정' : '새 공지사항 작성'}</h1>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="title" className="font-semibold block mb-1">제목</label>
                        <input id="title" type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="content" className="font-semibold block mb-1">내용</label>
                        <textarea id="content" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows="12" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-3 bg-red-50 p-3 rounded-md">
                            <input type="checkbox" id="is_pinned" checked={formData.is_pinned} onChange={e => setFormData({...formData, is_pinned: e.target.checked})} className="h-5 w-5 rounded text-red-600 focus:ring-red-500" />
                            <label htmlFor="is_pinned" className="font-semibold text-red-600">이 공지를 상단에 고정합니다.</label>
                        </div>
                    )}
                </div>
                 <div className="flex justify-between items-center mt-8 border-t pt-6">
                     <button type="button" onClick={() => notice ? setIsEditing(false) : router.push('/notices')} className="px-5 py-2 bg-gray-200 rounded-md hover:bg-gray-300">취소</button>
                     <div className="flex gap-2">
                        {notice && isAdmin && (
                            <button onClick={handleDelete} disabled={isPending} className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400">
                                {isPending ? '삭제 중...' : '삭제'}
                            </button>
                        )}
                        <button onClick={handleSave} disabled={isPending} className="px-5 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 disabled:bg-green-500">
                            {isPending ? '저장 중...' : '저장'}
                        </button>
                     </div>
                </div>
            </div>
        </div>
    );
}