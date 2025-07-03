// 파일 경로: src/app/(main)/work/[department]/library/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../../lib/supabase/client'; 
import { useEmployee } from '../../../../../contexts/EmployeeContext';
import { useRouter } from 'next/navigation';

// 업로드 모달 컴포넌트
function UploadModal({ isOpen, onClose, onUploadSuccess, department }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { employee } = useEmployee();
   

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !file) {
            alert("제목과 파일을 모두 선택해주세요.");
            return;
        }
        if (!employee) {
            alert("사용자 정보가 없습니다. 다시 로그인해주세요.");
            return;
        }
        setIsSubmitting(true);
        
        const fileExtension = file.name.split('.').pop() || '';
        const baseName = file.name.slice(0, file.name.length - (fileExtension.length ? fileExtension.length + 1 : 0));
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const safeFileName = `${crypto.randomUUID()}_${sanitizedBaseName}.${fileExtension}`;
        
        const filePath = `${employee.id}/${safeFileName}`;

        // 1. Supabase Storage에 파일 업로드
        const { error: uploadError } = await supabase.storage.from('library-files').upload(filePath, file);
        if (uploadError) {
            alert("파일 업로드 실패: " + uploadError.message);
            setIsSubmitting(false);
            return;
        }
        
        // 2. 공개 버킷의 고정 URL을 직접 만듭니다.
        // 이 코드가 작동하려면 .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL이 설정되어 있어야 합니다.
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/library-files/${filePath}`;

        // 3. DB에 게시물 정보 저장
        const { data: newPost, error: insertError } = await supabase.from('library_posts').insert({
            title, 
            content, 
            user_id: employee.id, 
            department: department,
            file_url: publicUrl, // 생성된 고정 URL을 저장
            file_path: filePath,
            file_metadata: { name: file.name, size: file.size, type: file.type }
        }).select(`*, author:profiles(full_name)`).single();

        if (insertError) {
            alert("게시물 생성 실패: " + insertError.message);
        } else {
            alert("자료가 성공적으로 업로드되었습니다.");
            onUploadSuccess(newPost);
        }
        setIsSubmitting(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{department} 자료 업로드</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                        <input id="title" type="text" placeholder="자료의 제목을 입력하세요" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">설명 (선택사항)</label>
                        <textarea id="content" placeholder="파일에 대한 간단한 설명을 추가하세요" value={content} onChange={e => setContent(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" rows="3"></textarea>
                    </div>
                    <div>
                        <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">파일 선택</label>
                        <input id="file" type="file" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
                    </div>
                </div>
                <div className="px-6 py-4 flex justify-end gap-4 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">취소</button>
                    <button onClick={handleSubmit} disabled={isSubmitting || !file} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300">
                        {isSubmitting ? "업로드 중..." : "업로드"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// 부서별 자료실 메인 페이지
export default function DepartmentLibraryPage({ params }) {
    const department = decodeURIComponent(params.department);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
   
    const { employee } = useEmployee();

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('library_posts')
                .select(`*, author:profiles(full_name)`)
                .eq('department', department)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(`${department} 자료실 데이터 로딩 실패:`, error);
            } else {
                setPosts(data);
            }
            setLoading(false);
        };
        fetchPosts();
    }, [department, supabase]);

    const handleUploadSuccess = (newPost) => {
        setPosts(currentPosts => [newPost, ...currentPosts]);
    };

    const canUpload = employee?.department === department || employee?.role === 'admin';

    if (loading) {
        return <div className="p-8 text-center text-gray-500">자료를 불러오는 중입니다...</div>
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{department} 자료실</h1>
                {canUpload && (
                    <button onClick={() => setIsModalOpen(true)} className="py-2 px-4 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 shadow-sm">
                        + 새 자료 올리기
                    </button>
                )}
            </div>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목/설명</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">업로드</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">파일 정보</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {posts.length > 0 ? posts.map(post => (
                            <tr key={post.id}>
                                <td className="px-6 py-4 max-w-sm">
                                    <div className="text-sm font-semibold text-gray-900 truncate">{post.title}</div>
                                    <div className="text-sm text-gray-500 truncate">{post.content || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{post.author?.full_name}</div>
                                    <div className="text-sm text-gray-500">{new Date(post.created_at).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="truncate max-w-xs">{post.file_metadata?.name}</div>
                                    <div>{post.file_metadata?.size ? `${(post.file_metadata.size / 1024).toFixed(1)} KB` : ''}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <a href={post.file_url} target="_blank" rel="noopener noreferrer" download={post.file_metadata?.name} className="text-green-600 hover:text-green-900">
                                        다운로드
                                    </a>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="text-center p-8 text-gray-500">이 자료실에는 아직 자료가 없습니다.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUploadSuccess={handleUploadSuccess} department={department} />
        </div>
    );
}