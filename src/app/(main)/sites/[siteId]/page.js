'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client'; 
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
    ArrowLeft, Search, Plus, ChevronRight, 
    FileText, Briefcase, Info, User, Calendar, MapPin, Building2, Activity, Users, Clock, Eye, Leaf, Hammer
} from 'lucide-react';

export default function SiteDetailPage() {
    const { siteId } = useParams();
    const router = useRouter();
    const [site, setSite] = useState(null);
    const [members, setMembers] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('board'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [accessLogs, setAccessLogs] = useState([]);
    
    const hasTrackedInitial = useRef(false);

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

    const trackActivity = useCallback(async (content, menuLabel) => {
        if (!siteId || hasTrackedInitial.current) return;
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
                metadata: { site_id: siteId, menu: menuLabel }
            });
            
            hasTrackedInitial.current = true;
            loadAccessLogs(); 
        } catch (e) { console.error(e); }
    }, [siteId, loadAccessLogs]);

    const loadData = useCallback(async () => {
        if (!siteId) return;
        try {
            const { data: siteData } = await supabase.from('construction_sites').select('*').eq('id', siteId).single();
            setSite(siteData);

            if (siteData && !hasTrackedInitial.current) {
                trackActivity(`['${siteData.name}' 현장]에 접속했습니다.`, '현장 메인');
            }

            const { data: reportData } = await supabase.from('daily_site_reports').select('*, profiles(full_name)').eq('site_id', siteId).order('report_date', { ascending: false });
            setReports(reportData || []);

            const { data: memberData } = await supabase.from('profiles').select('*').eq('id', siteData?.pm_id);
            setMembers(memberData || []);

            loadAccessLogs();
        } catch (e) {
            console.error('데이터 로드 실패:', e);
        } finally {
            setLoading(false);
        }
    }, [siteId, trackActivity, loadAccessLogs]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDeleteSite = async () => {
        if (!confirm("현장 데이터를 영구 삭제하시겠습니까?")) return;
        try {
            const { error } = await supabase.from('construction_sites').delete().eq('id', siteId);
            if (error) throw error;
            toast.success("현장이 삭제되었습니다.");
            router.push('/sites');
        } catch (e) {
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-[11px] font-black text-slate-400 bg-white tracking-[0.2em] font-sans uppercase">데이터 동기화 중...</div>;

    const filteredReports = reports.filter(r => r.report_date.includes(searchTerm));

    return (
        <div className="min-h-screen flex flex-col bg-[#F9FAFB] font-black italic-none font-sans">
            <header className="px-8 py-3 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/sites')} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors"><ArrowLeft size={20}/></button>
                    <div className="flex flex-col border-l border-slate-200 pl-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Project Dashboard</span>
                            {site?.status === '진행' && <span className="bg-blue-50 text-blue-600 text-[8px] px-1.5 py-0.5 rounded font-black border border-blue-100">진행</span>}
                        </div>
                        <h1 className="text-lg font-black text-slate-900">{site?.name}</h1>
                    </div>
                </div>
                
                <nav className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {[
                        { id: 'board', label: '작업일보', icon: <FileText size={14}/> },
                        { id: 'docs', label: '공무서류', icon: <Briefcase size={14}/> },
                        { id: 'info', label: '현장 정보', icon: <Info size={14}/> }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => {
                                if (tab.id === 'docs') {
                                    router.push(`/sites/${siteId}/docs`);
                                } else {
                                    setActiveTab(tab.id);
                                }
                            }} 
                            className={`px-6 py-1.5 text-[11px] rounded transition-all flex items-center gap-2 font-black ${activeTab === tab.id ? 'bg-white text-blue-600 border border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-50'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="flex-1 px-8 py-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        {activeTab === 'board' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-end mb-4 px-1">
                                    <div><h3 className="text-[18px] font-black text-slate-900">현장 작업 기록 목록</h3><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">총 {reports.length}건의 기록</p></div>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            <input type="text" placeholder="날짜 검색..." className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded text-[11px] outline-none w-44 font-black focus:border-blue-600 transition-all" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                                        </div>
                                        <button onClick={() => router.push(`/sites/${siteId}/work`)} className="bg-slate-900 text-white px-5 py-2 rounded text-[11px] font-black hover:bg-black transition-all">작업일보 작성</button>
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                    {filteredReports.map((r, idx) => (
                                        <div key={r.id} onClick={() => router.push(`/sites/${siteId}/work?id=${r.id}`)} className="px-8 py-5 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50">
                                            <span className="text-[13px] font-mono font-black text-slate-400 w-24">{r.report_date}</span>
                                            <span className="text-[15px] font-black text-slate-800">현장 작업 일보</span>
                                            <ChevronRight size={18} className="text-slate-200" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="space-y-6">
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                    <table className="w-full border-collapse">
                                        <tbody className="text-[13px]">
                                            <tr className="border-b border-slate-100">
                                                <th className="bg-slate-50 px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-40 border-r border-slate-100">공사 구분 / 계약</th>
                                                <td className="px-6 py-4 font-black text-slate-800 border-r border-slate-100">
                                                    {site?.site_type && site?.contract_type ? `${site.site_type} / ${site.contract_type}` : site?.site_type || site?.contract_type || '정보 없음'}
                                                </td>
                                                <th className="bg-slate-50 px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-40 border-r border-slate-100">발주처</th>
                                                <td className="px-6 py-4 font-black text-slate-800">{site?.client || '정보 없음'}</td>
                                            </tr>
                                            <tr className="border-b border-slate-100">
                                                <th className="bg-slate-50 px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-40 border-r border-slate-100">현장 소장 (PM)</th>
                                                <td className="px-6 py-4 font-black text-blue-600 border-r border-slate-100 underline underline-offset-4">{members.find(m => m.id === site?.pm_id)?.full_name || '미지정'}</td>
                                                <th className="bg-slate-50 px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-40 border-r border-slate-100">진행 상태</th>
                                                <td className="px-6 py-4 font-black text-slate-800">{site?.status || '-'}</td>
                                            </tr>
                                            <tr>
                                                <th className="bg-slate-50 px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-40 border-r border-slate-100">현장 주소</th>
                                                <td colSpan="3" className="px-6 py-4 font-black text-slate-800">{site?.address || '정보 없음'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* 🚀 공정률 섹션: 활성화 상태에 따른 유동적 UI 처리 */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* 식재 공정률 */}
                                    <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm transition-all ${!site?.is_plant_active ? 'opacity-40 grayscale' : ''}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <Leaf size={14} className={site?.is_plant_active ? "text-blue-600" : "text-slate-400"} />
                                                <span className={`text-[10px] font-black uppercase ${site?.is_plant_active ? "text-blue-600" : "text-slate-400"}`}>식재 공정률</span>
                                            </div>
                                            <span className={`text-[15px] font-black ${site?.is_plant_active ? "text-blue-600" : "text-slate-400"}`}>
                                                {site?.is_plant_active ? `${Number(site?.progress_plant || 0).toFixed(4)}%` : "해당 없음"}
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            {site?.is_plant_active && (
                                                <div className="h-full bg-blue-600" style={{ width: `${Math.min(site?.progress_plant || 0, 100)}%` }} />
                                            )}
                                        </div>
                                    </div>

                                    {/* 시설물 공정률 */}
                                    <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm transition-all ${!site?.is_facility_active ? 'opacity-40 grayscale' : ''}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <Hammer size={14} className={site?.is_facility_active ? "text-emerald-600" : "text-slate-400"} />
                                                <span className={`text-[10px] font-black uppercase ${site?.is_facility_active ? "text-emerald-600" : "text-slate-400"}`}>시설물 공정률</span>
                                            </div>
                                            <span className={`text-[15px] font-black ${site?.is_facility_active ? "text-emerald-600" : "text-slate-400"}`}>
                                                {site?.is_facility_active ? `${Number(site?.progress_facility || 0).toFixed(4)}%` : "해당 없음"}
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            {site?.is_facility_active && (
                                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(site?.progress_facility || 0, 100)}%` }} />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={12}/> 공사 일정 및 총 도급액</h4>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div><span className="text-[9px] text-slate-400 font-black block mb-1">착공일</span><p className="text-[14px] font-black text-slate-800 bg-slate-50 px-4 py-3 rounded border border-slate-100">{site?.start_date || '미정'}</p></div>
                                        <div><span className="text-[9px] text-slate-400 font-black block mb-1">준공일</span><p className="text-[14px] font-black text-slate-800 bg-slate-50 px-4 py-3 rounded border border-slate-100">{site?.end_date || '미정'}</p></div>
                                        <div><span className="text-[9px] text-blue-400 font-black block mb-1">총 도급액</span><p className="text-[14px] font-black text-blue-700 bg-blue-50 px-4 py-3 rounded border border-blue-100">{Number(site?.budget || 0).toLocaleString()} 원</p></div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Info size={12}/> 개요 및 특이사항</h4>
                                    <div className="bg-slate-50 rounded p-5 text-[13px] font-bold text-slate-600 leading-relaxed whitespace-pre-wrap border border-slate-100 min-h-[100px]">
                                        {site?.description || "정보가 없습니다."}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <button onClick={handleDeleteSite} className="px-8 py-2 bg-rose-50 text-rose-600 text-[11px] font-black rounded hover:bg-rose-100 transition-all border border-rose-100">현장 데이터 삭제</button>
                                    <button onClick={() => router.push(`/sites/new?id=${siteId}`)} className="px-8 py-2 bg-slate-800 text-white text-[11px] font-black rounded hover:bg-slate-900 transition-all">현장 정보 수정</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-24">
                            <div className="flex items-center justify-between mb-6 font-black">
                                <h4 className="text-[11px] text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={14} className="text-blue-600" /> 실시간 접속 현황
                                </h4>
                                <span className="bg-blue-50 text-blue-600 text-[8px] px-2 py-0.5 rounded-full animate-pulse font-black">LIVE</span>
                            </div>
                            <div className="space-y-5 font-black">
                                {accessLogs.length > 0 ? accessLogs.map((log) => (
                                    <div key={log.id} className="flex gap-4 group">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-500 border border-slate-200 uppercase">{log.user_name?.substring(0, 1)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <span className="text-[12px] text-slate-800 truncate">{log.user_name}</span>
                                                <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap"><Clock size={10} className="inline mr-1" />{log.log_time?.split(' ').slice(3).join(' ')}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-bold leading-tight line-clamp-2">{log.content}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-10 text-center text-[10px] text-slate-300 font-black uppercase">활동 내역이 없습니다.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}