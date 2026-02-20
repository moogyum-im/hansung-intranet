'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { v4 as uuidv4 } from 'uuid';
import { 
  Save, ArrowLeft, Camera, Loader2, X, RefreshCw, ChevronRight, Edit3, Check, 
  Layers, FileSpreadsheet, Info, Wallet, TrendingUp, Activity, ArrowUp, ArrowDown, Trash2, Calendar
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
// 🚀 [수정] 아래 toast 임포트가 누락되어 에러가 발생했습니다.
import { toast } from 'react-hot-toast';

// 숫자 포맷 함수
const formatNumber = (num) => {
    if (num === null || num === undefined || num === "" || isNaN(num)) return "0";
    const value = Math.round(Number(num.toString().replace(/,/g, ''))).toString();
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// 소수점 입력을 허용하는 포맷 함수
const formatDecimal = (num) => {
    if (num === null || num === undefined || num === "") return "";
    const str = num.toString();
    if (str.endsWith('.')) return str;
    return str; 
};

const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const cleaned = str.toString().replace(/,/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
};

export default function DailyReportSection({ siteId }) {
    const { employee: currentUser } = useEmployee();
    
    const [view, setView] = useState('list');
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [reports, setReports] = useState([]);
    const [siteData, setSiteData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [importDate, setImportDate] = useState("");
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importOptions, setImportOptions] = useState({ 
        labor: true, manager: true, equipment: true, tree: true, material: true, settlement: true, work_summary: true, progress: true,
        transport: true, subcontract: true, etc: true
    });

    const FIELD_MAPS = {
        labor_costs: { fields: ['name', 'type', 'price', 'prev_count', 'count', 'accum', 'total'], labels: ['성명', '직종', '노무비단가', '전일누계', '금일공수', '전체누계', '금액'], title: '현장출력현황' },
        manager_info: { fields: ['name', 'rank', 'prev_count', 'today_count', 'accum_count', 'task'], labels: ['성명', '직급', '전일누계', '금일일수', '전체누계', '업무'], title: '현장관리자' },
        tree_costs: { fields: ['item', 'spec', 'price', 'prev_count', 'count', 'accum', 'vendor', 'total'], labels: ['품명', '규격', '단가', '전일누계', '금일수량', '전체누계', '거래처', '금액'], title: '수목반입현황' },
        material_costs: { fields: ['item', 'spec', 'price', 'prev_count', 'count', 'accum', 'vendor', 'total'], labels: ['품명', '규격', '단가', '전일누계', '금일수량', '전체누계', '거래처', '금액'], title: '주요자재반입현황' },
        equipment_costs: { fields: ['item', 'type', 'price', 'prev_count', 'count', 'accum', 'total'], labels: ['품명', '투입공종', '단가', '전일누계', '금일', '출력누계', '금액'], title: '장비사용현황' },
        transport_costs: { fields: ['item', 'spec', 'count', 'price', 'vendor', 'total'], labels: ['품명', '규격', '수량', '단가', '거래처', '금액'], title: '운반비투입현황' },
        subcontract_costs: { fields: ['item', 'spec', 'price', 'count', 'vendor', 'total'], labels: ['품명', '규격', '단가', '수량', '거래처', '금액'], title: '자재납품 및 시공(외주)' },
        etc_costs: { fields: ['category', 'content', 'usage', 'total'], labels: ['계정', '내용', '사용처', '금액'], title: '기타경비' }
    };

    const initialState = {
        report_date: new Date().toISOString().split('T')[0],
        weather: '맑음', prev_work: '', today_work: '',
        progress_plant: '0.0000', progress_facility: '0.0000',
        progress_plant_prev: '0.0000', progress_facility_prev: '0.0000',
        labor_costs: [], manager_info: [], tree_costs: [], material_costs: [], equipment_costs: [], transport_costs: [], subcontract_costs: [], etc_costs: [],
        settlement_costs: [
            { item: '수목', today: 0, prev: 0, total: 0 },
            { item: '자재납품 및 시공(외주)', today: 0, prev: 0, total: 0 },
            { item: '자재비', today: 0, prev: 0, total: 0 },
            { item: '장비대', today: 0, prev: 0, total: 0 },
            { item: '노무비', today: 0, prev: 0, total: 0 },
            { item: '운반비', today: 0, prev: 0, total: 0 },
            { item: '기타경비', today: 0, prev: 0, total: 0 }
        ]
    };

    const [todayPhotos, setTodayPhotos] = useState([]);
    const [tomorrowPhotos, setTomorrowPhotos] = useState([]);
    const maxPhotoRows = Math.max(todayPhotos.length, tomorrowPhotos.length, 1);

    useEffect(() => {
        const savedView = sessionStorage.getItem(`daily_v_${siteId}`);
        const savedData = sessionStorage.getItem(`daily_d_${siteId}`);
        const savedId = sessionStorage.getItem(`daily_i_${siteId}`);
        const savedEdit = sessionStorage.getItem(`daily_e_${siteId}`);
        const savedTp = sessionStorage.getItem(`daily_tp_${siteId}`);
        const savedTmp = sessionStorage.getItem(`daily_tmp_${siteId}`);
        if (savedView) setView(savedView);
        if (savedId) setSelectedId(savedId);
        if (savedEdit) setIsEditMode(savedEdit === 'true');
        if (savedData) setFormData(JSON.parse(savedData));
        else setFormData(initialState);
        if (savedTp) setTodayPhotos(JSON.parse(savedTp));
        if (savedTmp) setTomorrowPhotos(JSON.parse(savedTmp));
    }, [siteId]);

    useEffect(() => {
        if (formData) {
            sessionStorage.setItem(`daily_v_${siteId}`, view);
            sessionStorage.setItem(`daily_d_${siteId}`, JSON.stringify(formData));
            sessionStorage.setItem(`daily_e_${siteId}`, isEditMode);
            if (selectedId) sessionStorage.setItem(`daily_i_${siteId}`, selectedId);
            sessionStorage.setItem(`daily_tp_${siteId}`, JSON.stringify(todayPhotos));
            sessionStorage.setItem(`daily_tmp_${siteId}`, JSON.stringify(tomorrowPhotos));
        }
    }, [view, formData, selectedId, isEditMode, todayPhotos, tomorrowPhotos, siteId]);

    const budgetSummary = useMemo(() => {
        if (!formData || !formData.settlement_costs) return { totalBudget: 0, todayTotal: 0, accumTotal: 0, percent: "0.0" };
        const totalBudget = Number(siteData?.budget || 0);
        const todayTotal = formData.settlement_costs.reduce((acc, cur) => acc + parseNumber(cur.today), 0);
        const accumTotal = formData.settlement_costs.reduce((acc, cur) => acc + parseNumber(cur.total), 0);
        const percent = totalBudget > 0 ? ((accumTotal / totalBudget) * 100).toFixed(1) : "0.0";
        return { totalBudget, todayTotal, accumTotal, percent };
    }, [siteData, formData?.settlement_costs]);

    const fetchAllData = useCallback(async () => {
        const { data: site } = await supabase.from('construction_sites').select('*').eq('id', siteId).single();
        if (site) setSiteData(site);
        const { data: reports } = await supabase.from('daily_site_reports').select(`*, profiles(full_name)`).eq('site_id', siteId).order('report_date', { ascending: false });
        if (reports) setReports(reports);
    }, [siteId]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const executeImport = async () => {
        if (!importDate) return alert("데이터를 가져올 날짜를 선택해주세요.");
        const { data } = await supabase.from('daily_site_reports').select('notes').eq('site_id', siteId).eq('report_date', importDate).limit(1);
        if (!data?.[0]) return alert('해당 날짜에 작성된 일보가 없습니다.');
        
        const prev = JSON.parse(data[0].notes);
        
        setFormData(curr => {
            const next = { ...curr };
            if (importOptions.work_summary) next.prev_work = prev.today_work || "";
            if (importOptions.progress) {
                next.progress_plant_prev = (parseNumber(prev.progress_plant_prev) + parseNumber(prev.progress_plant)).toFixed(4);
                next.progress_facility_prev = (parseNumber(prev.progress_facility_prev) + parseNumber(prev.progress_facility)).toFixed(4);
            }
            
            const sections = [
                { key: 'labor_costs', opt: 'labor' },
                { key: 'manager_info', opt: 'manager' },
                { key: 'equipment_costs', opt: 'equipment' },
                { key: 'tree_costs', opt: 'tree' },
                { key: 'material_costs', opt: 'material' },
                { key: 'transport_costs', opt: 'transport' },
                { key: 'subcontract_costs', opt: 'subcontract' },
                { key: 'etc_costs', opt: 'etc' }
            ];

            sections.forEach(({ key, opt }) => {
                if (importOptions[opt] && prev[key]) {
                    next[key] = prev[key].map(r => {
                        const base = { ...r };
                        if (key === 'manager_info') {
                            base.prev_count = (parseNumber(r.prev_count) + parseNumber(r.today_count)).toString();
                            base.today_count = '';
                            base.accum_count = base.prev_count;
                        } else if (key === 'etc_costs') {
                            base.total = 0;
                        } else {
                            base.prev_count = (parseNumber(r.prev_count) + parseNumber(r.count)).toString();
                            base.count = '';
                            base.accum = base.prev_count;
                            base.total = 0;
                        }
                        return base;
                    });
                }
            });

            if (importOptions.settlement && prev.settlement_costs) {
                next.settlement_costs = curr.settlement_costs.map(s => {
                    const pSett = prev.settlement_costs.find(p => p.item === s.item);
                    return {
                        ...s,
                        prev: pSett ? parseNumber(pSett.total) : 0,
                        today: 0,
                        total: pSett ? parseNumber(pSett.total) : 0
                    };
                });
            }
            return next;
        });
        
        setIsImportModalOpen(false);
        // 🚀 [수정] toast가 정상 임포트되어 이제 에러가 나지 않습니다.
        toast.success("데이터를 불러왔습니다.");
    };

    const handlePhotoUpload = async (e, type, idx) => {
        const file = e.target.files[0];
        if (!file) return;
        const preview = URL.createObjectURL(file);
        const newPhoto = { id: uuidv4(), file, preview, timeType: type, description: '' };
        if (type === 'today') {
            const next = [...todayPhotos];
            next[idx] = newPhoto;
            setTodayPhotos(next);
        } else {
            const next = [...tomorrowPhotos];
            next[idx] = newPhoto;
            setTomorrowPhotos(next);
        }
    };

    const handlePaste = (e, section, startRowIdx, startColIdx) => {
        if (!isEditMode) return;
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const rows = text.split(/\r\n|\n/);
        const config = FIELD_MAPS[section];
        const newData = [...formData[section]];
        rows.forEach((rowText, rOffset) => {
            const targetRowIdx = startRowIdx + rOffset;
            if (rowText.trim() === "" && rOffset === rows.length - 1) return;
            if (!newData[targetRowIdx]) newData[targetRowIdx] = config.fields.reduce((a, f) => ({ ...a, [f]: '' }), {});
            const cells = rowText.split('\t');
            cells.forEach((cellValue, cOffset) => {
                const targetColIdx = startColIdx + cOffset;
                const fieldName = config.fields[targetColIdx];
                if (fieldName) newData[targetRowIdx][fieldName] = cellValue.trim().replace(/,/g, '');
            });
        });
        setFormData(prev => ({ ...prev, [section]: newData }));
    };

    const moveRow = (section, index, direction) => {
        const newData = [...formData[section]];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newData.length) return;
        [newData[index], newData[targetIndex]] = [newData[targetIndex], newData[index]];
        setFormData(prev => ({ ...prev, [section]: newData }));
    };

    useEffect(() => {
        if (!formData) return;
        const getSum = (key) => (formData[key] || []).reduce((acc, cur) => acc + parseNumber(cur.total), 0);
        const sums = { '노무비': getSum('labor_costs'), '수목': getSum('tree_costs'), '자재비': getSum('material_costs'), '장비대': getSum('equipment_costs'), '운반비': getSum('transport_costs'), '자재납품 및 시공(외주)': getSum('subcontract_costs'), '기타경비': getSum('etc_costs') };
        const isChanged = formData.settlement_costs.some(s => s.today !== (sums[s.item] || 0));
        if (isChanged) {
            setFormData(prev => ({ ...prev, settlement_costs: prev.settlement_costs.map(s => ({ ...s, today: sums[s.item] || 0, total: parseNumber(s.prev) + (sums[s.item] || 0) })) }));
        }
    }, [formData?.labor_costs, formData?.tree_costs, formData?.material_costs, formData?.equipment_costs, formData?.transport_costs, formData?.subcontract_costs, formData?.etc_costs]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const uploaded = await Promise.all([...todayPhotos, ...tomorrowPhotos].map(async (p) => {
                if (!p || p.url) return p;
                if (!p.file) return null;
                const path = `${siteId}/${uuidv4()}.jpg`;
                await supabase.storage.from('daily_reports').upload(path, p.file);
                const { data } = supabase.storage.from('daily_reports').getPublicUrl(path);
                return { id: p.id, url: data.publicUrl, timeType: p.timeType, description: p.description };
            }));
            const payload = { site_id: siteId, report_date: formData.report_date, author_id: currentUser.id, photos: uploaded.filter(v => v), notes: JSON.stringify(formData), content: formData.today_work || '작업일보' };
            await supabase.from('daily_site_reports').upsert(selectedId ? { id: selectedId, ...payload } : payload);
            ['daily_v_', 'daily_d_', 'daily_i_', 'daily_e_'].forEach(k => sessionStorage.removeItem(k + siteId));
            alert('저장되었습니다.'); setIsEditMode(false); setView('list'); fetchAllData();
        } catch (e) { alert(e.message); } finally { setIsSaving(false); }
    };

    const downloadExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('작업일보');
        sheet.columns = [{ width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];
        sheet.mergeCells('A1:H2');
        const title = sheet.getCell('A1');
        title.value = '작 업 일 보';
        title.font = { size: 20, bold: true };
        title.alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.addRow(['공사명', siteData?.name, '', '', '', '일시', formData.report_date, '']);
        sheet.addRow(['날씨', formData.weather, '', '', '', '작성자', currentUser.full_name, '']);
        sheet.addRow(['전일요약', formData.prev_work, '', '', '', '금일요약', formData.today_work, '']);
        for (const [key, config] of Object.entries(FIELD_MAPS)) {
            sheet.addRow([`▣ ${config.title}`]);
            sheet.addRow(config.labels);
            (formData[key] || []).forEach(r => sheet.addRow(config.fields.map(f => r[f])));
            const total = (formData[key] || []).reduce((a, c) => a + parseNumber(c.total || c.accum), 0);
            sheet.addRow(['합계', '', '', '', '', '', total]);
        }
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `${formData.report_date}_${siteData?.name}_작업일보.xlsx`);
    };

    if (!formData) return <div className="p-10 text-center font-black">데이터 로드 중...</div>;

    if (view === 'list') {
        return (
            <div className="max-w-6xl mx-auto py-12 px-6 font-black uppercase tracking-tighter italic-none font-sans">
                <div className="flex justify-between items-end mb-10 border-b-2 border-black pb-6 font-black font-sans">
                    <h2 className="text-4xl font-black font-sans">{siteData?.name || '현장 관리'}</h2>
                    <button onClick={() => { 
                        ['daily_d_', 'daily_i_', 'daily_e_'].forEach(k => sessionStorage.removeItem(k + siteId));
                        setFormData(initialState); setView('write'); setIsEditMode(true); 
                    }} className="px-7 py-3.5 bg-blue-700 text-white rounded-xl shadow-lg hover:bg-blue-800 transition-all font-bold">+ 새 작업일보 작성</button>
                </div>
                <table className="w-full text-left bg-white border-2 border-gray-100 font-black font-sans">
                    <thead className="bg-gray-50 border-b-2 text-[11px] text-gray-400 italic-none"><tr><th className="px-6 py-4">작성일자</th><th className="px-6 py-4 text-center">작성자</th><th className="px-6 py-4 text-right">상세</th></tr></thead>
                    <tbody className="divide-y font-bold text-sm">
                        {reports.map(r => (
                            <tr key={r.id} onClick={() => { 
                                const n = JSON.parse(r.notes); setFormData(n); setSelectedId(r.id); setView('detail'); setIsEditMode(false); 
                                setTodayPhotos(r.photos?.filter(p => p.timeType === 'today') || []); 
                                setTomorrowPhotos(r.photos?.filter(p => p.timeType === 'tomorrow') || []);
                            }} className="hover:bg-blue-50/40 cursor-pointer transition-colors font-sans"><td className="px-6 py-5 font-mono text-blue-700">{r.report_date}</td><td className="px-6 py-5 text-center">{r.profiles?.full_name}</td><td className="px-6 py-5 text-right font-black"><ChevronRight size={18} className="inline text-gray-300 font-black"/></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-black uppercase tracking-tighter relative font-sans italic-none">
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm font-sans">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-black">
                        <div className="bg-blue-700 p-6 text-white flex items-center justify-between font-sans"><div className="flex items-center gap-3"><Layers size={24}/><h3 className="text-xl font-black">데이터 가져오기</h3></div><button onClick={() => setIsImportModalOpen(false)}><X size={24}/></button></div>
                        <div className="p-6 bg-blue-50 border-b border-blue-100 font-sans">
                            <label className="block text-xs font-black text-blue-700 mb-2">데이터를 가져올 날짜 선택</label>
                            <input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 outline-none font-black" />
                        </div>
                        <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto bg-white font-sans">
                            {Object.entries({ labor: '현장출력현황', manager: '현장관리자', equipment: '장비사용현황', tree: '수목반입현황', material: '주요자재반입', transport: '운반비투입', subcontract: '외주 및 시공', etc: '기타경비', settlement: '정산내역 누계', work_summary: '작업 요약', progress: '공정률 현황' }).map(([k, l]) => (
                                <label key={k} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-blue-50 font-sans"><span className="font-bold text-sm">{l}</span><input type="checkbox" checked={importOptions[k]} onChange={() => setImportOptions({...importOptions, [k]: !importOptions[k]})} /></label>
                            ))}
                        </div>
                        <div className="p-6 bg-gray-100 flex gap-3 font-sans"><button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-4 bg-white border rounded-xl font-black font-sans">취소</button><button onClick={executeImport} className="flex-1 py-4 bg-blue-700 text-white rounded-xl font-black font-sans">가져오기</button></div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 no-print font-sans">
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 flex items-center gap-4 shadow-sm italic-none">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-sans"><Wallet size={24}/></div>
                    <div className="font-sans"><p className="text-[10px] text-slate-400 font-black uppercase">총 도급액</p><p className="text-xl font-black text-slate-800 tracking-tight">₩{formatNumber(budgetSummary.totalBudget)}</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 flex items-center gap-4 shadow-sm italic-none font-sans">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 font-sans"><Activity size={24}/></div>
                    <div className="font-sans"><p className="text-[10px] text-slate-400 font-black uppercase">금일 사용금액</p><p className="text-xl font-black text-slate-800 tracking-tight">₩{formatNumber(budgetSummary.todayTotal)}</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 flex items-center gap-4 shadow-sm italic-none font-sans">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-sans"><TrendingUp size={24}/></div>
                    <div className="font-sans"><p className="text-[10px] text-slate-400 font-black uppercase">누적 사용액</p><p className={`text-xl font-black tracking-tight ${Number(budgetSummary.percent) > 100 ? 'text-red-600' : 'text-blue-600'}`}>₩{formatNumber(budgetSummary.accumTotal)} ({budgetSummary.percent}%)</p></div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center no-print font-sans">
                <button onClick={() => setView('list')} className="text-gray-500 font-bold flex items-center gap-1 font-black font-sans"><ArrowLeft size={18}/> 목록으로</button>
                <div className="flex gap-4 font-black font-sans">
                    {isEditMode && (
                        <button onClick={() => setIsImportModalOpen(true)} className="bg-amber-500 text-white px-6 py-2 rounded-lg text-sm font-black flex items-center gap-2 shadow-sm font-sans hover:bg-amber-600 transition-all font-sans"><RefreshCw size={16}/> 전일 데이터 가져오기</button>
                    )}
                    <button onClick={downloadExcel} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-black flex items-center gap-2 shadow-sm font-sans hover:bg-green-700 transition-all font-sans"><FileSpreadsheet size={16}/> 엑셀 저장</button>
                    {!isEditMode ? (
                        <button onClick={() => setIsEditMode(true)} className="bg-white text-blue-600 px-6 py-2 rounded-lg border-2 border-blue-600 font-black font-sans">수정하기</button>
                    ) : (
                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-blue-700 text-white rounded shadow-md flex items-center gap-2 font-black font-sans">{isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 저장</button>
                    )}
                </div>
            </div>

            <div className={`max-w-6xl mx-auto bg-white border border-gray-400 p-8 shadow-sm print-container font-black font-sans ${!isEditMode ? 'pointer-events-none opacity-95' : ''}`}>
                <h1 className="text-4xl font-black text-center underline underline-offset-8 mb-10 tracking-[0.5em] italic-none font-sans">작 업 일 보</h1>
                
                <div className="flex gap-4 mb-8 font-sans">
                    <table className="flex-[1.2] border-collapse border-2 border-black text-sm font-black font-sans">
                        <tbody>
                            <tr className="h-12"><td className="border border-black bg-gray-100 p-2 text-center w-24 font-bold font-sans">공사명</td><td className="border border-black p-3 font-black text-lg font-sans" colSpan="3">{siteData?.name}</td></tr>
                            <tr className="h-12"><td className="border border-black bg-gray-100 p-2 text-center font-bold font-sans">일시</td><td className="border border-black p-2 text-center"><input type="date" className="w-full text-center bg-transparent border-none font-black font-sans" value={formData.report_date} onChange={e => setFormData({...formData, report_date: e.target.value})} /></td><td className="border border-black bg-gray-100 p-2 text-center w-24 font-bold font-sans">날씨</td><td className="border border-black p-2 text-center"><input className="w-full text-center bg-transparent border-none font-black font-sans" value={formData.weather} onChange={e => setFormData({...formData, weather: e.target.value})} /></td></tr>
                        </tbody>
                    </table>
                    <table className="flex-1 border-collapse border-2 border-black text-[11px] font-black font-sans">
                        <thead>
                            <tr className="bg-gray-100 border-b border-black font-sans">
                                <th className="border-r border-black p-1 w-20 font-sans">구분</th>
                                <th className="border-r border-black p-1 font-sans">전일 (%)</th>
                                <th className="border-r border-black p-1 text-blue-700 font-sans">금일 (%)</th>
                                <th className="p-1 text-red-600 font-sans">누계 (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {['plant', 'facility'].map(k => (
                                <tr key={k} className="h-9 border-b border-gray-200 font-sans">
                                    <td className="border-r border-black bg-gray-50 text-center font-bold font-sans">{k === 'plant' ? '식재' : '시설물'}</td>
                                    <td className="border-r border-black font-sans"><input type="number" step="any" className="w-full text-center bg-transparent outline-none font-sans font-black" value={formData[`progress_${k}_prev`]} onChange={e => setFormData({...formData, [`progress_${k}_prev`]: e.target.value})} /></td>
                                    <td className="border-r border-black font-sans"><input type="number" step="any" className="w-full text-center text-blue-700 bg-transparent outline-none font-bold font-sans" value={formData[`progress_${k}`]} onChange={e => setFormData({...formData, [`progress_${k}`]: e.target.value})} /></td>
                                    <td className="text-center font-bold text-red-600 font-sans">
                                        {(parseNumber(formData[`progress_${k}_prev`]) + parseNumber(formData[`progress_${k}`])).toFixed(4)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 border-2 border-black mb-10 h-40 font-black font-sans">
                    <div className="border-r border-black"><div className="bg-blue-50 p-1.5 text-center font-bold border-b border-black text-xs font-sans">전 일 작 업 요 약</div><textarea className="w-full h-32 p-3 text-xs resize-none border-none outline-none font-bold font-sans" value={formData.prev_work} onChange={e => setFormData({...formData, prev_work: e.target.value})} /></div>
                    <div><div className="bg-green-50 p-1.5 text-center font-bold border-b border-black text-xs font-sans">금 일 작 업 요 약</div><textarea className="w-full h-32 p-3 text-xs resize-none border-none outline-none font-bold font-sans" value={formData.today_work} onChange={e => setFormData({...formData, today_work: e.target.value})} /></div>
                </div>

                <div className="space-y-8 mb-10 font-black font-sans">
                    {Object.entries(FIELD_MAPS).map(([key, config]) => (
                        <div key={key} className="border-2 border-black overflow-hidden font-black font-sans">
                            <div className="bg-yellow-100 border-b-2 border-black p-1.5 px-4 flex justify-between items-center font-black font-sans">
                                <span className="text-xs font-black font-sans">▣ {config.title}</span>
                                <button onClick={() => setFormData(p => ({...p, [key]: [...p[key], config.fields.reduce((a,f)=>({...a,[f]:''}),{})]}))} className="text-[10px] bg-white border border-black px-2 py-0.5 rounded shadow-sm font-sans">+ 행추가</button>
                            </div>
                            <table className="w-full text-[11px] border-collapse font-black font-sans">
                                <thead className="bg-gray-50 border-b border-black font-black font-sans">
                                    <tr className="font-black italic-none font-sans">{config.labels.map(l => <th key={l} className="border-r border-black p-1.5 text-center font-sans">{l}</th>)}<th className="w-16 font-sans">순서</th><th className="w-8 font-sans"></th></tr>
                                </thead>
                                <tbody>
                                    {formData[key]?.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-200 h-9 font-black italic-none font-sans">
                                            {config.fields.map((f, colIdx) => (
                                                <td key={f} className={`border-r border-black p-0 font-black font-sans ${f.includes('accum') || f === 'total' || f.includes('prev') ? 'bg-blue-50/20' : ''}`}>
                                                    <input className="w-full h-full border-none p-1 text-right px-3 outline-none bg-transparent font-bold font-sans" 
                                                        value={f === 'total' || f === 'price' ? formatNumber(row[f]) : (['prev_count', 'count', 'accum', 'today_count', 'accum_count'].includes(f) ? formatDecimal(row[f]) : row[f])} 
                                                        onChange={e => {
                                                            const updated = [...formData[key]];
                                                            const val = ['prev_count', 'count', 'accum', 'today_count', 'accum_count'].includes(f) 
                                                                ? e.target.value.replace(/[^0-9.]/g, '') 
                                                                : e.target.value.replace(/,/g, '');
                                                            updated[i][f] = val;
                                                            if (f === 'prev_count' || f === 'count' || f === 'today_count' || f === 'accum_count') {
                                                              updated[i].accum = (parseNumber(updated[i].prev_count || updated[i].accum_count || 0) + parseNumber(updated[i].count || updated[i].today_count || 0)).toString();
                                                              if (key === 'manager_info') updated[i].accum_count = (parseNumber(updated[i].prev_count) + parseNumber(updated[i].today_count)).toString();
                                                              if (updated[i].price) updated[i].total = (parseNumber(updated[i].price) * parseNumber(updated[i].count || updated[i].today_count)).toString();
                                                            }
                                                            setFormData({...formData, [key]: updated});
                                                        }} onPaste={(e) => handlePaste(e, key, i, colIdx)} />
                                                </td>
                                            ))}
                                            <td className="text-center font-black border-r border-black flex items-center justify-center gap-1 h-9 font-sans"><button onClick={() => moveRow(key, i, 'up')} className="hover:text-blue-600"><ArrowUp size={12}/></button><button onClick={() => moveRow(key, i, 'down')} className="hover:text-blue-600"><ArrowDown size={12}/></button></td>
                                            <td className="text-center font-black font-sans"><button onClick={() => setFormData(p => ({...p, [key]: p[key].filter((_, idx) => idx !== i)}))} className="text-red-400 font-sans">×</button></td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 h-10 border-t-2 border-black font-black text-center font-sans italic-none font-sans">
                                        <td className="border-r border-black font-bold font-sans">합 계 (TOTAL)</td>
                                        {config.fields.slice(1).map((f, idx) => {
                                            const isNumeric = ['price', 'count', 'accum', 'total', 'prev_count', 'today_count', 'accum_count'].includes(f);
                                            const sumValue = (formData[key] || []).reduce((acc, cur) => acc + parseNumber(cur[f]), 0);
                                            return <td key={idx} className="text-center border-r border-black font-sans"><span className={f.includes('accum') || f.includes('count') ? 'text-blue-700 font-black font-sans' : ''}>{isNumeric ? (f === 'price' ? "" : (['accum', 'count', 'prev_count', 'accum_count', 'today_count'].includes(f) ? formatDecimal(sumValue) : formatNumber(sumValue))) : ""}</span></td>
                                        })}
                                        <td className="font-black"/><td className="font-black"/>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <div className="border-2 border-black mb-10 overflow-hidden font-black font-sans italic-none">
                    <div className="bg-gray-800 text-white p-2 text-center font-bold text-sm tracking-widest uppercase font-black font-sans font-sans">정 산 내 역</div>
                    <table className="w-full border-collapse text-xs font-black font-sans font-sans">
                        <thead><tr className="bg-gray-100 border-b border-black font-black font-sans"><th className="border-r border-black p-3 w-16 font-sans"></th><th className="border-r border-black p-3 w-48 font-sans">구 분</th><th className="border-r border-black p-3 text-gray-500 font-sans">전 일 누 계</th><th className="border-r border-black p-3 text-blue-700 font-sans">금 일 합 계</th><th className="p-3 text-red-600 font-sans">총 누 계</th></tr></thead>
                        <tbody>
                            {formData.settlement_costs.map((row, idx) => (
                                <tr key={idx} className="border-b border-black last:border-b-0 h-12 font-black font-sans">
                                    <td className="border-r border-black bg-white p-1 text-center font-sans font-sans"><button onClick={() => { const next = formData.settlement_costs.filter((_, i) => i !== idx); setFormData({...formData, settlement_costs: next}); }} className="text-red-500 hover:text-red-700 font-sans font-sans"><Trash2 size={16} className="mx-auto"/></button></td>
                                    <td className="border-r border-black bg-gray-50 p-3 text-center font-bold font-sans font-sans"><input className="w-full text-center outline-none bg-transparent font-bold font-sans" value={row.item} onChange={e => { const next = [...formData.settlement_costs]; next[idx].item = e.target.value; setFormData({...formData, settlement_costs: next}); }} /></td>
                                    <td className="border-r border-black p-3 text-right px-6 font-sans font-sans"><input className="w-full text-right outline-none bg-transparent font-black font-sans" value={formatNumber(row.prev)} onChange={e => {
                                        const next = [...formData.settlement_costs]; next[idx].prev = parseNumber(e.target.value); next[idx].total = next[idx].prev + next[idx].today;
                                        setFormData({...formData, settlement_costs: next});
                                    }} /></td>
                                    <td className="border-r border-black p-3 text-right px-6 bg-blue-50/10 font-bold text-sm font-sans font-sans">{formatNumber(row.today)}</td>
                                    <td className="p-3 text-right px-6 text-red-700 font-bold text-sm font-sans font-sans"><input className="w-full text-right outline-none bg-transparent font-black text-red-700 font-sans" value={formatNumber(row.total)} onChange={e => {
                                        const next = [...formData.settlement_costs]; next[idx].total = parseNumber(e.target.value);
                                        setFormData({...formData, settlement_costs: next});
                                    }} /></td>
                                </tr>
                            ))}
                            <tr className="bg-gray-200 h-14 border-t-2 border-black font-black font-sans">
                                <td colSpan="2" className="border-r border-black text-center font-bold font-sans font-sans">전 체 총 합 계</td>
                                <td className="border-r border-black text-right px-6 font-black font-sans">{formatNumber(formData.settlement_costs.reduce((a,c)=>a+parseNumber(c.prev),0))}</td>
                                <td className="border-r border-black text-right px-6 text-blue-800 font-sans">{formatNumber(formData.settlement_costs.reduce((a,c)=>a+parseNumber(c.today),0))}</td>
                                <td className="text-right px-6 text-red-700 font-black font-sans font-sans">{formatNumber(formData.settlement_costs.reduce((a,c)=>a+parseNumber(c.total),0))}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="border-2 border-black font-black font-sans italic-none">
                    <div className="bg-[#48D1CC] border-b-2 border-black p-2.5 text-center font-black font-sans font-sans">현장 전경 사진 대지</div>
                    <div className="grid grid-cols-2 text-center border-b border-black text-sm bg-gray-50 font-black font-sans font-sans"><div className="border-r border-black py-1.5 font-sans">전 일</div><div className="py-1.5 font-sans">금 일</div></div>
                    {Array.from({ length: maxPhotoRows }).map((_, idx) => (
                        <div key={idx} className="grid grid-cols-2 border-b border-black min-h-[400px] bg-white font-black font-sans relative">
                            {['tomorrow', 'today'].map(type => (
                                <div key={type} className={`p-4 flex flex-col gap-3 relative font-black font-sans ${type === 'tomorrow' ? 'border-r border-black' : ''}`}>
                                    {isEditMode && (
                                        <button onClick={(e) => { e.preventDefault(); if (type === 'today') setTodayPhotos(prev => prev.filter((_, i) => i !== idx)); else setTomorrowPhotos(prev => prev.filter((_, i) => i !== idx)); }} className="absolute top-2 right-2 z-20 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-800 shadow-xl no-print font-sans"><X size={16} /></button>
                                    )}
                                    <label className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden font-black font-sans">
                                        {(type === 'today' ? todayPhotos : tomorrowPhotos)[idx]?.preview || (type === 'today' ? todayPhotos : tomorrowPhotos)[idx]?.url ? (
                                            <img src={(type === 'today' ? todayPhotos : tomorrowPhotos)[idx].preview || (type === 'today' ? todayPhotos : tomorrowPhotos)[idx].url} className="w-full h-full object-contain font-sans" />
                                        ) : <div className="text-center opacity-20 font-black font-sans font-sans"><Camera size={40} className="mx-auto mb-2 font-sans"/><p className="text-xs font-black font-sans">사진 첨부</p></div>}
                                        <input type="file" className="hidden font-sans font-sans" onChange={(e) => handlePhotoUpload(e, type, idx)} />
                                    </label>
                                    <textarea className="border-2 border-black p-2 text-sm font-bold font-black font-sans h-24 resize-none" placeholder="설명 입력 (사진 없이도 입력 가능)" value={(type === 'today' ? todayPhotos : tomorrowPhotos)[idx]?.description || ''} onChange={e => { const n = (type === 'today' ? [...todayPhotos] : [...tomorrowPhotos]); if(!n[idx]) n[idx]={id:uuidv4()}; n[idx].description = e.target.value; (type === 'today' ? setTodayPhotos : setTomorrowPhotos)(n); }} />
                                </div>
                            ))}
                        </div>
                    ))}
                    {isEditMode && <div className="no-print p-3 text-center bg-gray-50 border-t border-black font-black font-sans shadow-sm hover:bg-gray-100 font-sans font-sans"><button onClick={() => { setTodayPhotos([...todayPhotos, {id:uuidv4(), preview:'', description:'', timeType:'today'}]); setTomorrowPhotos([...tomorrowPhotos, {id:uuidv4(), preview:'', description:'', timeType:'tomorrow'}]); }} className="bg-white border-2 border-black px-6 py-2 rounded-xl text-sm font-black font-sans shadow-sm hover:bg-gray-100 font-sans">+ 사진 행 추가 (전일/금일 일괄)</button></div>}
                </div>
            </div>
        </div>
    );
}