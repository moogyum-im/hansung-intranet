// 파일 경로: src/app/(main)/work/[department]/library/[postId]/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PostDetailPage() {
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { employee } = useEmployee();
    const { department, postId } = useParams();
    const router = useRouter();

    const fetchData = useCallback(async () => {
        setLoading(true);
        // 게시글 상세 정보 가져오기
        const { data: postData, error: postError } = await supabase
            .from('posts')
            .select('*, author:author_id(full_name)')
            .eq('id', postId)
            .single();

        if (postError || !postData) {
            console.error("게시글 로딩 실패:", postError);
            router.push(`/work/${department}/library`);
            return;
        }
        setPost(postData);

        // 댓글 목록 가져오기
        const { data: commentsData, error: commentsError } = await supabase
            .from('comments')
            .select('*, author:author_id(full_name)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        
        if (commentsError) console.error("댓글 로딩 실패:", commentsError);
        else setComments(commentsData || []);
        
        setLoading(false);
    }, [postId, department, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !employee) return;

        setIsSubmitting(true);
        const { error } = await supabase.from('comments').insert({
            content: newComment,
            post_id: postId,
            author_id: employee.id,
        });

        if (error) {
            alert('댓글 작성에 실패했습니다.');
            console.error(error);
        } else {
            setNewComment('');
            fetchData(); // 댓글 목록 새로고침
        }
        setIsSubmitting(false);
    };

    if (loading || !post) {
        return <div className="p-8 text-center">로딩 중...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-6">
                    <Link href={`/work/${department}/library`} className="text-blue-600 hover:underline text-sm mb-2 inline-block">
                        &larr; 목록으로 돌아가기
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>
                    <div className="text-sm text-gray-500 mt-2">
                        <span>작성자: {post.author?.full_name || '알 수 없음'}</span> | <span>작성일: {new Date(post.created_at).toLocaleString()}</span>
                    </div>
                </header>

                <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[300px]">
                    <p>{post.content}</p>
                </div>

                {/* 댓글 섹션 */}
                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4">댓글 ({comments.length})</h2>
                    <div className="space-y-4 mb-6">
                        {comments.map(comment => (
                            <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-800">{comment.content}</p>
                                <div className="text-xs text-gray-400 mt-2">
                                    <span>{comment.author?.full_name || '알 수 없음'}</span> | <span>{new Date(comment.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleCommentSubmit} className="flex gap-2">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            className="flex-1 p-2 border rounded-md"
                            rows="2"
                            required
                        />
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                            등록
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}