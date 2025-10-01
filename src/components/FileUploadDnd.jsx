'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

export default function FileUploadDnd({ onUploadComplete }) {
    // --- [수정] --- 여러 파일을 저장하기 위해 배열로 상태를 관리합니다.
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback(async (acceptedFiles) => {
        if (!acceptedFiles.length) return;

        setIsUploading(true);
        toast.loading('파일 업로드 중...', { id: 'uploading' });

        const uploadPromises = acceptedFiles.map(file => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            return supabase.storage.from('approval_attachments').upload(fileName, file)
                .then(({ data, error }) => {
                    if (error) throw error;
                    return { path: data.path, name: file.name };
                });
        });

        try {
            const newFiles = await Promise.all(uploadPromises);
            const updatedFiles = [...uploadedFiles, ...newFiles];
            setUploadedFiles(updatedFiles);
            onUploadComplete(updatedFiles); // 부모 컴포넌트로 전체 파일 목록 전달
            toast.success('파일이 성공적으로 첨부되었습니다.', { id: 'uploading' });
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            toast.error(`파일 업로드 실패: ${error.message}`, { id: 'uploading' });
        } finally {
            setIsUploading(false);
        }
    }, [uploadedFiles, onUploadComplete]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true, // 여러 파일 선택 허용
    });

    const removeFile = (e, indexToRemove) => {
        e.stopPropagation();
        const updatedFiles = uploadedFiles.filter((_, index) => index !== indexToRemove);
        setUploadedFiles(updatedFiles);
        onUploadComplete(updatedFiles);
    };

    return (
        <div>
            <label className="block text-gray-700 font-bold mb-2 text-sm">첨부 파일 (선택)</label>
            <div
                {...getRootProps()}
                className={`w-full p-4 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
            >
                <input {...getInputProps()} />
                <p className="text-sm text-gray-500">여기에 파일을 드래그하거나 클릭하여 선택하세요.</p>
            </div>
            {isUploading && <p className="text-sm text-blue-500 mt-2">업로드 중...</p>}
            {/* --- [수정] --- 업로드된 파일 목록을 표시합니다. */}
            {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                    <h4 className="text-sm font-semibold">첨부된 파일 목록:</h4>
                    {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                            <p className="text-sm text-gray-800 truncate" title={file.name}>{file.name}</p>
                            <button
                                type="button"
                                onClick={(e) => removeFile(e, index)}
                                className="text-red-500 hover:text-red-700 text-lg font-bold ml-4 p-1 leading-none"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}