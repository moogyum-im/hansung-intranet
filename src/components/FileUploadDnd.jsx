'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { FileText, ImageIcon, X } from 'lucide-react';

export default function FileUploadDnd({ onUploadComplete, onUploadingStateChange, initialFiles = [], onRemoveInitialFile }) {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    // 초기 마운트 시 기존 파일을 캡처 (이후 부모 state 변경에 영향받지 않도록)
    const existingFilesRef = useRef(null);
    const [existingFiles, setExistingFiles] = useState([]);

    useEffect(() => {
        if (existingFilesRef.current === null && initialFiles.length > 0) {
            existingFilesRef.current = initialFiles;
            setExistingFiles(initialFiles);
        }
    }, [initialFiles]);

    const handleRemoveExisting = (path) => {
        setExistingFiles(prev => prev.filter(f => (typeof f === 'object' ? f.path : f) !== path));
        if (onRemoveInitialFile) onRemoveInitialFile(path);
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        if (!acceptedFiles.length) return;

        setIsUploading(true);
        if (onUploadingStateChange) onUploadingStateChange(true);
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
            setUploadedFiles(prev => {
                // 중복 방지: 이미 있는 path는 추가하지 않음
                const existingPaths = new Set(prev.map(f => f.path));
                const dedupedNew = newFiles.filter(f => !existingPaths.has(f.path));
                const updated = [...prev, ...dedupedNew];
                onUploadComplete(dedupedNew); // 새로 추가된 파일만 부모에 전달
                return updated;
            });
            toast.success('파일이 첨부되었습니다.', { id: 'uploading' });
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            toast.error(`파일 업로드 실패: ${error.message}`, { id: 'uploading' });
        } finally {
            setIsUploading(false);
            if (onUploadingStateChange) onUploadingStateChange(false);
        }
    }, [onUploadComplete, onUploadingStateChange]);

    const removeNewFile = (e, indexToRemove) => {
        e.stopPropagation();
        setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

    const getFileIcon = (name) =>
        name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            ? <ImageIcon size={13} className="text-blue-400 flex-shrink-0" />
            : <FileText size={13} className="text-slate-400 flex-shrink-0" />;

    return (
        <div>
            {/* 기존 첨부파일 목록 (editId로 로드된 파일들) */}
            {existingFiles.length > 0 && (
                <div className="mb-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">기존 첨부파일</p>
                    {existingFiles.map((file, idx) => {
                        const name = typeof file === 'object' ? file.name : file;
                        const path = typeof file === 'object' ? file.path : file;
                        return (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2 gap-2">
                                <div className="flex items-center gap-2 truncate">
                                    {getFileIcon(name)}
                                    <span className="text-[11px] font-medium text-slate-700 truncate">{name}</span>
                                </div>
                                {onRemoveInitialFile && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExisting(path)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors flex-shrink-0"
                                        title="삭제"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 새 파일 업로드 영역 */}
            <div
                {...getRootProps()}
                className={`w-full p-4 border-2 border-dashed rounded-md text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
            >
                <input {...getInputProps()} />
                <p className="text-sm text-gray-500">
                    {isDragActive ? '파일을 여기에 놓으세요' : '파일을 드래그하거나 클릭하여 추가하세요'}
                </p>
            </div>
            {isUploading && <p className="text-xs text-blue-500 mt-2">업로드 중...</p>}

            {/* 새로 업로드된 파일 목록 */}
            {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">새로 추가된 파일</p>
                    {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-md px-3 py-2 gap-2">
                            <div className="flex items-center gap-2 truncate">
                                {getFileIcon(file.name)}
                                <p className="text-[11px] font-medium text-slate-800 truncate" title={file.name}>{file.name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => removeNewFile(e, index)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors flex-shrink-0"
                                title="삭제"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
