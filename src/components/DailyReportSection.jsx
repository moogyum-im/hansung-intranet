'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { v4 as uuidv4 } from 'uuid';
import { Save, ArrowLeft, Camera, Loader2, RefreshCw, ImageIcon, ZoomIn, ZoomOut, Calendar, CheckSquare, Square } from 'lucide-react';
import { toast } from 'react-hot-toast';

const formatNumber = (num) => {
    if (num === null || num === undefined || num === "" || isNaN(num)) return "0";
    return Math.round(Number(num.toString().replace(/,/g, ''))).toLocaleString();
};

const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    const cleaned = str?.toString().replace(/,/g, '') || '0';
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
};

export default function DailyReportSection({ siteId, onViewChange }) {
    const { employee: currentUser } = useEmployee();
    const [view, setView] = useState('list');
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState(null);
    const [reports, setReports] = useState([]);
    const [siteData, setSiteData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(0.85); 
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importDate, setImportDate] = useState("");
    const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);

    // 🚀 [복구] 섹션 노출 제어 상태
    const [visibleSections, setVisibleSections] = useState({
        labor_costs: true, material_costs: true, equipment_costs: true, 
        tree_costs: true, transport_costs: true, subcontract_costs: true, etc_costs: true
    });

    const [todayPhotos, setTodayPhotos] = useState([]);
    const [tomorrowPhotos, setTomorrowPhotos] = useState([]);
    const maxPhotoRows = useMemo(() => Math.max(todayPhotos.length, tomorrowPhotos.length, 1), [todayPhotos, tomorrowPhotos]);

    const FIELD_MAPS = {
        labor_costs: { fields: ['name', 'price', 'count', 'type', 'accum', 'total'], labels: ['성명', '단가', '공수', '직종', '출력누계', '금액'], title: '현장출력현황', sums: ['count', 'accum', 'total'] },
        material_costs: { fields: ['item', 'spec', 'price', 'prev_count', 'count', 'accum', 'vendor', 'total'], labels: ['품명', '규격', '단가', '전일누계', '금일수량', '전체누계', '거래처', '금액'], title: '주요자재반입현황', sums: ['prev_count', 'count', 'accum', 'total'] },
        equipment_costs: { fields: ['item', 'type', 'price', 'prev_count', 'count', 'accum', 'total'], labels: ['품명', '투입공종', '단가', '전일누계', '금일', '출력누계', '금액'], title: '장비사용현황', sums: ['prev_count', 'count', 'accum', 'total'] },
        tree_costs: { fields: ['item', 'spec', 'price', 'prev_count', 'count', 'accum', 'vendor', 'total'], labels: ['품명', '규격', '단가', '전일누계', '금일수량', '전체누계', '거래처', '금액'], title: '수목반입현황', sums: ['prev_count', 'count', 'accum', 'total'] },
        transport_costs: { fields: ['item', 'spec', 'count', 'price', 'vendor', 'total'], labels: ['품명', '규격', '수량', '단가', '거래처', '금액'], title: '운반비투입현황', sums: ['count', 'total'] },
        subcontract_costs: { fields: ['item', 'spec', 'price', 'count', 'vendor', 'total'], labels: ['품명', '규격', '단가', '수량', '거래처', '금액'], title: '자재납품 및 시공(외주)', sums: ['count', 'total'] },
        etc_costs: { fields: ['category', 'content', 'usage', 'total'], labels: ['계정', '내용', '사용처', '금액'], title: '기타경비', sums: ['total'] }
    };

    const fetchAllData = useCallback(async () => {
        const { data: site } = await supabase.from('construction_sites').select('*').eq('id', siteId).single();
        if (site) setSiteData(site);
        const { data: res } = await supabase.from('daily_site_reports').select(`*, profiles(full_name)`).eq('site_id', siteId).order('report_date', { ascending: false });
        if (res) setReports(res);
    }, [siteId]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const handlePhotoUpload = async (e, type, idx) => {
        const file = e.target.files[0];
        if (!file) return;
        const preview = URL.createObjectURL(file);
        const newPhoto = { id: uuidv4(), file, preview, timeType: type, description: '' };
        if (type === 'today') { const next = [...todayPhotos]; next[idx] = newPhoto; setTodayPhotos(next); }
        else { const next = [...tomorrowPhotos]; next[idx] = newPhoto; setTomorrowPhotos(next); }
    };

    const handleSave = async () => {
        if (!formData.report_date) return toast.error("날짜를 선택해주세요.");
        setIsSaving(true);
        try {
            const uploadedPhotos = await Promise.all([...todayPhotos, ...tomorrowPhotos].map(async (p) => {
                if (!p || p.url) return p;
                if (!p.file) return null;
                const path = `${siteId}/${uuidv4()}.jpg`;
                const { error } = await supabase.storage.from('daily_reports').upload(path, p.file);
                if (error) throw error;
                const { data } = supabase.storage.from('daily_reports').getPublicUrl(path);
                return { id: p.id, url: data.publicUrl, timeType: p.timeType, description: p.description };
            }));
            const payload = {
                site_id: siteId, report_date: formData.report_date, author_id: currentUser.id,
                photos: uploadedPhotos.filter(v => v !== null), notes: JSON.stringify(formData), content: formData.today_work || '작업일보'
            };
            const { error } = await supabase.from('daily_site_reports').upsert(selectedId ? { id: selectedId, ...payload } : payload);
            if (error) throw error;
            toast.success('저장되었습니다.'); setView('list'); fetchAllData();
        } catch (e) { console.error(e); toast.error("저장 실패"); } finally { setIsSaving(false); }
    };

    const executeImport = async () => {
        if (!importDate) return toast.error("날짜를 선택하세요.");
        const { data } = await supabase.from('daily_site_reports').select('*').eq('site_id', siteId).eq('report_date', importDate).single();
        if (!data) return toast.error('데이터가 없습니다.');
        const prevNotes = JSON.parse(data.notes);
        setFormData(curr => {
            const safeCurr = curr || { settlement_costs: [] };
            const next = { 
                ...safeCurr, 
                ...prevNotes, 
                report_date: new Date().toISOString().split('T')[0], 
                today_work: '',
                progress_plant_prev: (parseNumber(prevNotes.progress_plant_prev) + parseNumber(prevNotes.progress_plant)).toFixed(3),
                progress_plant: '0.000',
                progress_facility_prev: (parseNumber(prevNotes.progress_facility_prev) + parseNumber(prevNotes.progress_facility)).toFixed(3),
                progress_facility: '0.000'
            };
            Object.keys(FIELD_MAPS).forEach(key => {
                if (prevNotes[key]) {
                    next[key] = prevNotes[key].map(r => ({
                        ...r,
                        prev_count: (parseNumber(r.prev_count || 0) + parseNumber(r.count || r.today_count || 0)).toString(),
                        count: '', total: '0',
                        accum: (parseNumber(r.prev_count || 0) + parseNumber(r.count || r.today_count || 0)).toString()
                    }));
                }
            });
            if (prevNotes.settlement_costs) {
                next.settlement_costs = prevNotes.settlement_costs.map(s => ({ ...s, prev: parseNumber(s.total), today: 0, total: parseNumber(s.total) }));
            }
            return next;
        });
        setTomorrowPhotos(data.photos?.filter(p => p.timeType === 'today').map(p => ({ ...p, id: uuidv4(), timeType: 'tomorrow', preview: p.url })) || []);
        setIsImportModalOpen(false);
    };

    useEffect(() => {
        if (!formData || view !== 'write') return;
        const getSum = (key) => (formData[key] || []).reduce((acc, cur) => acc + parseNumber(cur.total), 0);
        const sums = { '노무비': getSum('labor_costs'), '수목': getSum('tree_costs'), '자재비': getSum('material_costs'), '장비대': getSum('equipment_costs'), '운반비': getSum('transport_costs'), '자재납품 및 시공(외주)': getSum('subcontract_costs'), '기타경비': getSum('etc_costs') };
        setFormData(prev => ({ 
            ...prev, settlement_costs: (prev.settlement_costs || []).map(s => ({ 
                ...s, today: sums[s.item] || 0, total: parseNumber(s.prev) + (sums[s.item] || 0) 
            })) 
        }));
    }, [formData?.labor_costs, formData?.tree_costs, formData?.material_costs, formData?.equipment_costs, formData?.transport_costs, formData?.subcontract_costs, formData?.etc_costs, view]);

    const renderTable = (key) => {
        if (!visibleSections[key]) return null;
        const config = FIELD_MAPS[key];
        const rows = formData?.[key] || [];
        const getColumnSum = (f) => rows.reduce((acc, cur) => acc + parseNumber(cur[f]), 0);

        return (
            <div key={key} className="border border-slate-400 flex flex-col font-black mb-1 w-full bg-white shadow-sm font-sans italic-none">
                <div className="bg-yellow-100 border-b border-slate-400 p-1 flex justify-between items-center">
                    <span className="text-[10px]">▣ {config.title}</span>
                    <button onClick={()=>setFormData(p=>({...p, [key]: [...(p[key]||[]), config.fields.reduce((a,f)=>({...a,[f]:''}),{})]}))} className="bg-white border border-slate-400 px-1.5 py-0.5 text-[8px] hover:bg-slate-50 font-black">+ 추가</button>
                </div>
                <table className="w-full text-[9px] border-collapse font-black italic-none">
                    <thead className="bg-slate-50 border-b border-slate-400">
                        <tr>{config.labels.map(l=><th key={l} className="border-r border-slate-300 p-1">{l}</th>)}<th className="w-4"></th></tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                                {config.fields.map((f) => (
                                    <td key={f} className="border-r border-slate-200 p-0">
                                        <input className="w-full p-1 text-right outline-none bg-transparent font-black font-sans italic-none"
                                            value={['total','price','accum','count','prev_count'].includes(f) ? formatNumber(row[f]) : row[f]} 
                                            onFocus={(e) => { if (parseNumber(e.target.value) === 0) e.target.value = ""; }}
                                            onChange={e => {
                                                const updated = [...rows]; updated[i][f] = e.target.value.replace(/,/g, '');
                                                const target = updated[i];
                                                if (['count', 'price', 'today_count', 'prev_count'].some(field => config.fields.includes(field))) {
                                                    target.accum = (parseNumber(target.prev_count || 0) + parseNumber(target.count || 0)).toString();
                                                    target.total = (parseNumber(target.price) * parseNumber(target.count)).toString(); 
                                                }
                                                setFormData({...formData, [key]: updated});
                                            }} /></td>
                                ))}
                                <td className="text-center text-red-500 cursor-pointer" onClick={()=>setFormData(p=>({...p, [key]: rows.filter((_, idx)=>idx!==i)}))}>×</td>
                            </tr>
                        ))}
                        <tr className="bg-slate-100 border-t border-slate-400 font-black italic-none font-sans">
                            <td className="text-center p-1 border-r border-slate-300">합계</td>
                            {config.fields.slice(1).map((f, idx) => (
                                <td key={idx} className="text-right px-1 border-r border-slate-300 text-blue-800 font-sans font-black italic-none">
                                    {config.sums.includes(f) ? formatNumber(getColumnSum(f)) : ''}
                                </td>
                            ))}
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    if (view === 'list') {
        const report = reports.find(r => r.report_date === dashboardDate);
        const displayReport = report ? { ...report, notes: JSON.parse(report.notes) } : null;
        return (
            <div className="h-screen flex flex-col gap-2 font-black font-sans overflow-hidden bg-white p-4 italic-none">
                <div className="flex justify-between items-center bg-white p-3 border-2 border-slate-900 shrink-0 shadow-sm font-black italic-none">
                    <div className="flex items-center gap-6 font-black font-sans italic-none">
                        <h2 className="text-lg tracking-tighter font-black font-sans italic-none">금일 보고 대시보드</h2>
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-black">
                            <Calendar size={14} className="text-slate-500 font-black" />
                            <input type="date" value={dashboardDate} onChange={(e) => setDashboardDate(e.target.value)} className="bg-transparent text-sm font-black outline-none cursor-pointer font-black font-sans italic-none" />
                        </div>
                    </div>
                    <button onClick={() => setView('write')} className="px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-lg shadow-md font-black font-sans italic-none">+ 새 일보 작성</button>
                </div>
                <div className="flex-1 grid grid-cols-4 gap-3 overflow-y-auto pr-1 custom-scrollbar pb-10">
                    {displayReport ? Object.entries(FIELD_MAPS).map(([key, config]) => (
                        <div key={key} className="bg-white border border-slate-200 flex flex-col h-[320px] rounded-xl overflow-hidden shadow-sm font-black italic-none">
                            <div className="px-3 py-2 bg-slate-50 border-b font-black text-[10px]">▣ {config.title}</div>
                            <div className="flex-1 overflow-y-auto p-1 font-black">
                                <table className="w-full text-[9px] border-collapse font-black font-sans italic-none">
                                    <tbody className="divide-y divide-slate-50 font-black font-sans italic-none">
                                        {displayReport.notes[key]?.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50 font-black font-sans italic-none">
                                                <td className="p-1.5 text-slate-700 font-black font-sans italic-none">{row.name || row.item}</td>
                                                <td className="p-1.5 text-right text-blue-600 font-black font-sans italic-none">{formatNumber(row.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )) : <div className="col-span-4 h-full flex flex-col items-center justify-center text-slate-300 font-black py-40">해당 날짜의 보고 내역이 없습니다.</div>}
                </div>
            </div>
        );
    }

    const totalPrevSum = formData?.settlement_costs?.reduce((a,c)=>a+parseNumber(c.prev), 0) || 0;
    const totalTodaySum = formData?.settlement_costs?.reduce((a,c)=>a+parseNumber(c.today), 0) || 0;
    const totalAccumSum = formData?.settlement_costs?.reduce((a,c)=>a+parseNumber(c.total), 0) || 0;
    const contractAmt = parseNumber(formData?.total_contract_amount || siteData?.budget);
    const spendRate = contractAmt > 0 ? ((totalAccumSum / contractAmt) * 100).toFixed(2) : "0.00";

    return (
        <div className="h-screen bg-slate-200 font-black font-sans flex flex-col overflow-hidden italic-none">
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl font-black">
                        <h3 className="text-2xl font-black mb-6 italic-none font-sans font-black">전일 데이터 불러오기</h3>
                        <input type="date" value={importDate} onChange={e=>setImportDate(e.target.value)} className="w-full p-4 bg-slate-100 border-none rounded-xl mb-6 font-black outline-none font-sans" />
                        <div className="flex gap-3 font-black"><button onClick={()=>setIsImportModalOpen(false)} className="flex-1 py-4 bg-slate-200 text-slate-600 rounded-xl font-black">취소</button><button onClick={executeImport} className="flex-1 py-4 bg-black text-white rounded-xl shadow-lg font-black font-black">불러오기</button></div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center p-2 border-b-2 border-slate-900 bg-white shrink-0 z-50 font-black font-sans italic-none">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="text-slate-500 text-xs flex items-center gap-1 font-black italic-none">← 대시보드</button>
                    {/* 🚀 [복구] 상단 테이블 노출 필터 */}
                    <div className="flex gap-1 border-l pl-4 border-slate-200 font-black">
                        {Object.entries(FIELD_MAPS).map(([key, config]) => (
                            <button key={key} onClick={() => setVisibleSections(p => ({...p, [key]: !visibleSections[key]}))}
                                className={`px-2 py-1 text-[9px] rounded-md flex items-center gap-1 transition-all ${visibleSections[key] ? 'bg-slate-900 text-white font-black' : 'bg-slate-100 text-slate-400 font-black'}`}>
                                {visibleSections[key] ? <CheckSquare size={10}/> : <Square size={10}/>} {config.title.split('(')[0]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-100 px-3 py-1 border border-slate-400 rounded-lg">
                    <ZoomOut size={12} className="cursor-pointer font-black" onClick={() => setZoomLevel(Math.max(0.4, zoomLevel - 0.05))}/>
                    <input type="range" min="0.4" max="1.5" step="0.05" value={zoomLevel} onChange={(e)=>setZoomLevel(parseFloat(e.target.value))} className="w-24 accent-slate-900" />
                    <ZoomIn size={12} className="cursor-pointer font-black" onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.05))}/>
                    <span className="text-[10px] w-8 text-center font-black">{Math.round(zoomLevel * 100)}%</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-amber-500 text-white px-5 py-2 text-[11px] rounded-lg shadow-md font-black flex items-center gap-1"><RefreshCw size={14}/> 불러오기</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-blue-700 text-white px-8 py-2 text-[11px] rounded-lg shadow-md font-black flex items-center gap-1">
                        {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} 저장
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-200 p-2 custom-scrollbar font-black font-sans italic-none">
                <div style={{ transformOrigin: 'top left', transform: `scale(${zoomLevel})`, width: `${100 / zoomLevel}%` }} className="pb-20">
                    <div className="w-full bg-white p-6 border-[2px] border-slate-900 shadow-2xl space-y-4">
                        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 font-black">
                            <div className="space-y-3 font-black">
                                <h1 className="text-2xl tracking-[0.4em] font-black font-sans italic-none">작 업 일 보</h1>
                                <div className="flex gap-3 font-black">
                                    <div className="flex border border-slate-400 text-[10px]"><span className="bg-slate-50 p-1.5 border-r border-slate-400 font-black w-24">총 도급액</span><div className="p-1.5 px-4 text-right bg-white font-sans font-black">{formatNumber(contractAmt)}</div></div>
                                    <div className="flex border border-slate-400 text-[10px]"><span className="bg-slate-50 p-1.5 border-r border-slate-400 font-black w-24 text-blue-700">금일 사용액</span><div className="p-1.5 px-4 text-right bg-white text-blue-700 font-sans font-black">{formatNumber(totalTodaySum)}</div></div>
                                    <div className="flex border border-slate-400 text-[10px] bg-red-50/30"><span className="bg-red-50 p-1.5 border-r border-slate-400 font-black w-24 text-red-600">누적 집행률</span><div className="p-1.5 px-4 text-right font-black text-red-600 font-sans">{formatNumber(totalAccumSum)} ({spendRate}%)</div></div>
                                    {['plant', 'facility'].map(k => (
                                        <div key={k} className="flex border border-slate-400 text-[10px] bg-blue-50/30">
                                            <div className="bg-blue-100 p-1.5 px-3 border-r border-slate-400 font-black uppercase font-sans">{k==='plant'?'식재공정':'시설공정'}</div>
                                            <div className="flex divide-x divide-slate-400 bg-white font-sans">
                                                <div className="flex flex-col items-center px-2 py-0.5 font-black"><span className="text-[7px] text-slate-400">전일누계</span><input className="w-16 text-center text-[11px] outline-none font-black" value={formData?.[`progress_${k}_prev`]} readOnly /></div>
                                                <div className="flex flex-col items-center px-2 py-0.5 bg-blue-50/50"><span className="text-[7px] text-blue-400">금일진행</span><input className="w-16 text-center text-[11px] text-blue-700 outline-none font-black" value={formData?.[`progress_${k}`]} onChange={e=>setFormData({...formData, [`progress_${k}`]: e.target.value})} /></div>
                                                <div className="flex flex-col items-center px-3 py-0.5 bg-slate-900 text-white"><span className="text-[7px] text-slate-400 font-black">전체누계</span><span className="text-[11px] font-black font-sans">{(parseNumber(formData?.[`progress_${k}_prev`]) + parseNumber(formData?.[`progress_${k}`])).toFixed(3)}%</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-2 h-auto min-h-[188px] font-black font-black font-sans italic-none">
                            <div className="col-span-8 grid grid-cols-2 border border-slate-400 h-full">
                                <div className="border-r border-slate-400 flex flex-col font-black"><div className="bg-green-50 p-1.5 text-center border-b border-slate-400 text-[10px] font-black italic-none">전일 작업 요약</div><textarea className="w-full flex-1 p-2 text-xs outline-none font-black resize-none bg-slate-50/50 font-sans italic-none" value={formData?.prev_work} readOnly /></div>
                                <div className="flex flex-col font-black font-black"><div className="bg-blue-50 p-1.5 text-center border-b border-slate-400 text-[10px] font-black italic-none">금일 작업 요약</div><textarea className="w-full flex-1 p-2 text-xs outline-none font-black resize-none font-sans italic-none" value={formData?.today_work} onChange={e=>setFormData({...formData, today_work: e.target.value})} /></div>
                            </div>
                            <div className="col-span-4 border border-slate-400 h-full shadow-md overflow-hidden font-sans font-black italic-none font-black">
                                <div className="bg-slate-900 text-white p-1 text-center text-[10px] font-black italic-none">실시간 정산 내역 합계</div>
                                <table className="w-full text-[9px] border-collapse font-sans font-black italic-none font-black font-black">
                                    <thead className="bg-slate-100 border-b border-slate-400 font-black"><tr><th className="p-0.5 border-r border-slate-400 font-black">항목</th><th className="border-r border-slate-400 font-black">전일누계</th><th className="border-r border-slate-400 font-black font-black">금일</th><th className="font-black">전체누계</th></tr></thead>
                                    <tbody>
                                        {(formData?.settlement_costs || []).map((row, idx) => (
                                            <tr key={idx} className="border-b border-slate-300 h-[21px] font-black italic-none font-sans font-black">
                                                <td className="bg-slate-50 border-r border-slate-300 text-center font-black p-0.5 font-black font-black font-black font-black font-black">{row.item}</td>
                                                <td className="text-right px-2 text-slate-500 border-r border-slate-300 font-black font-sans font-black font-black font-black font-black font-black font-black">{formatNumber(row.prev)}</td>
                                                <td className="text-right px-2 text-blue-700 border-r border-slate-300 font-black font-sans font-black font-black font-black font-black font-black font-black font-black">{formatNumber(row.today)}</td>
                                                <td className="text-right px-2 text-red-600 font-bold font-black font-sans font-black font-black font-black font-black font-black font-black font-black font-black">{formatNumber(row.total)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 border-t border-slate-400 font-black italic-none font-sans font-black">
                                            <td className="text-center font-black p-1 border-r border-slate-300 font-black font-black font-black font-black font-black font-black font-black">총 합계</td>
                                            <td className="text-right px-2 border-r border-slate-300 font-black font-black font-black font-black font-black font-black font-black font-black">{formatNumber(totalPrevSum)}</td>
                                            <td className="text-right px-2 border-r border-slate-300 text-blue-800 font-black font-black font-black font-black font-black font-black font-black font-black font-black">{formatNumber(totalTodaySum)}</td>
                                            <td className="text-right px-2 text-red-800 font-bold font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">{formatNumber(totalAccumSum)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-start font-black italic-none font-black font-black">
                            <div className="flex flex-col gap-1 font-black font-black font-black font-black">{renderTable('labor_costs')}</div>
                            <div className="flex flex-col gap-1 font-black font-black font-black font-black font-black">{renderTable('material_costs')}{renderTable('equipment_costs')}{renderTable('tree_costs')}</div>
                            <div className="flex flex-col gap-1 font-black font-black font-black font-black font-black font-black">{renderTable('transport_costs')}{renderTable('subcontract_costs')}{renderTable('etc_costs')}</div>
                        </div>

                        {/* 🚀 [복구] 사진 대지 섹션 */}
                        <div className="border border-slate-400 p-3 bg-slate-50 space-y-1 rounded-xl font-black font-black font-black font-black font-black">
                            <h4 className="text-sm font-black flex items-center gap-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black italic-none font-black"><ImageIcon size={18}/> 현장 사진 대지 (전일 / 금일)</h4>
                            <div className="grid grid-cols-4 gap-2 font-black font-black font-black font-black font-black font-black font-black font-black font-black">
                                {Array.from({ length: maxPhotoRows }).map((_, idx) => (
                                    <div key={idx} className="grid grid-cols-2 gap-1 h-[200px] border border-slate-400 p-1 bg-white font-black font-black font-black font-black font-black font-black font-black">
                                        {['tomorrow', 'today'].map(type => (
                                            <div key={type} className="flex flex-col gap-1 font-black h-full font-black font-black font-black font-black font-black font-black font-black">
                                                <div className={`text-[8px] text-center font-black py-0.5 font-black font-black font-black font-black font-black font-black ${type==='today'?'bg-blue-100 font-black font-black':'bg-gray-100 font-black font-black font-black'}`}>{type==='today'?'금일':'전일'}</div>
                                                <label className="flex-1 bg-white border border-dashed border-slate-400 flex items-center justify-center cursor-pointer overflow-hidden relative font-black font-black font-black font-black font-black font-black font-black">
                                                    {(type === 'today' ? todayPhotos : tomorrowPhotos)[idx]?.preview || (type === 'today' ? todayPhotos : tomorrowPhotos)[idx]?.url ? (
                                                        <img src={(type === 'today' ? todayPhotos : tomorrowPhotos)[idx].preview || (type === 'today' ? todayPhotos : tomorrowPhotos)[idx].url} className="w-full h-full object-cover font-black font-black font-black font-black font-black font-black" alt="사진" />
                                                    ) : <Camera size={20} className="opacity-20 font-black font-black font-black font-black font-black font-black font-black font-black" />}
                                                    <input type="file" className="hidden font-black font-black font-black font-black font-black font-black font-black font-black font-black" onChange={(e) => handlePhotoUpload(e, type, idx)} /></label>
                                                <input className="border border-slate-400 p-0.5 text-[8px] text-center bg-white font-black font-sans font-black font-black font-black font-black font-black font-black font-black" placeholder="설명" value={(type === 'today' ? todayPhotos : tomorrowPhotos)[idx]?.description || ''} onChange={e => { const n = (type === 'today' ? [...todayPhotos] : [...tomorrowPhotos]); if(!n[idx]) n[idx]={id:uuidv4()}; n[idx].description = e.target.value; (type === 'today' ? setTodayPhotos : setTomorrowPhotos)(n); }} />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => { setTodayPhotos([...todayPhotos, {id:uuidv4()}]); setTomorrowPhotos([...tomorrowPhotos, {id:uuidv4()}]); }} className="w-full py-1.5 bg-white border border-slate-400 text-[10px] font-black hover:bg-slate-50 transition-all shadow-sm font-sans font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black font-black">+ 사진 행 추가</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}