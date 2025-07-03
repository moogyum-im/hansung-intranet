// 파일 경로: src/components/SiteDocumentsSection.jsx (최종 완성본)
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { v4 as uuidv4 } from 'uuid';

// 아이콘 컴포넌트
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;


export default function SiteDocumentsSection({ siteId }) {

    const { employee: currentUser } = useEmployee();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('site_documents')
            .select('*, uploader:uploaded_by(full_name)')
            .eq('site_id', siteId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("문서 목록 조회 실패:", error);
            setDocuments([]);
        } else {
            // 각 문서의 publicUrl을 생성하여 상태에 추가
            const documentsWithUrls = (data || []).map(doc => {
                const { data: { publicUrl } } = supabase.storage
                    .from('site-documents')
                    .getPublicUrl(doc.file_path);
                return { ...doc, publicUrl };
            });
            setDocuments(documentsWithUrls);
        }
        setLoading(false);
    }, [siteId, supabase]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleFileChange = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0 || !currentUser) return;

        setUploading(true);

        const uploadPromises = files.map(file => {
            const fileExtension = file.name.split('.').pop();
            const newFileName = `${uuidv4()}.${fileExtension}`;
            const filePath = `${siteId}/${newFileName}`;

            return supabase.storage.from('site-documents').upload(filePath, file)
                .then(uploadResult => {
                    if (uploadResult.error) throw uploadResult.error;
                    return supabase.from('site_documents').insert({
                        site_id: siteId,
                        file_name: file.name,
                        file_path: uploadResult.data.path,
                        file_size: file.size,
                        file_type: file.type,
                        uploaded_by: currentUser.id,
                    });
                });
        });

        try {
            await Promise.all(uploadPromises);
            alert(`${files.length}개의 파일이 성공적으로 업로드되었습니다.`);
            fetchDocuments();
        } catch (error) {
            alert('파일 업로드 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const handleDownload = async (filePath, fileName) => {
        try {
            const { data, error } = await supabase.storage
                .from('site-documents')
                .download(filePath);
            if (error) throw error;
            
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('파일 다운로드에 실패했습니다: ' + error.message);
        }
    };
    
    const handleDelete = async (doc) => {
        if (!confirm(`정말로 '${doc.file_name}' 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

        try {
            const { error: storageError } = await supabase.storage
                .from('site-documents')
                .remove([doc.file_path]);
            
            if (storageError) throw storageError;

            const { error: dbError } = await supabase
                .from('site_documents')
                .delete()
                .eq('id', doc.id);

            if (dbError) throw dbError;

            alert('파일이 성공적으로 삭제되었습니다.');
            fetchDocuments();
        } catch (error) {
            alert('파일 삭제에 실패했습니다: ' + error.message);
        }
    };

    if (loading) return <p>문서 목록을 불러오는 중입니다...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">문서함</h3>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                <button 
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-blue-300"
                >
                    {uploading ? '업로드 중...' : '+ 파일 업로드'}
                </button>
            </div>
            <div className="space-y-3">
                {documents.length === 0 ? (
                    <p className="text-gray-500 text-center py-10">업로드된 문서가 없습니다.</p>
                ) : (
                    documents.map(doc => (
                        <div key={doc.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                            <FileIcon />
                            <div className="flex-1 min-w-0">
                                <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-800 hover:underline truncate">{doc.file_name}</a>
                                <p className="text-xs text-gray-500 mt-1">
                                    {(doc.file_size / 1024 / 1024).toFixed(2)} MB - 
                                    {new Date(doc.created_at).toLocaleDateString()} - 
                                    by {doc.uploader?.full_name || '알 수 없음'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <button onClick={() => handleDownload(doc.file_path, doc.file_name)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-100" title="다운로드">
                                    <DownloadIcon />
                                </button>
                                <button onClick={() => handleDelete(doc)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100" title="삭제">
                                    <DeleteIcon />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}