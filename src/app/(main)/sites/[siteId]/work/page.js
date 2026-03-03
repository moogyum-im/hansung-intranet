'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Save, ArrowLeft, Camera, Loader2, RefreshCw, ImageIcon, ZoomIn, ZoomOut, X, Plus, Edit3, Trash2, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const formatNumber = (num) => {
    if (num === null || num === undefined || num === "" || isNaN(num) || Number(num.toString().replace(/,/g, '')) === 0) return "-";
    return Math.round(Number(num.toString().replace(/,/g, ''))).toLocaleString();
};

const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    const cleaned = str?.toString().replace(/,/g, '') || '0';
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
};

export default function DailyWorkPage() {
    const { siteId } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const reportId = searchParams.get('id');
    const categoryType = searchParams.get('type') || 'plant';
    
    const { employee: currentUser } = useEmployee();
    const [view, setView] = useState(reportId ? 'detail' : 'write');
    const [formData, setFormData] = useState(null);
    const [siteData, setSiteData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0); 
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importDate, setImportDate] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);

    const [focusedField, setFocusedField] = useState(null);

    const isReadOnly = view === 'detail';

    const [visibleSections, setVisibleSections] = useState({
        labor_costs: true, material_costs: true, equipment_costs: true, 
        tree_costs: true, transport_costs: true, subcontract_costs: true, etc_costs: true
    });

    const [todayPhotos, setTodayPhotos] = useState([]);
    const [tomorrowPhotos, setTomorrowPhotos] = useState([]);
    const maxPhotoRows = useMemo(() => Math.max(todayPhotos.length, tomorrowPhotos.length, 1), [todayPhotos, tomorrowPhotos]);

    useEffect(() => {
        const sidebar = document.querySelector('aside');
        if (sidebar) sidebar.style.display = 'none';
        return () => { if (sidebar) sidebar.style.display = 'flex'; };
    }, []);

    const FIELD_MAPS = {
        labor_costs: { fields: ['name', 'price', 'count', 'type', 'accum', 'total'], labels: ['성명', '단가', '공수', '직종', '출력누계', '금액'], title: '현장출력현황', sums: ['count', 'accum', 'total'] },
        material_costs: { fields: ['item', 'spec', 'price', 'prev_count', 'count', 'accum', 'vendor', 'total'], labels: ['품명', '규격', '단가', '전일누계', '금일수량', '전체누계', '거래처', '금액'], title: '주요자재반입현황', sums: ['prev_count', 'count', 'accum', 'total'] },
        equipment_costs: { fields: ['item', 'type', 'price', 'prev_count', 'count', 'accum', 'total'], labels: ['품명', '투입공종', '단가', '전일누계', '금일', '출력누계', '금액'], title: '장비사용현황', sums: ['prev_count', 'count', 'accum', 'total'] },
        tree_costs: { fields: ['item', 'spec', 'price', 'prev_count', 'count', 'accum', 'vendor', 'total'], labels: ['품명', '규격', '단가', '전일누계', '금일수량', '전체누계', '거래처', '금액'], title: '수목반입현황', sums: ['prev_count', 'count', 'accum', 'total'] },
        transport_costs: { fields: ['item', 'spec', 'count', 'price', 'vendor', 'total'], labels: ['품명', '규격', '수량', '단가', '거래처', '금액'], title: '운반비투입현황', sums: ['count', 'total'] },
        subcontract_costs: { fields: ['item', 'spec', 'price', 'count', 'vendor', 'total'], labels: ['품명', '규격', '단가', '수량', '거래처', '금액'], title: '자재납품 및 시공(외주)', sums: ['count', 'total'] },
        etc_costs: { fields: ['category', 'content', 'usage', 'total'], labels: ['계정', '내용', '사용처', '금액'], title: '기타경비', sums: ['total'] }
    };

    useEffect(() => {
        const load = async () => {
            const { data: site } = await supabase.from('construction_sites').select('*').eq('id', siteId).single();
            setSiteData(site);
            if (reportId) {
                const { data: rep } = await supabase.from('daily_site_reports').select('*').eq('id', reportId).single();
                const notes = typeof rep.notes === 'string' ? JSON.parse(rep.notes) : rep.notes;
                setFormData({
                    ...notes,
                    total_contract_amount: site?.budget || 0
                });
                if (notes.savedVisibleSections) setVisibleSections(notes.savedVisibleSections);
                setTodayPhotos(rep.photos?.filter(p => p.timeType === 'today') || []);
                setTomorrowPhotos(rep.photos?.filter(p => p.timeType === 'tomorrow') || []);
            } else {
                setFormData({
                    report_date: new Date().toISOString().split('T')[0],
                    weather: '맑음', report_category: categoryType, 
                    total_contract_amount: site?.budget || 0,
                    progress_plant_prev: site?.progress_plan || '0.0000', progress_facility_prev: site?.progress_facil || '0.0000',
                    progress_plant: '0.0000', progress_facility: '0.0000',
                    settlement_costs: [{ item: '수목', prev: 0, today: 0, total: 0 }, { item: '자재납품 및 시공(외주)', prev: 0, today: 0, total: 0 }, { item: '자재비', prev: 0, today: 0, total: 0 }, { item: '장비대', prev: 0, today: 0, total: 0 }, { item: '노무비', prev: 0, today: 0, total: 0 }, { item: '운반비', prev: 0, today: 0, total: 0 }, { item: '기타경비', prev: 0, today: 0, total: 0 }],
                    labor_costs: [], material_costs: [], equipment_costs: [], tree_costs: [], transport_costs: [], subcontract_costs: [], etc_costs: []
                });
            }
        };
        load();
    }, [siteId, reportId, categoryType]);

    const settlementTotals = useMemo(() => {
        if (!formData?.settlement_costs) return { prev: 0, today: 0, total: 0 };
        return formData.settlement_costs.reduce((acc, curr) => ({
            prev: acc.prev + parseNumber(curr.prev),
            today: acc.today + parseNumber(curr.today),
            total: acc.total + parseNumber(curr.total)
        }), { prev: 0, today: 0, total: 0 });
    }, [formData?.settlement_costs]);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const { data: existingRecord } = await supabase
                .from('daily_site_reports')
                .select('*')
                .eq('site_id', siteId)
                .eq('report_date', formData.report_date)
                .maybeSingle();

            let mergedNotes = existingRecord 
                ? { ...JSON.parse(existingRecord.notes), ...formData, report_category: categoryType }
                : { ...formData, report_category: categoryType };

            const uploadedCurrentPhotos = await Promise.all([...todayPhotos, ...tomorrowPhotos].map(async (p) => {
                if (!p || p.url) return p;
                const path = `${siteId}/${uuidv4()}.jpg`;
                await supabase.storage.from('daily_reports').upload(path, p.file);
                const { data } = supabase.storage.from('daily_reports').getPublicUrl(path);
                return { id: p.id, url: data.publicUrl, timeType: p.timeType, description: p.description };
            }));

            const payload = { 
                site_id: siteId, report_date: formData.report_date, author_id: currentUser.id, 
                photos: uploadedCurrentPhotos.filter(v => v !== null), 
                notes: JSON.stringify({ ...mergedNotes, savedVisibleSections: visibleSections }), 
                content: formData.today_work || '작업일보 기록'
            };

            const { error } = await supabase.from('daily_site_reports').upsert(existingRecord ? { id: existingRecord.id, ...payload } : payload);
            if (error) throw error;
            toast.success("저장되었습니다.");
            router.push(`/sites/${siteId}`);
        } catch (e) { console.error(e); toast.error("저장 오류 발생"); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm("정말 이 보고서를 삭제하시겠습니까?")) return;
        try {
            await supabase.from('daily_site_reports').delete().eq('id', reportId);
            toast.success("삭제되었습니다.");
            router.back();
        } catch (e) { toast.error("삭제 실패"); }
    };

    const executeImport = async () => {
        try {
            const { data: allReports } = await supabase.from('daily_site_reports').select('*').eq('site_id', siteId).eq('report_date', importDate);
            const match = allReports?.find(r => (JSON.parse(r.notes)?.report_category || 'plant') === categoryType);
            if (!match) return toast.error(`불러올 데이터가 없습니다.`);
            const importedData = JSON.parse(match.notes);

            // 🚀 [수정] 전일 사진 불러오기 시 '전일 현황(tomorrow)' 칸으로 강제 배정
            if (match.photos && match.photos.length > 0) {
                // 기존의 timeType과 상관없이 모두 'tomorrowPhotos'로 설정하여 화면 우측(전일현황)에 표시
                const photosAsPrev = match.photos.map(p => ({ ...p, timeType: 'tomorrow' }));
                setTomorrowPhotos(photosAsPrev);
                setTodayPhotos([]); // 금일 현황은 비움
            }

            const convertRows = (key) => (importedData[key] || []).map(row => {
                const lastAccum = parseNumber(row.accum || row.count || 0);
                return { ...row, prev_count: lastAccum.toString(), count: '0', accum: lastAccum.toString(), total: '0' };
            });
            setFormData(curr => ({
                ...curr, ...importedData, report_date: curr.report_date, report_category: categoryType,
                prev_work: importedData.today_work, today_work: '',
                progress_plant_prev: (parseNumber(importedData.progress_plant_prev) + parseNumber(importedData.progress_plant)).toFixed(4),
                progress_facility_prev: (parseNumber(importedData.progress_facility_prev) + parseNumber(importedData.progress_facility)).toFixed(4),
                progress_plant: '0.0000', progress_facility: '0.0000',
                settlement_costs: (importedData.settlement_costs || []).map(item => ({ ...item, prev: item.total, today: 0, total: item.total })),
                labor_costs: convertRows('labor_costs'), material_costs: convertRows('material_costs'), equipment_costs: convertRows('equipment_costs'), tree_costs: convertRows('tree_costs'), transport_costs: convertRows('transport_costs'), subcontract_costs: convertRows('subcontract_costs'), etc_costs: (importedData.etc_costs || []).map(r => ({...r, total: 0}))
            }));
            setIsImportModalOpen(false);
            toast.success("전일 데이터 및 사진 연동 완료");
        } catch (e) { toast.error("불러오기 실패"); }
    };

    const handlePhotoUpload = (e, type, idx) => {
        const file = e.target.files[0];
        if (!file) return;
        const newPhoto = { id: uuidv4(), file, preview: URL.createObjectURL(file), timeType: type, description: "" };
        type === 'today' ? setTodayPhotos(prev => { const n = [...prev]; n[idx] = newPhoto; return n; }) : setTomorrowPhotos(prev => { const n = [...prev]; n[idx] = newPhoto; return n; });
    };

    useEffect(() => {
        if (!formData || view === 'detail') return;
        const getSum = (key) => (formData[key] || []).reduce((acc, cur) => acc + parseNumber(cur.total), 0);
        const sums = { '수목': getSum('tree_costs'), '자재납품 및 시공(외주)': getSum('subcontract_costs'), '자재비': getSum('material_costs'), '장비대': getSum('equipment_costs'), '노무비': getSum('labor_costs'), '운반비': getSum('transport_costs'), '기타경비': getSum('etc_costs') };
        setFormData(prev => ({ ...prev, settlement_costs: (prev.settlement_costs || []).map(s => ({ ...s, today: sums[s.item] || 0, total: parseNumber(s.prev) + (sums[s.item] || 0) })) }));
    }, [formData?.labor_costs, formData?.tree_costs, formData?.material_costs, formData?.equipment_costs, formData?.transport_costs, formData?.subcontract_costs, formData?.etc_costs, view]);

    const renderTable = (key) => {
        if (!visibleSections[key]) return null;
        const config = FIELD_MAPS[key];
        const rows = formData?.[key] || [];
        const getColumnSum = (f) => rows.reduce((acc, cur) => acc + parseNumber(cur[f]), 0);
        return (
            <div key={key} className="border border-slate-400 flex flex-col font-bold mb-1 w-full bg-white shadow-sm font-sans rounded-none">
                <div className="bg-yellow-50 border-b border-slate-400 p-1 flex justify-between items-center font-black rounded-none">
                    <span className="text-[10px] uppercase">▣ {config.title}</span>
                    {!isReadOnly && <button onClick={()=>setFormData(p=>({...p, [key]: [...(p[key]||[]), config.fields.reduce((a,f)=>({...a,[f]:''}),{})]}))} className="bg-white border border-slate-400 px-1 text-[8px] font-bold shadow-sm rounded-none">+ 추가</button>}
                </div>
                <table className="w-full text-[9px] border-collapse font-bold rounded-none">
                    <thead className="bg-slate-50 border-b border-slate-400 font-sans"><tr>{config.labels.map(l=><th key={l} className="border-r border-slate-300 p-1 uppercase">{l}</th>)}{!isReadOnly && <th className="w-4"></th>}</tr></thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                                {config.fields.map((f, fIdx) => {
                                    const isNumeric = ['total','price','accum','count','prev_count'].includes(f);
                                    const fieldId = `${key}-${i}-${f}`;
                                    const displayValue = isNumeric && focusedField !== fieldId 
                                        ? formatNumber(row[f]) 
                                        : (isNumeric && Number(row[f]) === 0 ? "" : row[f]);

                                    return (
                                        <td key={f} className="border-r border-slate-200 p-0 font-sans relative">
                                            <input className="w-full p-1 text-right outline-none bg-transparent font-sans font-black rounded-none"
                                                value={displayValue}
                                                readOnly={isReadOnly}
                                                onFocus={() => isNumeric && setFocusedField(fieldId)}
                                                onBlur={() => setFocusedField(null)}
                                                placeholder={isNumeric && focusedField === fieldId ? "0" : ""}
                                                onChange={e => {
                                                    if (isReadOnly) return;
                                                    const updated = [...rows]; 
                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                    updated[i][f] = val;
                                                    if (['count', 'price', 'prev_count'].some(field => config.fields.includes(field))) {
                                                        updated[i].accum = (parseNumber(updated[i].prev_count || 0) + parseNumber(updated[i].count || 0)).toString();
                                                        updated[i].total = (parseNumber(updated[i].price) * parseNumber(updated[i].count)).toString(); 
                                                    }
                                                    setFormData({...formData, [key]: updated});
                                                }} 
                                            />
                                        </td>
                                    );
                                })}
                                {!isReadOnly && <td className="text-center text-red-500 cursor-pointer" onClick={()=>setFormData(p=>({...p, [key]: rows.filter((_, idx)=>idx!==i)}))}>×</td>}
                            </tr>))}
                        <tr className="bg-slate-50 border-t border-slate-300 font-black">
                            <td className="text-center p-1 border-r border-slate-200 font-sans">합계</td>
                            {config.fields.slice(1).map((f, idx) => (<td key={idx} className="text-right px-1 border-r border-slate-200 text-blue-800 font-sans">{config.sums.includes(f) ? formatNumber(getColumnSum(f)) : ''}</td>))}
                            {!isReadOnly && <td></td>}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    const totalTodaySpend = formData?.settlement_costs?.reduce((a,c)=>a+parseNumber(c.today), 0) || 0;
    const totalAccumSpend = formData?.settlement_costs?.reduce((a,c)=>a+parseNumber(c.total), 0) || 0;
    const contractAmt = parseNumber(formData?.total_contract_amount);
    const spendRate = contractAmt > 0 ? ((totalAccumSpend / contractAmt) * 100).toFixed(2) : "0.00";

    const plantTotal = parseNumber(formData?.progress_plant_prev) + parseNumber(formData?.progress_plant) === 0 ? "-" : (parseNumber(formData?.progress_plant_prev) + parseNumber(formData?.progress_plant)).toFixed(4);
    const facilityTotal = parseNumber(formData?.progress_facility_prev) + parseNumber(formData?.progress_facility) === 0 ? "-" : (parseNumber(formData?.progress_facility_prev) + parseNumber(formData?.progress_facility)).toFixed(4);

    if (!formData) return null;

    return (
        <div className="h-screen bg-white font-bold font-sans flex flex-col overflow-hidden font-black italic-none rounded-none">
            {selectedImage && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 cursor-zoom-out rounded-none" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-5xl w-full">
                        <img src={selectedImage} className="w-full h-auto max-h-[90vh] object-contain border-4 border-white shadow-2xl rounded-none" alt="확대사진" />
                        <button className="absolute -top-10 right-0 text-white flex items-center gap-2 font-black font-sans"><X size={30} /> 닫기</button>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 font-sans rounded-none">
                    <div className="bg-white p-8 max-w-sm w-full font-black border-4 border-slate-900 shadow-2xl rounded-none">
                        <h3 className="text-xl mb-4 uppercase">데이터 불러오기</h3>
                        <input type="date" className="w-full p-3 border rounded-none mb-4 font-black" onChange={e=>setImportDate(e.target.value)} />
                        <div className="flex gap-2"><button onClick={()=>setIsImportModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-none font-black">취소</button><button onClick={executeImport} className="flex-1 py-3 bg-black text-white rounded-none font-black">불러오기</button></div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center p-3 border-b border-slate-200 bg-white shrink-0 z-50 font-black rounded-none">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-slate-600 font-black flex items-center gap-2 hover:bg-slate-50 p-2 rounded-none transition-all font-sans italic-none"><ArrowLeft size={18}/> 현장목록</button>
                    {!isReadOnly && (
                        <div className="flex gap-1 border-l pl-4 border-slate-200 font-sans">
                            {Object.entries(FIELD_MAPS).map(([key, config]) => (
                                <button key={key} onClick={() => setVisibleSections(p => ({...p, [key]: !visibleSections[key]}))} className={`px-2.5 py-1.5 text-[9px] transition-all font-black rounded-none ${visibleSections[key] ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-300 border border-slate-100'}`}>{config.title.split('(')[0]}</button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-none mr-4 border border-slate-200 font-sans">
                        <ZoomOut size={12} className="cursor-pointer" onClick={() => setZoomLevel(Math.max(0.4, zoomLevel - 0.05))}/>
                        <input type="range" min="0.4" max="1.5" step="0.05" value={zoomLevel} onChange={(e)=>setZoomLevel(parseFloat(e.target.value))} className="w-24 accent-slate-900" />
                        <ZoomIn size={12} className="cursor-pointer" onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.05))}/>
                        <span className="text-[10px] w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                    </div>
                    {isReadOnly ? (
                        <div className="flex gap-2">
                            <button onClick={handleDelete} className="bg-red-50 text-red-600 border border-red-200 px-6 py-2 rounded-none font-black text-[11px] hover:bg-red-100 flex items-center gap-2 transition-all font-sans italic-none"><Trash2 size={14}/> 삭제</button>
                            <button onClick={() => setView('write')} className="bg-slate-900 text-white px-8 py-2 rounded-none font-black text-[11px] shadow-sm flex items-center gap-2 hover:bg-slate-800 transition-all font-sans italic-none"><Edit3 size={14}/> 정보 수정</button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                             <button onClick={() => setIsImportModalOpen(true)} className="bg-amber-500 text-white px-5 py-2 rounded-none font-black text-[11px] shadow-sm hover:bg-amber-600 flex items-center gap-2 transition-all font-sans italic-none"><RefreshCw size={14}/> 불러오기</button>
                             <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-8 py-2 rounded-none font-black text-[11px] shadow-sm hover:bg-blue-700 transition-all flex items-center gap-2 font-sans italic-none">{isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} 일보 저장</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-[#F8FAFC] font-black italic-none rounded-none">
                <div style={{ transformOrigin: 'top left', transform: `scale(${zoomLevel})`, width: `${100 / zoomLevel}%` }} className="pb-40 font-black ml-0 text-left items-start flex flex-col font-sans italic-none rounded-none">
                    <div className="max-w-[1600px] w-full bg-white p-8 pt-4 border border-slate-200 shadow-sm font-black italic-none rounded-none">
                        
                        {!isReadOnly && (
                            <div className="mb-6 p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-none flex gap-4 items-start animate-in fade-in slide-in-from-top-2 duration-500">
                                <div className="bg-slate-900 text-white p-2 rounded-none shadow-lg shrink-0">
                                    <HelpCircle size={24} />
                                </div>
                                <div className="space-y-1 text-slate-700">
                                    <h4 className="text-sm font-black flex items-center gap-2">💡 작업일보 작성 가이드</h4>
                                    <ul className="text-[11px] font-bold list-disc list-inside space-y-1 opacity-80">
                                        <li><span className="text-blue-600">공정률 입력:</span> 우측 상단 공정률 칸에 금일 진행분을 입력하면 전일 데이터와 합산되어 누계가 자동 계산됩니다.</li>
                                        <li><span className="text-blue-600">데이터 불러오기:</span> 상단 [불러오기] 버튼을 통해 전일 작성한 내역(인원, 자재, 장비 등)을 그대로 가져올 수 있습니다.</li>
                                        <li><span className="text-blue-600">섹션 관리:</span> 상단의 공종 버튼(노무, 자재 등)을 클릭하여 불필요한 테이블은 화면에서 가릴 수 있습니다.</li>
                                        <li><span className="text-blue-600">수치 입력:</span> 단가와 수량을 입력하면 총 금액이 자동 산출됩니다. (세액 별도 산출 불가)</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-end gap-8 mb-4 rounded-none">
                            <div className="flex flex-col gap-2 flex-1 font-black italic-none">
                                <h1 className="text-5xl font-black uppercase tracking-[0.6em] text-left mt-[-30px] font-sans rounded-none">작 업 일 보</h1>
                                <div className="flex gap-2 flex-wrap items-end font-sans italic-none font-black">
                                    <div className="flex border border-slate-400 text-[9px] font-black h-8 shrink-0 shadow-sm items-center px-3 bg-slate-50 uppercase rounded-none">총 도급액: {formatNumber(formData?.total_contract_amount)}원</div>
                                    <div className="flex border border-slate-400 text-[9px] font-black h-8 shrink-0 shadow-sm items-center px-3 text-blue-700 font-sans rounded-none">금일 사용: {formatNumber(totalTodaySpend)}원</div>
                                    <div className="flex border border-slate-400 text-[11px] bg-red-50 font-black h-8 shrink-0 shadow-sm items-center px-4 text-red-600 font-sans rounded-none">누적 집행: {formatNumber(totalAccumSpend)}원 ({spendRate}%)</div>
                                    <div className="flex border border-slate-400 text-[11px] bg-blue-50 font-black h-8 shrink-0 shadow-sm items-center px-4 text-blue-800 font-sans gap-4 rounded-none">
                                        <span>식재 공정률: {plantTotal}%</span>
                                        <div className="w-[1px] h-4 bg-blue-200" />
                                        <span>시설 공정률: {facilityTotal}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-0 w-[350px] font-black shrink-0 border border-slate-400 shadow-sm bg-white font-sans italic-none rounded-none">
                                <div className="flex border-b border-slate-400 h-8 font-black italic-none">
                                    <div className="bg-slate-50 px-2 flex items-center border-r border-slate-400 text-[9px] w-20 font-black font-sans rounded-none">현장명</div>
                                    <div className="px-2 flex items-center text-[10px] font-black font-sans overflow-hidden whitespace-nowrap flex-1 rounded-none">{siteData?.name}</div>
                                    <div className="bg-slate-50 px-2 flex items-center border-l border-r border-slate-400 text-[9px] w-20 font-black font-sans rounded-none">작업 일시</div>
                                    <input type="date" className="px-2 text-[10px] outline-none bg-transparent font-sans font-black w-28 rounded-none" value={formData?.report_date || ''} readOnly={isReadOnly} onChange={e=>setFormData({...formData, report_date: e.target.value})} />
                                </div>
                                {['plant', 'facility'].map((k, i) => {
                                    const isActive = k === 'plant' ? siteData?.is_plant_active : siteData?.is_facility_active;
                                    const fieldId = `progress-${k}`;
                                    const isFocused = focusedField === fieldId;
                                    const displayVal = !isFocused && parseNumber(formData?.[`progress_${k}`]) === 0 ? "" : formData?.[`progress_${k}`];

                                    return (
                                        <div key={k} className={`flex h-10 bg-blue-50 font-black font-sans italic-none ${i === 0 ? 'border-b border-slate-400' : ''} rounded-none`}>
                                            <div className="bg-blue-50 px-2 flex items-center border-r border-slate-400 font-black uppercase font-sans text-[8px] w-20 font-black"> {k==='plant'?'식재공정':'시설공정'}</div>
                                            <div className="flex divide-x divide-slate-400 bg-white font-sans flex-1 italic-none rounded-none">
                                                <div className="flex flex-col items-center justify-center flex-1 leading-tight"><span className="text-[6px] text-slate-400 font-sans">전일</span><span className="text-[11px] font-black font-sans">{formData?.[`progress_${k}_prev`] === '0.0000' ? '-' : formData?.[`progress_${k}_prev`]}</span></div>
                                                <div className={`flex flex-col items-center justify-center flex-1 leading-tight ${!isActive ? 'bg-slate-100' : 'bg-blue-50/30'}`}>
                                                    <span className="text-[6px] text-blue-400 font-sans">금일(입력)</span>
                                                    <div className="w-full relative">
                                                        <input className={`w-full text-center text-[12px] text-blue-700 outline-none font-black bg-transparent font-sans ${!isActive ? 'cursor-not-allowed' : ''} rounded-none`} 
                                                            value={displayVal} 
                                                            readOnly={isReadOnly || !isActive} 
                                                            onFocus={() => setFocusedField(fieldId)}
                                                            onBlur={() => setFocusedField(null)}
                                                            placeholder={isFocused ? "0.0000" : "-"}
                                                            onChange={e=>setFormData({...formData, [`progress_${k}`]: e.target.value.replace(/[^0-9.]/g, '')})} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-4 items-stretch mb-4 font-black italic-none rounded-none">
                            <div className="col-span-8 grid grid-cols-2 border border-slate-400 h-[220px] shadow-inner bg-slate-50 font-sans italic-none font-black rounded-none">
                                <div className="border-r border-slate-400 flex flex-col font-black italic-none rounded-none"><div className="bg-slate-50 p-1.5 text-center border-b border-slate-400 text-[10px] uppercase font-sans tracking-widest rounded-none">전일 작업 요약</div><textarea className="w-full flex-1 p-4 text-[13px] outline-none font-bold resize-none bg-transparent text-center leading-relaxed font-sans rounded-none" value={formData?.prev_work} readOnly /></div>
                                <div className="flex flex-col font-black italic-none rounded-none"><div className="bg-slate-50 p-1.5 text-center border-b border-slate-400 text-[10px] uppercase font-sans tracking-widest rounded-none">금일 작업 요약</div><textarea className="w-full flex-1 p-4 text-[13px] outline-none font-bold resize-none bg-transparent text-center leading-relaxed font-black rounded-none" value={formData?.today_work} readOnly={isReadOnly} onChange={e=>setFormData({...formData, today_work: e.target.value})} /></div>
                            </div>
                            <div className="col-span-4 border border-slate-400 shadow-sm overflow-hidden font-sans flex flex-col h-full bg-white italic-none rounded-none">
                                <div className="bg-slate-800 text-white p-1.5 text-center text-[10px] uppercase font-sans font-black rounded-none">실시간 정산 내역 합계</div>
                                <table className="w-full text-[9px] border-collapse font-sans flex-1 rounded-none">
                                    <thead className="bg-slate-50 border-b border-slate-400 font-bold font-sans italic-none rounded-none"><tr><th className="p-1 border-r border-slate-400 text-center uppercase">항목</th><th className="border-r border-slate-400 text-center uppercase">전일</th><th className="border-r border-slate-400 text-center text-blue-600 font-bold uppercase">금일</th><th className="text-center text-red-600 uppercase font-bold">누계</th></tr></thead>
                                    <tbody className="h-full font-black rounded-none">
                                        {(formData?.settlement_costs || []).map((row, idx) => (
                                            <tr key={idx} className="border-b border-slate-200">
                                                <td className="bg-slate-50 border-r border-slate-200 text-center p-0.5 font-sans">{row.item}</td>
                                                <td className="text-right px-2 border-r border-slate-200 font-sans">{formatNumber(row.prev)}</td>
                                                <td className="text-right px-2 text-blue-700 border-r border-slate-200 font-sans font-black">{formatNumber(row.today)}</td>
                                                <td className="text-right px-2 text-red-600 font-bold font-sans">{formatNumber(row.total)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100 border-t-2 border-slate-400 font-black rounded-none">
                                            <td className="text-center p-1 border-r border-slate-200 font-sans">총 합계</td>
                                            <td className="text-right px-2 border-r border-slate-200 font-sans">{formatNumber(settlementTotals.prev)}</td>
                                            <td className="text-right px-2 text-blue-800 border-r border-slate-200 font-sans">{formatNumber(settlementTotals.today)}</td>
                                            <td className="text-right px-2 text-red-800 font-sans">{formatNumber(settlementTotals.total)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 items-start font-black italic-none font-sans rounded-none">
                            <div className="space-y-3 rounded-none">{renderTable('labor_costs')}</div>
                            <div className="space-y-3 rounded-none">{renderTable('material_costs')}{renderTable('equipment_costs')}{renderTable('tree_costs')}</div>
                            <div className="space-y-3 rounded-none">{renderTable('transport_costs')}{renderTable('subcontract_costs')}{renderTable('etc_costs')}</div>
                        </div>

                        <div className="pt-8 space-y-6 font-black border-t-2 border-slate-400 mt-4 italic-none rounded-none">
                            <h4 className="text-lg font-black flex items-center gap-3 font-sans font-black italic-none rounded-none"><ImageIcon size={24} className="text-slate-900"/> 시공 사진 대지</h4>
                            <div className="grid grid-cols-4 gap-4 font-black font-sans rounded-none">
                                {Array.from({ length: maxPhotoRows }).map((_, idx) => (
                                    <div key={idx} className="grid grid-cols-2 gap-2 h-[260px] bg-white rounded-none">
                                        {['tomorrow', 'today'].map(type => {
                                            const photo = (type === 'today' ? todayPhotos : tomorrowPhotos)[idx];
                                            const imgSrc = photo?.preview || photo?.url;
                                            return (
                                                <div key={type} className="flex flex-col gap-2 h-full italic-none rounded-none">
                                                    <div className={`text-[8px] text-center font-black py-1.5 font-sans rounded-none ${type==='today'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-400'}`}>{type==='today'?'금일 현황':'전일 현황'}</div>
                                                    <div className="flex-1 bg-slate-50 border border-slate-300 flex items-center justify-center cursor-zoom-in overflow-hidden relative shadow-inner italic-none font-black rounded-none" onClick={() => imgSrc && setSelectedImage(imgSrc)}>
                                                        {imgSrc ? <img src={imgSrc} className="w-full h-full object-cover rounded-none" alt="사진" /> : <Camera size={28} className="opacity-10" />}
                                                        {!isReadOnly && <input type="file" className="absolute inset-0 opacity-0 cursor-pointer italic-none font-black rounded-none" onChange={(e) => handlePhotoUpload(e, type, idx)} />}
                                                    </div>
                                                    <input className="border-b border-slate-300 p-1 text-[10px] text-center bg-transparent font-black font-sans focus:border-slate-900 outline-none transition-all italic-none rounded-none" placeholder="기록 입력" value={photo?.description || ''} readOnly={isReadOnly} onChange={e => { const n = (type === 'today' ? [...todayPhotos] : [...tomorrowPhotos]); if(!n[idx]) n[idx]={id:uuidv4()}; n[idx].description = e.target.value; (type === 'today' ? setTodayPhotos : setTomorrowPhotos)(n); }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                            {!isReadOnly && (
                                <div className="flex justify-center mt-4">
                                    <button onClick={() => { setTodayPhotos([...todayPhotos, {id:uuidv4()}]); setTomorrowPhotos([...tomorrowPhotos, {id:uuidv4()}]); }} className="flex items-center gap-2 px-6 py-1.5 bg-slate-900 text-white rounded-none font-black text-[9px] hover:bg-blue-600 transition-all shadow-md font-sans italic-none"><Plus size={12} strokeWidth={3}/> 사진 대지 행 추가</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}