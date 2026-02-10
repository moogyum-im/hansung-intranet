'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { v4 as uuidv4 } from 'uuid';
import { Save, ArrowLeft, Camera, Loader2, X, RefreshCw, ChevronRight, Edit3, Check, Layers, FileSpreadsheet, Info } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// 숫자 포맷
const formatNumber = (num) => {
    if (num === null || num === undefined || num === "" || isNaN(num)) return "";
    const value = Math.round(Number(num.toString().replace(/,/g, ''))).toString();
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const formatDecimal = (num) => {
    if (num === null || num === undefined || num === "" || isNaN(num)) return "";
    return Number(num).toFixed(1);
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
    const [isEditMode, setIsEditMode] = useState(false);
    const [reports, setReports] = useState([]);
    const [siteData, setSiteData] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [rowBaseValues, setRowBaseValues] = useState({ labor_costs: {}, manager_info: {}, equipment_costs: {} });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importOptions, setImportOptions] = useState({ 
        labor: true, manager: true, equipment: true, tree: true, material: true, subcontract: true, etc: true, progress: true, settlement: true 
    });

    const FIELD_MAPS = {
        labor_costs: { fields: ['name', 'price', 'count', 'type', 'accum', 'total'], labels: ['성명', '노무비단가', '공수', '직종', '출력누계', '금액'], title: '현장출력현황' },
        manager_info: { fields: ['name', 'rank', 'today_count', 'accum_count', 'task'], labels: ['성명', '직급', '일수', '누계', '업무'], title: '현장관리자' },
        tree_costs: { fields: ['item', 'spec', 'price', 'count', 'vendor', 'total'], labels: ['품명', '규격', '단가', '수량', '거래처', '금액'], title: '수목반입현황' },
        material_costs: { fields: ['item', 'spec', 'price', 'count', 'vendor', 'total'], labels: ['품명', '규격', '단가', '수량', '거래처', '금액'], title: '주요자재반입현황' },
        equipment_costs: { fields: ['item', 'type', 'price', 'count', 'accum', 'total'], labels: ['품명', '투입공종', '단가', '금일', '출력누계', '금액'], title: '장비사용현황' },
        transport_costs: { fields: ['item', 'spec', 'count', 'price', 'vendor', 'total'], labels: ['품명', '규격', '수량', '단가', '거래처', '금액'], title: '운반비투입현황' },
        subcontract_costs: { fields: ['item', 'spec', 'price', 'count', 'vendor', 'total'], labels: ['품명', '규격', '단가', '수량', '거래처', '금액'], title: '자재납품 및 시공(외주)' },
        etc_costs: { fields: ['category', 'content', 'usage', 'total'], labels: ['계정', '내용', '사용처', '금액'], title: '기타경비' }
    };

    const initialState = {
        report_date: new Date().toISOString().split('T')[0],
        weather: '맑음', prev_work: '', today_work: '',
        is_plant_active: true, // 🚀 식재 활성화 여부
        is_facility_active: true, // 🚀 시설물 활성화 여부
        progress_plant: '0.00%', progress_facility: '0.00%',
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

    const [formData, setFormData] = useState(initialState);
    const [todayPhotos, setTodayPhotos] = useState([]);
    const [tomorrowPhotos, setTomorrowPhotos] = useState([]);

    const maxPhotoRows = Math.max(todayPhotos.length, tomorrowPhotos.length, 1);

    const enterEditMode = () => {
        const bases = { labor_costs: {}, manager_info: {}, equipment_costs: {} };
        formData.labor_costs.forEach((r, i) => bases.labor_costs[i] = parseNumber(r.accum) - parseNumber(r.count));
        formData.manager_info.forEach((r, i) => bases.manager_info[i] = parseNumber(r.accum_count) - parseNumber(r.today_count));
        formData.equipment_costs.forEach((r, i) => bases.equipment_costs[i] = parseNumber(r.accum) - parseNumber(r.count));
        setRowBaseValues(bases);
        setIsEditMode(true);
    };

    const handlePaste = (e, section, startRowIdx, startColIdx) => {
        if (!isEditMode) return;
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const rows = text.split(/\r\n|\n/).filter(r => r.trim() !== "");
        const config = FIELD_MAPS[section];
        const newData = [...formData[section]];
        rows.forEach((rowText, rOffset) => {
            const targetRowIdx = startRowIdx + rOffset;
            if (!newData[targetRowIdx]) newData[targetRowIdx] = config.fields.reduce((a, f) => ({ ...a, [f]: '' }), {});
            const cells = rowText.split('\t');
            cells.forEach((cellValue, cOffset) => {
                const targetColIdx = startColIdx + cOffset;
                const fieldName = config.fields[targetColIdx];
                if (fieldName) {
                    let val = cellValue.trim();
                    if (['price', 'count', 'accum', 'total', 'today_count', 'accum_count'].includes(fieldName)) val = val.replace(/,/g, '');
                    newData[targetRowIdx][fieldName] = val;
                    const row = newData[targetRowIdx];
                    if (section === 'labor_costs' && fieldName === 'count') { const base = rowBaseValues.labor_costs[targetRowIdx] || 0; row.accum = (base + parseNumber(val)).toString(); }
                    else if (section === 'manager_info' && fieldName === 'today_count') { const base = rowBaseValues.manager_info[targetRowIdx] || 0; row.accum_count = (base + parseNumber(val)).toString(); }
                    else if (section === 'equipment_costs' && fieldName === 'count') { const base = rowBaseValues.equipment_costs[targetRowIdx] || 0; row.accum = (base + parseNumber(val)).toString(); }
                    if (row.price && row.count) row.total = (parseNumber(row.price) * parseNumber(row.count)).toString();
                }
            });
        });
        setFormData(prev => ({ ...prev, [section]: newData }));
    };

    useEffect(() => {
        const getSum = (key) => (formData[key] || []).reduce((acc, cur) => acc + parseNumber(cur.total), 0);
        const newSettlement = formData.settlement_costs.map(s => {
            let todaySum = 0;
            if (s.item === '노무비') todaySum = getSum('labor_costs');
            else if (s.item === '수목') todaySum = getSum('tree_costs');
            else if (s.item === '자재비') todaySum = getSum('material_costs');
            else if (s.item === '장비대') todaySum = getSum('equipment_costs');
            else if (s.item === '운반비') todaySum = getSum('transport_costs');
            else if (s.item === '자재납품 및 시공(외주)') todaySum = getSum('subcontract_costs');
            else if (s.item === '기타경비') todaySum = getSum('etc_costs');
            return { ...s, today: todaySum, total: todaySum + parseNumber(s.prev) };
        });
        if (JSON.stringify(newSettlement) !== JSON.stringify(formData.settlement_costs)) {
            setFormData(prev => ({ ...prev, settlement_costs: newSettlement }));
        }
    }, [formData.labor_costs, formData.tree_costs, formData.material_costs, formData.equipment_costs, formData.transport_costs, formData.subcontract_costs, formData.etc_costs]);

    const fetchAllData = useCallback(async () => {
        const { data: site } = await supabase.from('construction_sites').select('*').eq('id', siteId).single();
        if (site) setSiteData(site);
        const { data: reports } = await supabase.from('daily_site_reports').select(`*, profiles(full_name)`).eq('site_id', siteId).order('report_date', { ascending: false });
        if (reports) setReports(reports);
    }, [siteId]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const executeImport = async () => {
        const { data } = await supabase.from('daily_site_reports').select('notes').eq('site_id', siteId).lt('report_date', formData.report_date).order('report_date', { ascending: false }).limit(1);
        if (!data?.[0]) return alert('기록이 없습니다.');
        const prev = JSON.parse(data[0].notes);
        const bases = { labor_costs: {}, manager_info: {}, equipment_costs: {} };
        setFormData(curr => {
            const next = { ...curr };
            if (importOptions.progress) {
                next.is_plant_active = prev.is_plant_active ?? true;
                next.is_facility_active = prev.is_facility_active ?? true;
                next.progress_plant = prev.progress_plant || '0.00%';
                next.progress_facility = prev.progress_facility || '0.00%';
            }
            if (importOptions.labor) next.labor_costs = (prev.labor_costs || []).map((r, i) => { const b = parseNumber(r.accum) + parseNumber(r.count); bases.labor_costs[i] = b; return { ...r, accum: b, count: '', total: 0 }; });
            if (importOptions.manager) next.manager_info = (prev.manager_info || []).map((r, i) => { const b = parseNumber(r.accum_count) + parseNumber(r.today_count); bases.manager_info[i] = b; return { ...r, accum_count: b, today_count: '' }; });
            if (importOptions.equipment) next.equipment_costs = (prev.equipment_costs || []).map((r, i) => { const b = parseNumber(r.accum) + parseNumber(r.count); bases.equipment_costs[i] = b; return { ...r, accum: b, count: '', total: 0 }; });
            if (importOptions.tree) next.tree_costs = prev.tree_costs || [];
            if (importOptions.material) next.material_costs = prev.material_costs || [];
            if (importOptions.subcontract) next.subcontract_costs = prev.subcontract_costs || [];
            if (importOptions.etc) next.etc_costs = prev.etc_costs || [];
            if (importOptions.settlement) next.settlement_costs = curr.settlement_costs.map(s => ({ ...s, prev: prev.settlement_costs?.find(p => p.item === s.item)?.total || 0 }));
            setRowBaseValues(bases);
            return next;
        });
        setIsImportModalOpen(false);
    };

    const handlePhotoUpload = (e, type, index) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const newPhoto = { id: uuidv4(), preview: reader.result, file, timeType: type, description: '' };
            if (type === 'today') { const u = [...todayPhotos]; u[index] = newPhoto; setTodayPhotos(u); }
            else { const u = [...tomorrowPhotos]; u[index] = newPhoto; setTomorrowPhotos(u); }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const allPhotos = [...todayPhotos, ...tomorrowPhotos];
            const uploaded = await Promise.all(allPhotos.map(async (p) => {
                if (p.url) return p;
                if (!p.file) return null;
                const path = `${siteId}/${uuidv4()}.jpg`;
                await supabase.storage.from('daily_reports').upload(path, p.file);
                const { data } = supabase.storage.from('daily_reports').getPublicUrl(path);
                return { id: p.id, url: data.publicUrl, timeType: p.timeType, description: p.description };
            }));
            const payload = { site_id: siteId, report_date: formData.report_date, author_id: currentUser.id, photos: uploaded.filter(v => v), notes: JSON.stringify(formData), content: formData.today_work || '작업일보' };
            await supabase.from('daily_site_reports').upsert(selectedId ? { id: selectedId, ...payload } : payload);
            alert('저장되었습니다.'); setIsEditMode(false); setView('list'); fetchAllData();
        } catch (e) { alert(e.message); } finally { setIsSaving(false); }
    };

    const downloadExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('작업일보');
        sheet.columns = [{ width: 15 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];
        const borderStyle = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        const centerStyle = { vertical: 'middle', horizontal: 'center', wrapText: true };
        const headerBg = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
        const titleBg = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
        sheet.mergeCells('A1:H2');
        const titleCell = sheet.getCell('A1');
        titleCell.value = '작 업 일 보';
        titleCell.font = { size: 20, bold: true, underline: true };
        titleCell.alignment = centerStyle;
        sheet.addRow(['공사명', siteData?.name, '', '', '', '식재공정율', formData.is_plant_active ? formData.progress_plant : '해당없음', '']);
        sheet.addRow(['일시', formData.report_date, '날씨', formData.weather, '', '시설물공정', formData.is_facility_active ? formData.progress_facility : '해당없음', '']);
        sheet.mergeCells('B3:E3'); sheet.mergeCells('G3:H3'); sheet.mergeCells('D4:E4'); sheet.mergeCells('G4:H4');
        ['A3','A4','C4','F3','F4'].forEach(ref => { sheet.getCell(ref).fill = headerBg; sheet.getCell(ref).font = {bold: true}; });
        sheet.addRow([]);
        sheet.addRow(['전 일 작 업 요 약', '', '', '', '금 일 작 업 요 약', '', '', '']);
        sheet.mergeCells('A6:D6'); sheet.mergeCells('E6:H6');
        sheet.addRow([formData.prev_work, '', '', '', formData.today_work, '', '', '']);
        sheet.getRow(7).height = 80;
        sheet.mergeCells('A7:D7'); sheet.mergeCells('E7:H7');
        sheet.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F1FF' } };
        sheet.getCell('E6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBFAEB' } };
        let currentRow = 9;
        for (const [key, config] of Object.entries(FIELD_MAPS)) {
            sheet.addRow([`▣ ${config.title}`]);
            sheet.mergeCells(`A${currentRow}:H${currentRow}`);
            sheet.getCell(`A${currentRow}`).fill = titleBg;
            sheet.getCell(`A${currentRow}`).font = { bold: true };
            currentRow++;
            sheet.addRow(config.labels);
            config.labels.forEach((_, i) => { sheet.getCell(currentRow, i + 1).fill = headerBg; });
            currentRow++;
            (formData[key] || []).forEach(dataRow => {
                const rowValues = config.fields.map(f => {
                    const val = dataRow[f];
                    return (f === 'total' || f === 'price') ? parseNumber(val) : val;
                });
                sheet.addRow(rowValues);
                currentRow++;
            });
            const sumValue = (formData[key] || []).reduce((a, c) => a + parseNumber(c.total), 0);
            const totalRow = new Array(8).fill('');
            totalRow[0] = '합 계 (TOTAL)';
            totalRow[config.labels.length - 1] = sumValue;
            sheet.addRow(totalRow);
            sheet.getCell(`A${currentRow}`).font = {bold: true};
            sheet.getCell(currentRow, config.labels.length).numFmt = '#,##0';
            currentRow += 2;
        }
        sheet.addRow(['정 산 내 역 (SUMMARY)']);
        sheet.mergeCells(`A${currentRow}:H${currentRow}`);
        sheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF212529' } };
        sheet.getCell(`A${currentRow}`).font = { color: { argb: 'FFFFFFFF' }, bold: true };
        currentRow++;
        sheet.addRow(['구 분', '', '금 일 합 계', '', '전 일 누 계', '', '총 누 계', '']);
        ['A','C','E','G'].forEach(col => { sheet.mergeCells(`${col}${currentRow}:${String.fromCharCode(col.charCodeAt(0)+1)}${currentRow}`); sheet.getCell(`${col}${currentRow}`).fill = headerBg; });
        currentRow++;
        formData.settlement_costs.forEach(s => {
            sheet.addRow([s.item, '', s.today, '', s.prev, '', s.total, '']);
            ['A','C','E','G'].forEach(col => { sheet.mergeCells(`${col}${currentRow}:${String.fromCharCode(col.charCodeAt(0)+1)}${currentRow}`); if(col !== 'A') sheet.getCell(`${col}${currentRow}`).numFmt = '#,##0'; });
            currentRow++;
        });
        const totalSumToday = formData.settlement_costs.reduce((a,c)=>a+parseNumber(c.today),0);
        const totalSumPrev = formData.settlement_costs.reduce((a,c)=>a+parseNumber(c.prev),0);
        const totalSumTotal = formData.settlement_costs.reduce((a,c)=>a+parseNumber(c.total),0);
        sheet.addRow(['전 체 총 합 계', '', totalSumToday, '', totalSumPrev, '', totalSumTotal, '']);
        ['A','C','E','G'].forEach(col => { sheet.mergeCells(`${col}${currentRow}:${String.fromCharCode(col.charCodeAt(0)+1)}${currentRow}`); sheet.getCell(`${col}${currentRow}`).font = {bold: true}; if(col !== 'A') sheet.getCell(`${col}${currentRow}`).numFmt = '#,##0'; });
        currentRow += 2;
        sheet.addRow(['▣ 현장 전경 사진 대지']);
        sheet.mergeCells(`A${currentRow}:H${currentRow}`);
        sheet.getCell(`A${currentRow}`).fill = titleBg;
        sheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;
        const allPhotos = [{ title: '전 일', photos: tomorrowPhotos }, { title: '금 일', photos: todayPhotos }];
        for (const section of allPhotos) {
            sheet.addRow([section.title]);
            sheet.mergeCells(`A${currentRow}:H${currentRow}`);
            sheet.getCell(`A${currentRow}`).fill = headerBg;
            sheet.getCell(`A${currentRow}`).alignment = centerStyle;
            currentRow++;
            for (const photo of section.photos) {
                if (photo.url || photo.preview) {
                    try {
                        const response = await fetch(photo.url || photo.preview);
                        const blob = await response.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        const imageId = workbook.addImage({ buffer: arrayBuffer, extension: 'jpeg' });
                        sheet.getRow(currentRow).height = 160;
                        sheet.addImage(imageId, { tl: { col: 1, row: currentRow - 1 }, ext: { width: 400, height: 200 } });
                        currentRow++;
                        sheet.addRow(['설명', photo.description || '']);
                        sheet.mergeCells(`B${currentRow}:H${currentRow}`);
                        sheet.getCell(`A${currentRow}`).fill = headerBg;
                        currentRow++;
                    } catch (e) { console.error("이미지 로드 실패", e); }
                }
            }
        }
        sheet.eachRow((row) => { row.eachCell((cell) => { cell.border = borderStyle; if (!cell.alignment) cell.alignment = centerStyle; }); });
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `${formData.report_date}_작업일보_${siteData?.name}.xlsx`);
    };

    if (view === 'list') {
        return (
            <div className="max-w-6xl mx-auto py-12 px-6 font-black uppercase tracking-tighter">
                <div className="flex justify-between items-end mb-10 border-b-2 border-black pb-6">
                    <h2 className="text-4xl font-black">{siteData?.name || '현장 관리'}</h2>
                    <button onClick={() => { setFormData(initialState); setTodayPhotos([]); setTomorrowPhotos([]); setSelectedId(null); setView('write'); setIsEditMode(true); }} className="px-7 py-3.5 bg-blue-700 text-white rounded-xl shadow-lg hover:bg-blue-800 transition-all font-bold">+ 새 작업일보 작성</button>
                </div>

                {/* 🚀 1. 작업일보 작성 가이드 (설명서 섹션) */}
                <section className="mb-10 font-black">
                    <div className="bg-white border-2 border-blue-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 text-blue-700">
                            <Info size={20} />
                            <h2 className="text-lg font-black tracking-tight uppercase">작업일보 작성 가이드라인</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100 font-black">01</div>
                                <div>
                                    <p className="text-sm font-black text-slate-800 mb-1 tracking-tighter">정확한 공정률 입력</p>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed tracking-tight">현장 공정률(식재/시설물)은 누적 수치를 기준으로 작성하며, 당일 작업량을 반드시 반영하십시오.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0 border border-green-100 font-black">02</div>
                                <div>
                                    <p className="text-sm font-black text-slate-800 mb-1 tracking-tighter">투입 원가 정밀 기록</p>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed tracking-tight">노무비, 장비대, 자재비 등을 정확히 기입하여 실시간 투입 원가 데이터가 확보되게 하십시오.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-100 font-black">03</div>
                                <div>
                                    <p className="text-sm font-black text-slate-800 mb-1 tracking-tighter">현장 증빙 사진 첨부</p>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed tracking-tight">주요 공종 사진을 필수 첨부하여 기성 청구 및 준공 보고 시 공식 증빙 자료로 활용하십시오.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <table className="w-full text-left bg-white border-2 border-gray-100 font-black">
                    <thead className="bg-gray-50 border-b-2 text-[11px] text-gray-400"><tr><th className="px-6 py-4">작성일자</th><th className="px-6 py-4 text-center">작성자</th><th className="px-6 py-4 text-right">상세</th></tr></thead>
                    <tbody className="divide-y font-bold text-sm">
                        {reports.map(r => (
                            <tr key={r.id} onClick={() => { setFormData(JSON.parse(r.notes)); setSelectedId(r.id); setTodayPhotos(r.photos?.filter(p => p.timeType === 'today') || []); setTomorrowPhotos(r.photos?.filter(p => p.timeType === 'tomorrow') || []); setView('detail'); setIsEditMode(false); }} className="hover:bg-blue-50/40 cursor-pointer transition-colors font-black"><td className="px-6 py-5 font-mono text-blue-700">{r.report_date}</td><td className="px-6 py-5 text-center font-black">{r.profiles?.full_name}</td><td className="px-6 py-5 text-right font-black"><ChevronRight size={18} className="inline text-gray-300 font-black"/></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-black uppercase tracking-tighter relative font-black">
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-black">
                        <div className="bg-blue-700 p-6 text-white flex items-center justify-between"><div className="flex items-center gap-3"><Layers size={24}/><h3 className="text-xl font-black">전일 데이터 가져오기</h3></div><button onClick={() => setIsImportModalOpen(false)}><X size={24}/></button></div>
                        <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto bg-white">
                            {Object.entries({ labor: '현장출력현황', manager: '현장관리자', equipment: '장비사용현황', tree: '수목반입현황', material: '주요자재반입', subcontract: '외주(자재및시공)', etc: '기타경비', progress: '공정률 현황', settlement: '정산내역 누계' }).map(([k, l]) => (
                                <label key={k} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-blue-50 border border-gray-100"><span className="font-bold text-sm">{l}</span><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${importOptions[k] ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>{importOptions[k] && <Check size={12} className="text-white"/>}</div><input type="checkbox" className="hidden" checked={importOptions[k]} onChange={() => setImportOptions({...importOptions, [k]: !importOptions[k]})} /></label>
                            ))}
                        </div>
                        <div className="p-6 bg-gray-100 flex gap-3"><button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-4 bg-white border rounded-xl">취소</button><button onClick={executeImport} className="flex-1 py-4 bg-blue-700 text-white rounded-xl">가져오기 실행</button></div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center no-print font-black">
                <button onClick={() => setView('list')} className="text-gray-500 font-bold flex items-center gap-1 font-black"><ArrowLeft size={18}/> 목록으로</button>
                <div className="flex gap-4">
                    <button onClick={downloadExcel} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-black flex items-center gap-2 shadow-sm"><FileSpreadsheet size={16}/> 엑셀 다운로드</button>
                    {!isEditMode ? <button onClick={enterEditMode} className="bg-white text-blue-600 px-6 py-2 rounded-lg border-2 border-blue-600 font-black">수정하기</button> : (
                        <>
                            <button onClick={() => setIsImportModalOpen(true)} className="bg-orange-50 text-orange-600 px-4 py-2 rounded-lg border border-orange-200 text-xs font-bold flex items-center gap-1 font-black font-black"><RefreshCw size={14}/> 전일 데이터 가져오기</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-blue-700 text-white rounded shadow-md flex items-center gap-2 font-black">{isSaving ? <Loader2 className="animate-spin font-black" size={16}/> : <Save size={16}/>} 저장</button>
                        </>
                    )}
                </div>
            </div>

            <div className={`max-w-6xl mx-auto bg-white border border-gray-400 p-8 shadow-sm print-container font-black ${!isEditMode ? 'pointer-events-none opacity-95' : ''}`}>
                <h1 className="text-4xl font-black text-center underline underline-offset-8 mb-10 tracking-[0.5em] font-black">작 업 일 보</h1>
                
                <div className="flex gap-4 mb-4 no-print">
                    <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                        <input type="checkbox" checked={formData.is_plant_active} onChange={e => setFormData({...formData, is_plant_active: e.target.checked})} className="w-4 h-4" />
                        <span className="text-sm font-bold text-blue-700">식재 공정 포함</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                        <input type="checkbox" checked={formData.is_facility_active} onChange={e => setFormData({...formData, is_facility_active: e.target.checked})} className="w-4 h-4" />
                        <span className="text-sm font-bold text-green-700">시설물 공정 포함</span>
                    </label>
                </div>

                <div className="flex gap-4 mb-8">
                    <table className="flex-[2] border-collapse border-2 border-black text-sm">
                        <tbody>
                            <tr className="h-12 font-black"><td className="border border-black bg-gray-100 p-2 text-center w-24 font-bold">공사명</td><td className="border border-black p-3 font-black text-lg" colSpan="3">{siteData?.name}</td></tr>
                            <tr className="h-12 font-black"><td className="border border-black bg-gray-100 p-2 text-center font-bold">일시</td><td className="border border-black p-2 text-center font-black"><input type="date" className="w-full text-center bg-transparent border-none font-black" value={formData.report_date} onChange={e => setFormData({...formData, report_date: e.target.value})} /></td><td className="border border-black bg-gray-100 p-2 text-center w-24 font-bold">날씨</td><td className="border border-black p-2 text-center font-black"><input className="w-full text-center bg-transparent border-none font-black" value={formData.weather} onChange={e => setFormData({...formData, weather: e.target.value})} /></td></tr>
                        </tbody>
                    </table>
                    <table className="flex-1 border-collapse border-2 border-black text-sm">
                        <tbody>
                            <tr className={`h-12 font-black ${!formData.is_plant_active ? 'bg-gray-100 opacity-50' : ''}`}>
                                <td className="border border-black bg-blue-50 p-2 text-center w-24 font-bold">식재공정율</td>
                                <td className="border border-black p-2">
                                    <input 
                                        disabled={!formData.is_plant_active}
                                        className="w-full text-center font-bold outline-none bg-transparent" 
                                        value={formData.is_plant_active ? formData.progress_plant : '해당없음'} 
                                        onChange={e => setFormData({...formData, progress_plant: e.target.value})} 
                                        placeholder="0.00%" 
                                    />
                                </td>
                            </tr>
                            <tr className={`h-12 font-black ${!formData.is_facility_active ? 'bg-gray-100 opacity-50' : ''}`}>
                                <td className="border border-black bg-green-50 p-2 text-center w-24 font-bold">시설물공정</td>
                                <td className="border border-black p-2">
                                    <input 
                                        disabled={!formData.is_facility_active}
                                        className="w-full text-center font-bold outline-none bg-transparent" 
                                        value={formData.is_facility_active ? formData.progress_facility : '해당없음'} 
                                        onChange={e => setFormData({...formData, progress_facility: e.target.value})} 
                                        placeholder="0.00%" 
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 border-2 border-black mb-10 h-40 font-black">
                    <div className="border-r border-black font-black font-black"><div className="bg-blue-50 p-1.5 text-center font-bold border-b border-black text-xs font-black">전 일 작 업 요 약</div><textarea className="w-full h-32 p-3 text-xs resize-none border-none outline-none font-bold" value={formData.prev_work} onChange={e => setFormData({...formData, prev_work: e.target.value})} /></div>
                    <div className="font-black font-black font-black"><div className="bg-green-50 p-1.5 text-center font-bold border-b border-black text-xs font-black">금 일 작 업 요 약</div><textarea className="w-full h-32 p-3 text-xs resize-none border-none outline-none font-bold" value={formData.today_work} onChange={e => setFormData({...formData, today_work: e.target.value})} /></div>
                </div>

                <div className="space-y-8 mb-10 font-black font-black">
                    {Object.entries(FIELD_MAPS).map(([key, config]) => (
                        <div key={key} className="border-2 border-black overflow-hidden font-black font-black font-black">
                            <div className="bg-yellow-100 border-b-2 border-black p-1.5 px-4 flex justify-between items-center font-black font-black font-black">
                                <span className="text-xs font-black">▣ {config.title}</span>
                                <button onClick={() => setFormData(p => ({...p, [key]: [...p[key], config.fields.reduce((a,f)=>({...a,[f]:''}),{})]}))} className="text-[10px] bg-white border border-black px-2 py-0.5 rounded shadow-sm font-black">+ 행추가</button>
                            </div>
                            <table className="w-full text-[11px] border-collapse font-black font-black font-black font-black">
                                <thead className="bg-gray-50 border-b border-black font-black font-black font-black">
                                    <tr className="font-black">{config.labels.map(l => <th key={l} className="border-r border-black p-1.5 text-center font-black">{l}</th>)}<th className="w-8 font-black font-black"></th></tr>
                                </thead>
                                <tbody>
                                    {formData[key]?.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-200 h-9 font-black font-black font-black">
                                            {config.fields.map((f, colIdx) => (
                                                <td key={f} className={`border-r border-black p-0 font-black font-black ${f.includes('accum') || f.includes('count') || f === 'total' ? 'bg-blue-50/20' : ''}`}>
                                                    <input 
                                                        className="w-full h-full border-none p-1 text-right px-3 outline-none bg-transparent font-bold font-black" 
                                                        style={{ minWidth: '80px' }}
                                                        value={f === 'total' || f === 'price' ? formatNumber(row[f]) : (f.includes('accum') ? formatDecimal(row[f]) : row[f])} 
                                                        onChange={e => {
                                                            const updated = [...formData[key]];
                                                            const val = e.target.value.replace(/,/g, '');
                                                            updated[i][f] = val;
                                                            if (key === 'labor_costs' && f === 'count') { const base = rowBaseValues.labor_costs[i] || 0; updated[i].accum = (base + parseNumber(val)).toString(); if (updated[i].price) updated[i].total = (parseNumber(updated[i].price) * parseNumber(val)).toString(); }
                                                            else if (key === 'manager_info' && f === 'today_count') { const base = rowBaseValues.manager_info[i] || 0; updated[i].accum_count = (base + parseNumber(val)).toString(); }
                                                            else if (key === 'equipment_costs' && f === 'count') { const base = rowBaseValues.equipment_costs[i] || 0; updated[i].accum = (base + parseNumber(val)).toString(); if (updated[i].price) updated[i].total = (parseNumber(updated[i].price) * parseNumber(val)).toString(); }
                                                            else if ((f === 'price' || f === 'count') && updated[i].price && updated[i].count) { updated[i].total = (parseNumber(updated[i].price) * parseNumber(updated[i].count)).toString(); }
                                                            setFormData({...formData, [key]: updated});
                                                        }} 
                                                        onBlur={() => {
                                                            const updated = [...formData[key]];
                                                            if (['accum', 'accum_count', 'count', 'today_count'].includes(f)) { updated[i][f] = formatDecimal(parseNumber(updated[i][f])); }
                                                            setFormData({...formData, [key]: updated});
                                                        }}
                                                        onPaste={(e) => handlePaste(e, key, i, colIdx)}
                                                    />
                                                </td>
                                            ))}
                                            <td className="text-center font-black"><button onClick={() => setFormData(p => ({...p, [key]: p[key].filter((_, idx) => idx !== i)}))} className="text-red-400 font-black">×</button></td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 h-10 border-t-2 border-black font-black text-center font-black">
                                        <td className="border-r border-black font-bold font-black">합 계 (TOTAL)</td>
                                        {config.fields.slice(1).map((f, idx) => {
                                            const isNumeric = ['price', 'count', 'accum', 'total', 'today_count', 'accum_count'].includes(f);
                                            const sumValue = (formData[key] || []).reduce((acc, cur) => acc + parseNumber(cur[f]), 0);
                                            return <td key={idx} className="text-center border-r border-black font-black"><span className={f.includes('accum') || f.includes('count') ? 'text-blue-700 font-black' : ''}>{isNumeric ? (f === 'price' ? "" : (['accum', 'accum_count', 'count', 'today_count'].includes(f) ? formatDecimal(sumValue) : formatNumber(sumValue))) : ""}</span></td>
                                        })}
                                        <td className="font-black"/>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                <div className="border-2 border-black mb-10 overflow-hidden font-black">
                    <div className="bg-gray-800 text-white p-2 text-center font-bold text-sm tracking-widest uppercase font-black">정 산 내 역</div>
                    <table className="w-full border-collapse text-xs font-black font-black">
                        <thead><tr className="bg-gray-100 border-b border-black font-black font-black font-black font-black"><th className="border-r border-black p-3 w-48 font-black">구 분</th><th className="border-r border-black p-3 text-blue-700 font-black">금 일 합 계</th><th className="border-r border-black p-3 text-gray-500 font-black">전 일 누 계</th><th className="p-3 text-red-600 font-black">총 누 계</th></tr></thead>
                        <tbody>
                            {formData.settlement_costs.map((row, idx) => (
                                <tr key={idx} className="border-b border-black last:border-b-0 h-12 font-black font-black">
                                    <td className="border-r border-black bg-gray-50 p-3 text-center font-bold font-black">{row.item}</td>
                                    <td className="border-r border-black p-3 text-right px-6 bg-blue-50/10 font-bold font-black text-sm">{formatNumber(row.today)}</td>
                                    <td className="border-r border-black p-3 text-right px-6 font-black"><input className="w-full text-right outline-none bg-transparent font-black" value={formatNumber(row.prev)} onChange={e => {
                                        const next = [...formData.settlement_costs]; next[idx].prev = parseNumber(e.target.value); next[idx].total = next[idx].prev + next[idx].today;
                                        setFormData({...formData, settlement_costs: next});
                                    }} /></td>
                                    <td className="p-3 text-right px-6 text-red-700 font-bold font-black text-sm">{formatNumber(row.total)}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-200 h-14 border-t-2 border-black font-black font-black font-black font-black">
                                <td className="border-r border-black text-center font-bold font-black font-black">전 체 총 합 계</td>
                                <td className="border-r border-black text-right px-6 text-blue-800 font-black">{formatNumber(formData.settlement_costs.reduce((a,c)=>a+parseNumber(c.today),0))}</td>
                                <td className="border-r border-black text-right px-6 font-black">{formatNumber(formData.settlement_costs.reduce((a,c)=>a+parseNumber(c.prev),0))}</td>
                                <td className="text-right px-6 text-red-700 font-black font-black">{formatNumber(formData.settlement_costs.reduce((a,c)=>a+parseNumber(c.total),0))}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="border-2 border-black font-black font-black font-black">
                    <div className="bg-[#48D1CC] border-b-2 border-black p-2.5 text-center font-black font-black">현장 전경 사진 대지</div>
                    <div className="grid grid-cols-2 text-center border-b border-black text-sm bg-gray-50 font-black">
                        <div className="border-r border-black py-1.5 font-black">전 일</div><div className="py-1.5 font-black">금 일</div>
                    </div>
                    {Array.from({ length: maxPhotoRows }).map((_, idx) => (
                        <div key={idx} className="grid grid-cols-2 border-b border-black min-h-[400px] bg-white font-black font-black">
                            {['tomorrow', 'today'].map(type => (
                                <div key={type} className={`p-4 flex flex-col gap-3 relative font-black ${type === 'tomorrow' ? 'border-r border-black' : ''}`}>
                                    <label className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden font-black">
                                        {(type === 'today' ? todayPhotos : tomorrowPhotos)[idx]?.preview || (type === 'today' ? todayPhotos : tomorrowPhotos)[idx]?.url ? (
                                            <img src={(type === 'today' ? todayPhotos : tomorrowPhotos)[idx].preview || (type === 'today' ? todayPhotos : tomorrowPhotos)[idx].url} className="w-full h-full object-contain" />
                                        ) : <div className="text-center opacity-20 font-black"><Camera size={40} className="mx-auto mb-2 font-black"/><p className="text-xs font-black">사진 첨부</p></div>}
                                        <input type="file" className="hidden font-black" onChange={(e) => handlePhotoUpload(e, type, idx)} />
                                    </label>
                                    <input className="border-2 border-black p-2 text-sm font-bold font-black" placeholder="설명 입력" value={(type === 'today' ? todayPhotos : tomorrowPhotos)[idx]?.description || ''} 
                                        onChange={e => { const n = (type === 'today' ? [...todayPhotos] : [...tomorrowPhotos]); if(!n[idx]) n[idx]={id:uuidv4()}; n[idx].description = e.target.value; (type === 'today' ? setTodayPhotos : setTomorrowPhotos)(n); }} />
                                </div>
                            ))}
                        </div>
                    ))}
                    {isEditMode && <div className="no-print p-3 text-center bg-gray-50 border-t border-black font-black font-black font-black font-black font-black"><button onClick={() => { setTodayPhotos([...todayPhotos, {id:uuidv4(), preview:'', description:'', timeType:'today'}]); setTomorrowPhotos([...tomorrowPhotos, {id:uuidv4(), preview:'', description:'', timeType:'tomorrow'}]); }} className="bg-white border-2 border-black px-6 py-2 rounded-xl text-sm font-black">+ 사진 행 추가</button></div>}
                </div>
            </div>
        </div>
    );
}