'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Save, ArrowLeft, Camera, Loader2, RefreshCw, ImageIcon, ZoomIn, ZoomOut, X, Plus, Edit3, Trash2, ChevronDown, ChevronUp, MousePointerClick, RotateCcw, AlertCircle, ListFilter, ListMinus } from 'lucide-react';
import { toast } from 'react-hot-toast';

// 숫자 포맷팅 유틸리티
const formatNumber = (num) => {
    if (num === null || num === undefined || num === "" || isNaN(num) || Number(num.toString().replace(/,/g, '')) === 0) return "-";
    const n = Number(num.toString().replace(/,/g, ''));
    if (n % 1 !== 0) return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 });
    return Math.round(n).toLocaleString();
};

const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    const cleaned = str?.toString().replace(/,/g, '') || '0';
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
};

// 🚀 [에러 방지 핵심] 빈 데이터나 깨진 JSON을 읽을 때 화면이 멈추지 않도록 보호하는 함수
const safeParseJSON = (data) => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
        return JSON.parse(data);
    } catch (error) {
        console.warn('JSON parsing error (safely ignored):', error);
        return {}; // 에러 발생 시 빈 객체를 반환하여 프로그램 다운 방지
    }
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
    const [originalData, setOriginalData] = useState(null); 
    const [siteData, setSiteData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0); 
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importDate, setImportDate] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [focusedField, setFocusedField] = useState(null);

    const [columnWidths, setColumnWidths] = useState({});
    const [expandedSections, setExpandedSections] = useState({});

    const isReadOnly = view === 'detail';

    const [visibleSections, setVisibleSections] = useState({
        labor_costs: true, material_costs: true, equipment_costs: true, 
        tree_costs: true, transport_costs: true, subcontract_costs: true, etc_costs: true
    });

    const [collapsedSections, setCollapsedSections] = useState({});
    const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

    const [todayPhotos, setTodayPhotos] = useState([]);
    const [tomorrowPhotos, setTomorrowPhotos] = useState([]);
    const maxPhotoRows = useMemo(() => Math.max(todayPhotos.length, tomorrowPhotos.length, 1), [todayPhotos, tomorrowPhotos]);

    useEffect(() => {
        const sidebar = document.querySelector('aside');
        if (sidebar) sidebar.style.display = 'none';
        return () => { if (sidebar) sidebar.style.display = 'flex'; };
    }, []);

    const FIELD_MAPS = {
        labor_costs: { fields: ['name', 'price', 'count', 'type', 'prev_count', 'accum', 'total'], labels: ['성명', '단가', '공수', '직종', '전일누계', '출력누계', '금액'], title: '현장출력현황', sums: ['count', 'accum', 'total'] },
        material_costs: { fields: ['item', 'spec', 'price', 'prev_count', 'count', 'accum', 'total'], labels: ['품명', '규격', '단가', '전일누계', '금일수량', '전체누계', '금액'], title: '주요자재반입현황', sums: ['prev_count', 'count', 'accum', 'total'] },
        equipment_costs: { fields: ['item', 'price', 'prev_count', 'count', 'accum', 'total'], labels: ['품명', '단가', '전일누계', '금일', '출력누계', '금액'], title: '장비사용현황', sums: ['prev_count', 'count', 'accum', 'total'] },
        tree_costs: { fields: ['item', 'spec', 'price', 'design_count', 'prev_count', 'count', 'accum', 'vendor', 'total'], labels: ['품명', '규격', '단가', '설계수량', '전일누계', '금일수량', '전체누계', '거래처', '금액'], title: '수목반입현황', sums: ['design_count', 'prev_count', 'count', 'accum', 'total'] },
        transport_costs: { fields: ['item', 'spec', 'count', 'price', 'vendor', 'total'], labels: ['품명', '규격', '수량', '단가', '거래처', '금액'], title: '운반비투입현황', sums: ['count', 'total'] },
        subcontract_costs: { fields: ['item', 'spec', 'price', 'count', 'vendor', 'total'], labels: ['품명', '규격', '단가', '수량', '거래처', '금액'], title: '자재납품 및 시공(외주)', sums: ['count', 'total'] },
        etc_costs: { fields: ['category', 'content', 'usage', 'total'], labels: ['계정', '내용', '사용처', '금액'], title: '기타경비', sums: ['total'] }
    };

    const onResizeStart = (tableKey, colIndex, e) => {
        if (isReadOnly) return;
        const startX = e.pageX;
        const startWidth = e.target.parentElement.offsetWidth;
        const onMouseMove = (moveEvent) => {
            const currentWidth = startWidth + (moveEvent.pageX - startX);
            setColumnWidths(prev => ({ ...prev, [tableKey]: { ...prev[tableKey], [colIndex]: Math.max(40, currentWidth) } }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const getUniqueKey = (row) => {
        const name = row.item || row.name || '';
        const spec = row.spec || '';
        const vendor = row.vendor || '';
        return `${name.trim()}_${spec.trim()}_${vendor.trim()}`;
    };

    const syncWithAllPastData = useCallback(async (currentData) => {
        if (!currentData?.report_date) return currentData;
        const { data: pastReports } = await supabase.from('daily_site_reports').select('notes').eq('site_id', siteId).lt('report_date', currentData.report_date);
        if (!pastReports) return currentData;

        const historicalDataMap = {}; const historicalProgress = { plant: 0, facility: 0 }; const historicalSettlement = {};
        
        pastReports.forEach(report => {
            // 🚀 파싱 오류 해결 적용
            const notes = safeParseJSON(report.notes);
            
            historicalProgress.plant += parseNumber(notes.progress_plant);
            historicalProgress.facility += parseNumber(notes.progress_facility);

            ['labor_costs', 'material_costs', 'equipment_costs', 'tree_costs', 'transport_costs', 'subcontract_costs'].forEach(key => {
                if (!historicalDataMap[key]) historicalDataMap[key] = {};
                if (notes[key] && Array.isArray(notes[key])) {
                    notes[key].forEach(row => {
                        const uKey = getUniqueKey(row);
                        if (uKey === '__') return; 

                        if (!historicalDataMap[key][uKey]) {
                            historicalDataMap[key][uKey] = { ...row, count: 0, total: 0, prev_count: 0, accum: 0 }; 
                        }
                        historicalDataMap[key][uKey].prev_count += parseNumber(row.count);
                    });
                }
            });
            if (notes.settlement_costs && Array.isArray(notes.settlement_costs)) {
                notes.settlement_costs.forEach(item => {
                    historicalSettlement[item.item] = (historicalSettlement[item.item] || 0) + parseNumber(item.today);
                });
            }
        });

        const updatedData = { ...currentData };
        updatedData.progress_plant_prev = historicalProgress.plant.toFixed(4);
        updatedData.progress_facility_prev = historicalProgress.facility.toFixed(4);

        ['labor_costs', 'material_costs', 'equipment_costs', 'tree_costs', 'transport_costs', 'subcontract_costs'].forEach(key => {
            const currentRows = updatedData[key] || [];
            const pastItems = { ...historicalDataMap[key] };
            
            const processedRows = currentRows.map(row => {
                const { isNew, ...cleanRow } = row;
                const uKey = getUniqueKey(cleanRow);
                const pastInfo = pastItems[uKey];
                if (pastInfo) {
                    const newPrev = pastInfo.prev_count;
                    delete pastItems[uKey]; 
                    return { 
                        ...cleanRow, 
                        prev_count: newPrev.toString(), 
                        accum: (newPrev + parseNumber(cleanRow.count)).toString() 
                    };
                }
                return { ...cleanRow, prev_count: "0", accum: cleanRow.count };
            });

            const missingRows = Object.values(pastItems).map(pastRow => {
                const { isNew, ...cleanPastRow } = pastRow;
                return {
                    ...cleanPastRow,
                    prev_count: cleanPastRow.prev_count.toString(),
                    count: "0",
                    accum: cleanPastRow.prev_count.toString(),
                    total: "0"
                };
            });

            updatedData[key] = [...processedRows, ...missingRows];
        });

        if (updatedData.settlement_costs) {
            updatedData.settlement_costs = updatedData.settlement_costs.map(item => {
                const totalPast = historicalSettlement[item.item] || 0;
                return { ...item, prev: totalPast, total: totalPast + parseNumber(item.today) };
            });
        }
        return updatedData;
    }, [siteId]);

    useEffect(() => {
        const load = async () => {
            const { data: site } = await supabase.from('construction_sites').select('*').eq('id', siteId).single();
            setSiteData(site);
            if (reportId) {
                const { data: rep } = await supabase.from('daily_site_reports').select('*').eq('id', reportId).single();
                // 🚀 파싱 오류 해결 적용
                const notes = safeParseJSON(rep.notes);
                
                let fullData = await syncWithAllPastData({ ...notes, total_contract_amount: site?.budget || 0 });
                setFormData(fullData); setOriginalData(fullData); 
                if (notes.savedColumnWidths) setColumnWidths(notes.savedColumnWidths);
                if (notes.savedVisibleSections) setVisibleSections(notes.savedVisibleSections);
                setTodayPhotos(rep.photos?.filter(p => p.timeType === 'today') || []);
                setTomorrowPhotos(rep.photos?.filter(p => p.timeType === 'tomorrow') || []);
            } else {
                const initialData = {
                    report_date: new Date().toISOString().split('T')[0], weather: '맑음', report_category: categoryType, total_contract_amount: site?.budget || 0,
                    progress_plant_prev: '0.0000', progress_facility_prev: '0.0000', progress_plant: '0.0000', progress_facility: '0.0000',
                    settlement_costs: [{ item: '수목', prev: 0, today: 0, total: 0 }, { item: '자재납품 및 시공(외주)', prev: 0, today: 0, total: 0 }, { item: '자재비', prev: 0, today: 0, total: 0 }, { item: '장비대', prev: 0, today: 0, total: 0 }, { item: '노무비', prev: 0, today: 0, total: 0 }, { item: '운반비', prev: 0, today: 0, total: 0 }, { item: '기타경비', prev: 0, today: 0, total: 0 }],
                    labor_costs: [], material_costs: [], equipment_costs: [], tree_costs: [], transport_costs: [], subcontract_costs: [], etc_costs: []
                };
                const synced = await syncWithAllPastData(initialData);
                setFormData(synced); setOriginalData(synced);
            }
        };
        load();
    }, [siteId, reportId, categoryType, syncWithAllPastData]);

    const handleReset = () => {
        if (!confirm("저장 전 상태로 되돌리시겠습니까?")) return;
        setFormData(JSON.parse(JSON.stringify(originalData)));
        if (originalData?.savedColumnWidths) setColumnWidths(originalData.savedColumnWidths);
        toast.success("초기화되었습니다.");
    };

    const handleSave = async () => {
        if (isSaving) return; setIsSaving(true);
        try {
            const uploadedPhotos = await Promise.all([...todayPhotos, ...tomorrowPhotos].map(async (p) => {
                if (!p || p.url) return p;
                const path = `${siteId}/${uuidv4()}.jpg`;
                await supabase.storage.from('daily_reports').upload(path, p.file);
                const { data } = supabase.storage.from('daily_reports').getPublicUrl(path);
                return { id: p.id, url: data.publicUrl, timeType: p.timeType, description: p.description };
            }));

            const cleanDataToSave = JSON.parse(JSON.stringify(formData));
            ['labor_costs', 'material_costs', 'equipment_costs', 'tree_costs', 'transport_costs', 'subcontract_costs', 'etc_costs'].forEach(key => {
                if (cleanDataToSave[key]) {
                    cleanDataToSave[key] = cleanDataToSave[key].map(row => {
                        const { isNew, ...rest } = row;
                        return rest;
                    });
                }
            });

            const payload = { 
                site_id: siteId, report_date: formData.report_date, author_id: currentUser.id, photos: uploadedPhotos.filter(v => v !== null), 
                notes: JSON.stringify({ ...cleanDataToSave, savedVisibleSections: visibleSections, savedColumnWidths: columnWidths }), content: formData.today_work || '작업일보 기록'
            };
            const { data: existing } = await supabase.from('daily_site_reports').select('id, notes').eq('site_id', siteId).eq('report_date', formData.report_date);
            const targetId = existing?.find(r => (safeParseJSON(r.notes)?.report_category || 'plant') === categoryType)?.id || reportId;
            await supabase.from('daily_site_reports').upsert(targetId ? { id: targetId, ...payload } : payload);
            toast.success("저장되었습니다."); router.push(`/sites/${siteId}`);
        } catch (e) { toast.error("저장 오류"); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm("정말 이 보고서를 삭제하시겠습니까?")) return;
        try {
            await supabase.from('daily_site_reports').delete().eq('id', reportId);
            toast.success("삭제되었습니다."); router.back();
        } catch (e) { toast.error("삭제 실패"); }
    };

    const executeImport = async () => {
        try {
            const { data: allReports } = await supabase.from('daily_site_reports').select('*').eq('site_id', siteId).eq('report_date', importDate);
            const match = allReports?.find(r => (safeParseJSON(r.notes)?.report_category || 'plant') === categoryType);
            if (!match) return toast.error(`데이터가 없습니다.`);
            
            // 🚀 파싱 오류 해결 적용
            const importedData = safeParseJSON(match.notes);
            
            if (match.photos?.length > 0) { 
                setTomorrowPhotos(match.photos.map(p => ({ ...p, timeType: 'tomorrow' }))); 
                setTodayPhotos([]); 
            }

            const resetRows = (rows = []) => rows.map(r => {
                const { isNew, ...rest } = r; 
                return { ...rest, count: '0', total: '0' };
            });

            const baseDataForSync = { 
                ...formData, 
                ...importedData, 
                report_date: formData.report_date, 
                report_category: categoryType, 
                prev_work: importedData.today_work, 
                today_work: '',
                progress_plant: '0.0000',
                progress_facility: '0.0000',
                labor_costs: resetRows(importedData.labor_costs),
                material_costs: resetRows(importedData.material_costs),
                equipment_costs: resetRows(importedData.equipment_costs),
                tree_costs: resetRows(importedData.tree_costs),
                transport_costs: resetRows(importedData.transport_costs),
                subcontract_costs: resetRows(importedData.subcontract_costs),
                etc_costs: resetRows(importedData.etc_costs)
            };

            setFormData(await syncWithAllPastData(baseDataForSync)); 
            setIsImportModalOpen(false);
            toast.success("성공적으로 데이터를 연동했습니다.");
        } catch (e) { toast.error("불러오기 실패"); }
    };

    const handlePhotoUpload = (e, type, idx) => {
        const file = e.target.files[0]; if (!file) return;
        const newPhoto = { id: uuidv4(), file, preview: URL.createObjectURL(file), timeType: type, description: "" };
        type === 'today' ? setTodayPhotos(prev => { const n = [...prev]; n[idx] = newPhoto; return n; }) : setTomorrowPhotos(prev => { const n = [...prev]; n[idx] = newPhoto; return n; });
    };

    const handleRemovePhotoRow = (idx) => {
        if (!confirm("사진 행을 삭제하시겠습니까?")) return;
        setTodayPhotos(prev => prev.filter((_, i) => i !== idx));
        setTomorrowPhotos(prev => prev.filter((_, i) => i !== idx));
    };

    useEffect(() => {
        if (!formData || isReadOnly) return;
        const getSum = (key) => (formData[key] || []).reduce((acc, cur) => acc + parseNumber(cur.total), 0);
        const sums = { '수목': getSum('tree_costs'), '자재납품 및 시공(외주)': getSum('subcontract_costs'), '자재비': getSum('material_costs'), '장비대': getSum('equipment_costs'), '노무비': getSum('labor_costs'), '운반비': getSum('transport_costs'), '기타경비': getSum('etc_costs') };
        const nextSettlement = (formData.settlement_costs || []).map(s => ({ ...s, today: sums[s.item] || 0, total: parseNumber(s.prev) + (sums[s.item] || 0) }));
        if (JSON.stringify(formData.settlement_costs) !== JSON.stringify(nextSettlement)) {
            setFormData(prev => ({ ...prev, settlement_costs: nextSettlement }));
        }
    }, [formData?.labor_costs, formData?.tree_costs, formData?.material_costs, formData?.equipment_costs, formData?.transport_costs, formData?.subcontract_costs, formData?.etc_costs, isReadOnly]);

    const renderTable = (key) => {
        if (!visibleSections[key]) return null;
        const config = FIELD_MAPS[key]; const allRows = formData?.[key] || [];
        const isCollapsed = collapsedSections[key]; const widths = columnWidths[key] || {};

        const todayRows = allRows.filter(r => parseNumber(r.count) > 0 || parseNumber(r.total) > 0 || r.isNew);
        const pastRows = allRows.filter(r => parseNumber(r.count) === 0 && parseNumber(r.total) === 0 && !r.isNew);
        const isExpanded = expandedSections[key];
        const displayRows = isExpanded ? [...todayRows, ...pastRows] : todayRows;

        const colSpanTotal = config.fields.length + (isReadOnly ? 0 : 1);

        return (
            <div key={key} className="break-inside-avoid w-full bg-white font-black border-b border-slate-400 last:border-b-0">
                <table className="min-w-full text-[9px] border-collapse" style={{ tableLayout: 'fixed' }}>
                    <thead className="font-sans">
                        <tr className="bg-yellow-50 border-b border-slate-400 h-8 cursor-pointer hover:bg-yellow-100 transition-colors" onClick={() => toggleSection(key)}>
                            <th colSpan={colSpanTotal} className="p-0 text-left align-middle relative">
                                <div className="flex justify-between items-center w-full h-full px-2">
                                    <div className="flex items-center gap-1 font-black"><span className="text-[10px] uppercase">▣ {config.title} ({allRows.length})</span></div>
                                    <div className="flex items-center gap-2">
                                        {!isReadOnly && (
                                            <button 
                                                onClick={(e)=>{ 
                                                    e.stopPropagation(); 
                                                    e.preventDefault();
                                                    setFormData(p=>({
                                                        ...p, 
                                                        [key]: [{id:uuidv4(), isNew: true, ...config.fields.reduce((a,f)=>({...a,[f]:''}),{})}, ...(p[key]||[])]
                                                    }));
                                                }} 
                                                className="bg-white border border-slate-400 px-2 py-0.5 text-[9.5px] font-black shadow-sm rounded-none hover:bg-slate-50 transition-all leading-none"
                                            >
                                                + 추가
                                            </button>
                                        )}
                                        <div className="text-slate-500">{isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</div>
                                    </div>
                                </div>
                            </th>
                        </tr>
                        {!isCollapsed && (
                            <tr className="bg-slate-50 border-b border-slate-400 h-8">
                                {config.labels.map((l, idx) => (
                                    <th key={l} className={`p-1 uppercase whitespace-nowrap relative align-middle ${idx !== config.labels.length - 1 || !isReadOnly ? 'border-r border-slate-300' : ''}`} style={{ width: widths[idx] ? `${widths[idx]}px` : 'auto' }}>
                                        {l}
                                        {!isReadOnly && <div onMouseDown={(e) => onResizeStart(key, idx, e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 bg-transparent z-10" />}
                                    </th>
                                ))}
                                {!isReadOnly && <th className="w-6 p-0 border-slate-300 align-middle"></th>}
                            </tr>
                        )}
                    </thead>
                    {!isCollapsed && (
                        <tbody>
                            {displayRows.map((row, i) => (
                                <tr key={row.id || i} className="border-b border-slate-200 hover:bg-slate-50 h-8">
                                    {config.fields.map((f, idx) => {
                                        const isNumeric = ['total','price','accum','count','prev_count', 'design_count'].includes(f);
                                        const fieldId = `${key}-${i}-${f}`;
                                        return (
                                            <td key={f} className={`p-0 font-sans relative overflow-hidden align-middle ${idx !== config.fields.length - 1 || !isReadOnly ? 'border-r border-slate-200' : ''}`} style={{ width: widths[idx] ? `${widths[idx]}px` : 'auto' }}>
                                                <input className={`w-full h-full outline-none bg-transparent font-sans font-black rounded-none text-[8.5px] ${isNumeric ? 'text-right pr-2' : 'text-center px-1'}`}
                                                    value={isNumeric && focusedField !== fieldId ? formatNumber(row[f]) : (isNumeric && (row[f] === "0" || row[f] === 0) ? "" : row[f])}
                                                    readOnly={isReadOnly} onFocus={() => isNumeric && setFocusedField(fieldId)} onBlur={() => setFocusedField(null)}
                                                    onChange={e => {
                                                        if (isReadOnly) return;
                                                        const updated = [...allRows]; 
                                                        const rIdx = allRows.findIndex(x => x === row || x.id === row.id);
                                                        const val = isNumeric ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value;
                                                        updated[rIdx][f] = val;
                                                        if (isNumeric) {
                                                            if (f === 'count' || f === 'prev_count') updated[rIdx].accum = (parseNumber(updated[rIdx].prev_count || 0) + parseNumber(updated[rIdx].count || 0)).toString();
                                                            if (f === 'price' || f === 'count') updated[rIdx].total = (parseNumber(updated[rIdx].price) * parseNumber(updated[rIdx].count)).toString();
                                                        }
                                                        setFormData({...formData, [key]: updated});
                                                    }} 
                                                />
                                            </td>
                                        );
                                    })}
                                    {!isReadOnly && <td className="text-center text-red-500 cursor-pointer p-0 text-xs font-black align-middle" onClick={()=>setFormData(p=>({...p, [key]: allRows.filter(x=>x !== row && x.id !== row.id)}))}>×</td>}
                                </tr>
                            ))}
                            {pastRows.length > 0 && (
                                <tr className="h-8">
                                    <td colSpan={colSpanTotal} className="bg-slate-50/50 p-0 text-center border-b border-slate-200 align-middle">
                                        {isExpanded ? (
                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedSections(p=>({...p, [key]: false})); }} className="text-[10px] text-red-500 font-black hover:bg-red-50 flex items-center justify-center gap-1 w-full h-full transition-all">
                                                <ListMinus size={13} /> 전일 내역 접어놓기
                                            </button>
                                        ) : (
                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedSections(p=>({...p, [key]: true})); }} className="text-[10px] text-blue-600 font-black hover:bg-blue-50 flex items-center justify-center gap-1 w-full h-full transition-all">
                                                <ListFilter size={13} /> 전일 내역 {pastRows.length}건 펼쳐보기 (오늘 작업 우선 표시됨)
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                            <tr className="bg-slate-50 font-black text-blue-800 h-8">
                                <td className="text-center p-0 align-middle font-sans whitespace-nowrap border-r border-slate-200">합계</td>
                                {config.fields.slice(1).map((f, idx) => (
                                    <td key={idx} className={`text-right pr-2 align-middle font-sans text-[8.5px] ${idx !== config.fields.slice(1).length - 1 || !isReadOnly ? 'border-r border-slate-200' : ''}`} style={{ width: widths[idx+1] ? `${widths[idx+1]}px` : 'auto' }}>
                                        {config.sums.includes(f) ? formatNumber(allRows.reduce((acc, cur) => acc + parseNumber(cur[f]), 0)) : ''}
                                    </td>
                                ))}
                                {!isReadOnly && <td></td>}
                            </tr>
                        </tbody>
                    )}
                </table>
            </div>
        );
    };

    if (!formData) return null;
    const sTotals = formData.settlement_costs.reduce((acc, curr) => ({ prev: acc.prev + parseNumber(curr.prev), today: acc.today + parseNumber(curr.today), total: acc.total + parseNumber(curr.total) }), { prev: 0, today: 0, total: 0 });
    const contractAmt = parseNumber(formData?.total_contract_amount);
    const spendRate = contractAmt > 0 ? ((sTotals.total / contractAmt) * 100).toFixed(2) : "0.00";

    return (
        <div className="h-screen bg-white font-bold font-sans flex flex-col overflow-hidden rounded-none">
            {selectedImage && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-5xl w-full">
                        <img src={selectedImage} className="w-full h-auto max-h-[90vh] object-contain border-4 border-white shadow-2xl" alt="확대사진" />
                        <button className="absolute -top-10 right-0 text-white flex items-center gap-2 font-black font-sans"><X size={30} /> 닫기</button>
                    </div>
                </div>
            )}
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 font-sans">
                    <div className="bg-white p-8 max-w-sm w-full font-black border-4 border-slate-900 shadow-2xl">
                        <h3 className="text-xl mb-4 uppercase">데이터 불러오기</h3>
                        <input type="date" className="w-full p-3 border mb-4 font-black outline-none" onChange={e=>setImportDate(e.target.value)} />
                        <div className="flex gap-2"><button onClick={()=>setIsImportModalOpen(false)} className="flex-1 py-3 bg-slate-100 font-black">취소</button><button onClick={executeImport} className="flex-1 py-3 bg-black text-white font-black">불러오기</button></div>
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-center p-3 border-b border-slate-200 bg-white shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-slate-600 font-black flex items-center gap-2 hover:bg-slate-50 p-2 transition-all"><ArrowLeft size={18}/> 현장목록</button>
                    {!isReadOnly && (
                        <div className="flex flex-col gap-1 border-l pl-4 border-slate-200">
                            <div className="flex gap-1 font-sans items-center">
                                <div className="flex items-center gap-1 mr-2 text-slate-400 font-black"><MousePointerClick size={12} /><span className="text-[9px]">항목 켜기/끄기:</span></div>
                                {Object.entries(FIELD_MAPS).map(([key, config]) => (
                                    <button key={key} onClick={() => setVisibleSections(p => ({...p, [key]: !visibleSections[key]}))} className={`px-2.5 py-1.5 text-[9px] transition-all font-black border ${visibleSections[key] ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-300 border border-slate-100 hover:border-slate-300'}`}>{config.title.split('(')[0]}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 mr-4 border border-slate-200 font-sans">
                        <ZoomOut size={12} className="cursor-pointer" onClick={() => setZoomLevel(Math.max(0.4, zoomLevel - 0.05))}/>
                        <input type="range" min="0.4" max="1.5" step="0.05" value={zoomLevel} onChange={(e)=>setZoomLevel(parseFloat(e.target.value))} className="w-24 accent-slate-900" />
                        <ZoomIn size={12} className="cursor-pointer" onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.05))}/>
                        <span className="text-[10px] w-8 text-center font-black">{Math.round(zoomLevel * 100)}%</span>
                    </div>
                    {isReadOnly ? (
                        <div className="flex gap-2">
                            <button onClick={handleDelete} className="bg-red-50 text-red-600 border border-red-200 px-6 py-2 font-black text-[11px] hover:bg-red-100 flex items-center gap-2 transition-all"><Trash2 size={14}/> 삭제</button>
                            <button onClick={() => setView('write')} className="bg-slate-900 text-white px-8 py-2 font-black text-[11px] shadow-sm flex items-center gap-2 hover:bg-slate-800 transition-all"><Edit3 size={14}/> 정보 수정</button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                             <button onClick={handleReset} className="bg-white text-slate-900 border border-slate-900 px-5 py-2 font-black text-[11px] shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-all"><RotateCcw size={14}/> 되돌리기</button>
                             <button onClick={() => setIsImportModalOpen(true)} className="bg-amber-500 text-white px-5 py-2 font-black text-[11px] shadow-sm hover:bg-amber-600 flex items-center gap-2 transition-all"><RefreshCw size={14}/> 불러오기</button>
                             <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-8 py-2 font-black text-[11px] shadow-sm hover:bg-blue-700 transition-all flex items-center gap-2">{isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} 일보 저장</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#F8FAFC] p-4">
                <div style={{ zoom: zoomLevel }} className="pb-40 flex flex-col items-center mx-auto w-full max-w-[1600px]">
                    
                    {!isReadOnly && (
                        <div className="w-full bg-blue-50 border border-blue-200 p-3 mb-4 shadow-sm font-sans flex flex-col justify-center text-blue-900">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle size={16} className="text-blue-700"/>
                                <span className="font-black text-xs uppercase tracking-wide">일보 작성 및 출력 가이드</span>
                            </div>
                            <p className="text-[10.5px] font-bold ml-6 leading-relaxed">
                                1. 내용이 가려질 경우, <strong>표의 각 제목(헤더) 사이 경계선</strong>에 마우스를 올린 후 좌우로 드래그하여 엑셀처럼 열 너비를 조절할 수 있습니다.<br/>
                                2. 금일 작성하는 데이터는 확인이 편하도록 <strong>자동으로 표의 최상단</strong>에 나타나며, 과거 내역은 표 하단의 버튼을 눌러 펼쳐볼 수 있습니다.
                            </p>
                        </div>
                    )}

                    <div className="w-full bg-white border border-slate-400 shadow-sm font-sans flex flex-col">
                        
                        <div className="grid grid-cols-12 border-b border-slate-400 items-stretch">
                            <div className="col-span-8 flex flex-col justify-between p-6 border-r border-slate-400">
                                <h1 className="text-5xl font-black uppercase tracking-[1em] text-left mt-2 mb-6 font-sans">작 업 일 보</h1>
                                <div className="flex gap-2 flex-wrap items-end font-sans">
                                    <div className="flex border border-slate-400 text-[9px] font-black h-8 items-center px-3 bg-slate-50 uppercase">총 도급액: {formatNumber(formData?.total_contract_amount)}원</div>
                                    <div className="flex border border-slate-400 text-[9px] font-black h-8 items-center px-3 text-blue-700">금일 사용: {formatNumber(sTotals.today)}원</div>
                                    <div className="flex border border-slate-400 text-[11px] bg-red-50 font-black h-8 items-center px-4 text-red-600">누적 집행: {formatNumber(sTotals.total)}원 ({spendRate}%)</div>
                                    {(siteData?.is_plant_active || siteData?.is_facility_active) && (
                                        <div className="flex border border-slate-400 text-[11px] bg-blue-50 font-black h-8 items-center px-4 text-blue-800 gap-4">
                                            {siteData?.is_plant_active && <span>식재 공정률: {(parseNumber(formData?.progress_plant_prev) + parseNumber(formData?.progress_plant)).toFixed(4)}%</span>}
                                            {siteData?.is_plant_active && siteData?.is_facility_active && <div className="w-[1px] h-4 bg-blue-200" />}
                                            {siteData?.is_facility_active && <span>시설 공정률: {(parseNumber(formData?.progress_facility_prev) + parseNumber(formData?.progress_facility)).toFixed(4)}%</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="col-span-4 flex flex-col bg-white">
                                <table className="w-full text-[9px] border-collapse font-black h-full" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '35%' }} />
                                        <col style={{ width: '20%' }} />
                                        <col style={{ width: '20%' }} />
                                    </colgroup>
                                    <tbody>
                                        <tr className="border-b border-slate-400 h-8">
                                            <th className="bg-slate-50 border-r border-slate-400 font-black text-center">현장명</th>
                                            <td className="px-2 overflow-hidden whitespace-nowrap border-r border-slate-400 text-center">{siteData?.name}</td>
                                            <th className="bg-slate-50 border-r border-slate-400 font-black text-center">작업 일시</th>
                                            <td className="px-1 text-center">
                                                <input type="date" className="w-full outline-none bg-transparent text-center font-black" value={formData?.report_date || ''} readOnly={isReadOnly} onChange={e=>setFormData({...formData, report_date: e.target.value})} />
                                            </td>
                                        </tr>
                                        {['plant', 'facility'].map((k, i) => {
                                            const isActive = k === 'plant' ? siteData?.is_plant_active : siteData?.is_facility_active;
                                            if (!isActive) return null; 
                                            const fieldId = `progress-${k}`;
                                            const displayVal = focusedField === fieldId ? formData?.[`progress_${k}`] : (parseNumber(formData?.[`progress_${k}`]) === 0 ? "" : formData?.[`progress_${k}`]);
                                            const isLastActive = (k === 'facility') || (k === 'plant' && !siteData?.is_facility_active);

                                            return (
                                                <tr key={k} className={`h-10 bg-blue-50 ${!isLastActive ? 'border-b border-slate-400' : ''}`}>
                                                    <th className="bg-blue-50 border-r border-slate-400 uppercase text-[8px] font-black text-center">
                                                        {k==='plant'?'식재공정':'시설공정'}
                                                    </th>
                                                    <td className="bg-white border-r border-slate-400 text-center leading-tight">
                                                        <div className="flex flex-col items-center justify-center h-full">
                                                            <span className="text-[6px] text-slate-400 font-sans">전일</span>
                                                            <span className="text-[11px] font-black">{formData?.[`progress_${k}_prev`] === '0.0000' ? '-' : formData?.[`progress_${k}_prev`]}</span>
                                                        </div>
                                                    </td>
                                                    <td colSpan={2} className="bg-blue-50/30 text-center leading-tight p-0">
                                                        <div className="flex flex-col items-center justify-center h-full w-full">
                                                            <span className="text-[6px] text-blue-400 font-black">금일(입력)</span>
                                                            <input className="w-full text-center text-[12px] text-blue-700 outline-none font-black bg-transparent" value={displayVal} readOnly={isReadOnly} onFocus={() => setFocusedField(fieldId)} onBlur={() => setFocusedField(null)} onChange={e=>setFormData({...formData, [`progress_${k}`]: e.target.value.replace(/[^0-9.]/g, '')})} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 border-b border-slate-400 items-stretch">
                            <div className="col-span-8 grid grid-cols-2 border-r border-slate-400 min-h-[220px] bg-slate-50">
                                <div className="border-r border-slate-400 flex flex-col"><div className="bg-slate-50 p-1.5 text-center border-b border-slate-400 text-[10px] tracking-widest uppercase font-black">전일 작업 요약</div><textarea className="w-full flex-1 p-4 text-[13px] outline-none font-bold resize-none bg-transparent text-center leading-relaxed" value={formData?.prev_work} readOnly /></div>
                                <div className="flex flex-col"><div className="bg-slate-50 p-1.5 text-center border-b border-slate-400 text-[10px] tracking-widest uppercase font-black">금일 작업 요약</div><textarea className="w-full flex-1 p-4 text-[13px] outline-none font-bold resize-none bg-transparent text-center leading-relaxed" value={formData?.today_work} readOnly={isReadOnly} onChange={e=>setFormData({...formData, today_work: e.target.value})} /></div>
                            </div>
                            
                            <div className="col-span-4 bg-white">
                                <div className="bg-slate-800 text-white p-1.5 text-center text-[10px] uppercase font-black">실시간 정산 내역 합계</div>
                                <table className="w-full text-[9px] border-collapse h-[calc(100%-25px)]" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '35%' }} />
                                        <col style={{ width: '20%' }} />
                                        <col style={{ width: '20%' }} />
                                    </colgroup>
                                    <thead className="bg-slate-50 border-b border-slate-400 font-bold">
                                        <tr className="h-8">
                                            <th className="border-r border-slate-400 text-center uppercase whitespace-nowrap">항목</th>
                                            <th className="border-r border-slate-400 text-center uppercase whitespace-nowrap">전일</th>
                                            <th className="border-r border-slate-400 text-center text-blue-600 font-bold uppercase whitespace-nowrap">금일</th>
                                            <th className="text-center text-red-600 uppercase font-bold whitespace-nowrap">누계</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-black">
                                        {(formData?.settlement_costs || []).map((row, idx) => (
                                            <tr key={idx} className="border-b border-slate-200">
                                                <td className="bg-slate-50 border-r border-slate-200 text-center p-0.5 whitespace-nowrap">{row.item}</td>
                                                <td className="text-right px-2 border-r border-slate-200 whitespace-nowrap">{formatNumber(row.prev)}</td>
                                                <td className="text-right px-2 text-blue-700 border-r border-slate-200 font-black whitespace-nowrap">{formatNumber(row.today)}</td>
                                                <td className="text-right px-2 text-red-600 font-bold whitespace-nowrap">{formatNumber(row.total)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100 font-black text-blue-800">
                                            <td className="text-center p-1 border-r border-slate-200 whitespace-nowrap">총 합계</td>
                                            <td className="text-right px-2 border-r border-slate-200 whitespace-nowrap">{formatNumber(sTotals.prev)}</td>
                                            <td className="text-right px-2 text-blue-800 border-r border-slate-200 font-black">{formatNumber(sTotals.today)}</td>
                                            <td className="text-right px-2 text-red-800 font-black">{formatNumber(sTotals.total)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-start border-b border-slate-400">
                            <div className="flex flex-col border-r border-slate-400 h-full">
                                {renderTable('labor_costs')}
                                {renderTable('tree_costs')}
                            </div>
                            <div className="flex flex-col border-r border-slate-400 h-full">
                                {renderTable('material_costs')}
                                {renderTable('transport_costs')}
                                {renderTable('subcontract_costs')}
                            </div>
                            <div className="flex flex-col h-full">
                                {renderTable('equipment_costs')}
                                {renderTable('etc_costs')}
                            </div>
                        </div>

                        <div className="p-6 bg-white">
                            <h4 className="text-lg font-black flex items-center gap-3 font-sans mb-4"><ImageIcon size={24} className="text-slate-900"/> 시공 사진 대지</h4>
                            <div className="grid grid-cols-4 gap-4 font-black">
                                {Array.from({ length: maxPhotoRows }).map((_, idx) => (
                                    <div key={idx} className="grid grid-cols-2 gap-2 h-[260px] bg-white relative group">
                                        {!isReadOnly && <button onClick={() => handleRemovePhotoRow(idx)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700" title="행 삭제"><Trash2 size={14} /></button>}
                                        {['tomorrow', 'today'].map(type => {
                                            const photo = (type === 'today' ? todayPhotos : tomorrowPhotos)[idx];
                                            const imgSrc = photo?.preview || photo?.url;
                                            return (
                                                <div key={type} className="flex flex-col gap-2 h-full">
                                                    <div className={`text-[8px] text-center font-black py-1.5 font-sans ${type==='today'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-400'}`}>{type==='today'?'금일 현황':'전일 현황'}</div>
                                                    <div className="flex-1 bg-slate-50 border border-slate-300 flex items-center justify-center cursor-zoom-in overflow-hidden relative shadow-inner" onClick={() => imgSrc && setSelectedImage(imgSrc)}>
                                                        {imgSrc ? <img src={imgSrc} className="w-full h-full object-cover" alt="사진" /> : <Camera size={28} className="opacity-10" />}
                                                        {!isReadOnly && <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handlePhotoUpload(e, type, idx)} />}
                                                    </div>
                                                    <input className="border-b border-slate-300 p-1 text-[10px] text-center bg-transparent font-black font-sans focus:border-slate-900 outline-none transition-all" placeholder="기록 입력" value={photo?.description || ''} readOnly={isReadOnly} onChange={e => { const n = (type === 'today' ? [...todayPhotos] : [...tomorrowPhotos]); if(!n[idx]) n[idx]={id:uuidv4()}; n[idx].description = e.target.value; (type === 'today' ? setTodayPhotos : setTomorrowPhotos)(n); }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                            {!isReadOnly && <div className="flex justify-center mt-6"><button onClick={() => { setTodayPhotos([...todayPhotos, {id:uuidv4()}]); setTomorrowPhotos([...tomorrowPhotos, {id:uuidv4()}]); }} className="flex items-center gap-2 px-6 py-1.5 bg-slate-900 text-white font-black text-[9px] hover:bg-blue-600 transition-all shadow-md font-sans"><Plus size={12} strokeWidth={3}/> 사진 대지 행 추가</button></div>}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}