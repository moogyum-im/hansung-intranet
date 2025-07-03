// 파일 경로: src/components/DailyReportSection.jsx (최종 수정본)
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { v4 as uuidv4 } from 'uuid';

// 아이콘 컴포넌트
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg>;

// 일일 보고 작성/수정 모달
function ReportModal({ isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({
        report_date: new Date().toISOString().split('T')[0],
        content: '', manpower_count: 0, equipment_used: '', notes: ''
    });
    const [files, setFiles] = useState([]); 
    const [previews, setPreviews] = useState([]); 

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                report_date: new Date().toISOString().split('T')[0],
                content: '', manpower_count: 0, equipment_used: '', notes: ''
            });
            setFiles([]);
            setPreviews([]);
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value ? parseInt(value) : 0) : value }));
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]); 
        const newPreviews = selectedFiles.map(file => ({
            id: file.name + Date.now(),
            url: URL.createObjectURL(file)
        }));
        setPreviews(prev => [...prev, ...newPreviews]);
    };
    
    const removePreview = (previewId, fileIndex) => {
        setPreviews(prev => prev.filter(p => p.id !== previewId));
        setFiles(prev => prev.filter((_, index) => index !== fileIndex));
    };

    const handleSubmit = async () => {
        if (!formData.content.trim()) { alert('작업 내용은 필수입니다.'); return; }
        await onSave(formData, files);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">새 일일 보고 작성</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="form-label">보고 날짜</label>
                        <input type="date" name="report_date" value={formData.report_date} onChange={handleChange} className="form-input" />
                    </div>
                     <div>
                        <label className="form-label">주요 작업 내용</label>
                        <textarea name="content" value={formData.content} onChange={handleChange} rows={5} className="form-textarea" placeholder="금일 진행된 주요 작업 내용을 상세히 기재합니다." />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">투입 인력 (명)</label>
                            <input type="number" name="manpower_count" value={formData.manpower_count} onChange={handleChange} className="form-input" />
                        </div>
                        <div>
                            <label className="form-label">사용 장비</label>
                            <input type="text" name="equipment_used" value={formData.equipment_used} onChange={handleChange} className="form-input" placeholder="예: 굴착기 2대, 덤프트럭 5대" />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">특이사항 및 전달사항</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="form-textarea" placeholder="안전 문제, 자재 부족, 설계 변경 요청 등" />
                    </div>
                    <div>
                        <label className="form-label">현장 사진 첨부 (갯수 제한 없음)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                <div className="flex text-sm text-gray-600">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none">
                                        <span>파일 선택</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept="image/*" />
                                    </label>
                                    <p className="pl-1">또는 드래그 앤 드롭</p>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        </div>
                        {previews.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {previews.map((preview, index) => (
                                    <div key={preview.id} className="relative group">
                                        <img src={preview.url} alt="preview" className="h-24 w-full object-cover rounded-md" />
                                        <button 
                                            onClick={() => removePreview(preview.id, index)}
                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 flex justify-end gap-4 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">취소</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg">저장</button>
                </div>
            </div>
        </div>
    );
}

// 메인 일일 보고 섹션 컴포넌트
export default function DailyReportSection({ siteId }) {

    const { employee: currentUser } = useEmployee();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedReportId, setExpandedReportId] = useState(null);

    const handleToggleExpand = (reportId) => {
        setExpandedReportId(prevId => (prevId === reportId ? null : reportId));
    };
    
    const fetchReports = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('daily_site_reports')
            .select('*, author:author_id(full_name)')
            .eq('site_id', siteId)
            .order('report_date', { ascending: false });

        if (error) {
            console.error("일일 보고 목록 조회 실패:", error);
            setReports([]);
        } else {
             // ★★★ 각 문서의 publicUrl을 동적으로 생성하여 상태에 추가 ★★★
            const reportsWithUrls = (data || []).map(report => {
                const photosWithUrls = (report.photos || []).map(photo => {
                    const { data: { publicUrl } } = supabase.storage
                        .from('site-documents') // 버킷 이름 확인
                        .getPublicUrl(photo.path);
                    return { ...photo, url: publicUrl };
                });
                return { ...report, photos: photosWithUrls };
            });
            setReports(reportsWithUrls);
        }
        setLoading(false);
    }, [siteId, supabase]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleSaveReport = async (formData, files) => {
        if (!currentUser) return alert('로그인 정보가 필요합니다.');

        let photoData = [];
        if (files && files.length > 0) {
            const uploadPromises = files.map(file => {
                const fileExtension = file.name.split('.').pop();
                const newFileName = `${uuidv4()}.${fileExtension}`;
                const filePath = `${siteId}/${newFileName}`;
                return supabase.storage.from('site-documents').upload(filePath, file);
            });

            const uploadResults = await Promise.all(uploadPromises);

            for (let i = 0; i < uploadResults.length; i++) {
                const result = uploadResults[i];
                if (result.error) {
                    alert('파일 업로드 중 오류가 발생했습니다: ' + result.error.message);
                    return; 
                }
                // ★★★ 여기서는 publicUrl을 저장하지 않습니다. path와 원본 name만 저장합니다. ★★★
                photoData.push({ path: result.data.path, name: files[i].name });
            }
        }
        
        const dataToSave = { 
            ...formData, 
            photos: photoData.length > 0 ? photoData : null,
            site_id: siteId, 
            author_id: currentUser.id 
        };

        const { error } = await supabase.from('daily_site_reports').insert(dataToSave);

        if (error) {
            alert("보고서 저장에 실패했습니다: " + error.message);
        } else {
            alert("보고서가 성공적으로 저장되었습니다.");
            setIsModalOpen(false);
            fetchReports();
        }
    };

    if (loading) return <p>일일 보고 목록을 불러오는 중입니다...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">작업 보고 목록</h3>
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    + 새 보고서 작성
                </button>
            </div>
            <div className="space-y-2">
                {reports.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>작성된 일일 보고가 없습니다.</p>
                        <p className="text-sm mt-1">오른쪽 상단의 &apos;새 보고서 작성&apos; 버튼을 눌러 첫 보고서를 작성해보세요.</p>
                    </div>
                ) : (
                    reports.map(report => (
                        <div key={report.id} className="border border-gray-200 rounded-lg overflow-hidden">
                            <button 
                                onClick={() => handleToggleExpand(report.id)}
                                className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                            >
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">{report.report_date}</p>
                                    <p className="text-sm text-gray-600 mt-1">작성자: {report.author?.full_name || '알 수 없음'}</p>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${expandedReportId === report.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>

                            {expandedReportId === report.id && (
                                <div className="p-6 border-t border-gray-200 bg-white space-y-6">
                                     <div>
                                        <h4 className="font-semibold text-gray-700">주요 작업 내용</h4>
                                        <p className="mt-1 text-gray-800 whitespace-pre-wrap">{report.content || '-'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-700">투입 인력</h4>
                                            <p className="mt-1 text-gray-800">{report.manpower_count || 0} 명</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-700">사용 장비</h4>
                                            <p className="mt-1 text-gray-800">{report.equipment_used || '-'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700">특이사항 및 전달사항</h4>
                                        <p className="mt-1 text-gray-800 whitespace-pre-wrap">{report.notes || '-'}</p>
                                    </div>
                                    {report.photos && report.photos.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-gray-700">현장 사진</h4>
                                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {report.photos.map((photo, index) => (
                                                    <a key={index} href={photo.url} target="_blank" rel="noopener noreferrer" className="block group aspect-w-1 aspect-h-1">
                                                        <img src={photo.url} alt={photo.name} className="h-full w-full object-cover rounded-md transition-transform group-hover:scale-105" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            
            <ReportModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveReport}
            />
        </div>
    );
}