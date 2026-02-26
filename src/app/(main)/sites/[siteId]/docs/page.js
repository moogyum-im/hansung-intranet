'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client'; 
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
    ArrowLeft, Search, FileText, Download, Trash2, 
    FilePlus, X, Save, Loader2, Activity, Clock
} from 'lucide-react';

export default function SiteDocumentsPage() {
    const { siteId } = useParams();
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [siteDocs, setSiteDocs] = useState([]);
    const [accessLogs, setAccessLogs] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [documentTitle, setDocumentTitle] = useState('');

    const loadAccessLogs = useCallback(async () => {
        if (!siteId) return;
        const { data: latestLogs } = await supabase
            .from('company_activities')
            .select('*')
            .eq('metadata->>site_id', siteId)
            .order('created_at', { ascending: false })
            .limit(5);
        if (latestLogs) setAccessLogs(latestLogs);
    }, [siteId]);

    const trackActivity = useCallback(async (content) => {
        if (!siteId) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

            await supabase.from('company_activities').insert({
                user_id: user.id,
                user_name: profile?.full_name,
                activity_type: 'SITE_NAVIGATION',
                content: content,
                log_time: new Date().toLocaleString('ko-KR', { hour12: false }),
                metadata: { site_id: siteId, menu: '공무서류' }
            });
            loadAccessLogs();
        } catch (e) { console.error(e); }
    }, [siteId, loadAccessLogs]);

    const loadDocuments = useCallback(async () => {
        if (!siteId) return;
        try {
            const { data, error } = await supabase.from('site_documents').select('*, profiles:uploaded_by(full_name)').eq('site_id', siteId).order('created_at', { ascending: false });
            if (error) throw error;
            setSiteDocs(data || []);
            loadAccessLogs();
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [siteId, loadAccessLogs]);

    useEffect(() => { 
        loadDocuments();
        trackActivity(`[공무서류] 라이브러리 목록을 확인 중입니다.`);
    }, [loadDocuments, trackActivity]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setDocumentTitle(file.name.split('.').slice(0, -1).join('.'));
            setUploadModalOpen(true);
        }
    };

    const handleFinalUpload = async () => {
        if (!selectedFile || !documentTitle.trim()) return;
        setIsUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const safePath = `${siteId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        try {
            await supabase.storage.from('site-documents').upload(safePath, selectedFile);
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('site_documents').insert({
                site_id: siteId,
                file_name: `${documentTitle}.${fileExt}`,
                file_path: safePath,
                file_size: selectedFile.size,
                uploaded_by: user?.id
            });
            trackActivity(`신규 서류 [${documentTitle}]를 등록했습니다.`);
            setUploadModalOpen(false);
            loadDocuments();
        } catch (e) { toast.error("실패"); } finally { setIsUploading(false); }
    };

    const handleDownload = async (doc) => {
        try {
            const { data } = await supabase.storage.from('site-documents').download(doc.file_path);
            const url = window.URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.file_name;
            link.click();
            trackActivity(`서류 [${doc.file_name}]를 다운로드했습니다.`);
        } catch (e) { toast.error("실패"); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-[11px] font-black text-slate-400 bg-white tracking-[0.2em] uppercase">데이터 동기화 중...</div>;

    return (
        <div className="min-h-screen bg-[#F9FAFB] p-8 font-black italic-none font-sans">
             {uploadModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-slate-900 flex items-center gap-2"><FilePlus size={18} className="text-blue-600"/> 서류 제목 작성</h3>
                            <button onClick={() => setUploadModalOpen(false)}><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-[12px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 truncate">{selectedFile?.name}</div>
                            <input type="text" className="w-full px-4 py-3 bg-white border-2 border-blue-50 rounded-xl outline-none focus:border-blue-500" value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} autoFocus />
                        </div>
                        <div className="p-4 bg-slate-50 flex gap-2">
                            <button onClick={() => setUploadModalOpen(false)} className="flex-1 py-3 text-slate-500">취소</button>
                            <button onClick={handleFinalUpload} disabled={isUploading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2">
                                {isUploading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 등록 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <header className="flex justify-between items-end mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full text-slate-400"><ArrowLeft size={24}/></button>
                            <div>
                                <h2 className="text-2xl text-slate-900 tracking-tight font-black">공무 서류 라이브러리</h2>
                                <p className="text-[11px] text-slate-400 uppercase mt-1 font-black">Site Document Storage</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                            <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[12px] font-black flex items-center gap-2 shadow-lg"><FilePlus size={16}/> 서류 추가</button>
                        </div>
                    </header>

                    <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase text-center tracking-widest">
                                <tr><th className="px-6 py-4 text-left border-r border-slate-50">문서 제목</th><th className="px-6 py-4 w-32 border-r border-slate-50">등록자</th><th className="px-6 py-4 w-28">관리</th></tr>
                            </thead>
                            <tbody className="text-[13px] font-black">
                                {siteDocs.map((doc) => (
                                    <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><FileText size={18}/></div>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900">{doc.file_name}</span>
                                                    <span className="text-[9px] text-slate-300">{(doc.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center text-slate-600 font-black">{doc.profiles?.full_name}</td>
                                        <td className="px-6 py-5 flex items-center justify-center gap-4">
                                            <button onClick={() => handleDownload(doc)}><Download size={20} className="text-slate-300 hover:text-blue-600"/></button>
                                            <button onClick={() => { if(confirm("삭제?")) { supabase.from('site_documents').delete().eq('id', doc.id); loadDocuments(); } }}><Trash2 size={20} className="text-slate-300 hover:text-rose-500"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-8 font-black">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[11px] text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={14} className="text-blue-600" /> 실시간 접속 현황
                            </h4>
                            <span className="bg-blue-50 text-blue-600 text-[8px] px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                        </div>
                        <div className="space-y-4">
                            {accessLogs.map((log) => (
                                <div key={log.id} className="flex gap-4">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-500 border border-slate-200 uppercase">{log.user_name?.substring(0, 1)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[12px] font-black text-slate-800">{log.user_name}</span>
                                            <span className="text-[9px] text-slate-400 font-bold"><Clock size={10} className="inline mr-1"/>{log.log_time?.split(' ').slice(3).join(' ')}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold leading-tight mt-0.5">{log.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}