'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Save, ArrowLeft, Camera, Printer, CheckCircle2, Loader2, PieChart, X, Edit3, Trash2, Calendar, User, Users, ImageIcon, FileText, ChevronRight } from 'lucide-react';

// [1. 사진 압축 함수]
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.6);
            };
        };
    });
};

// [2. 작성 및 상세 보기 컴포넌트]
function ReportEditPage({ onCancel, onSave, siteData, initialData, isSaving, onDelete }) {
    const { employee: currentUser } = useEmployee();
    
    const parsedData = useMemo(() => {
        if (!initialData?.notes) return null;
        try {
            return JSON.parse(initialData.notes);
        } catch (e) {
            console.error("데이터 파싱 실패", e);
            return null;
        }
    }, [initialData]);

    const initialState = {
        report_date: new Date().toISOString().split('T')[0],
        project_name: siteData.name || '',
        weather: '맑음',
        leader_name: '',
        author_name: currentUser?.full_name || '',
        content: '',
        tomorrow_content: '',
        labor_costs: [{ name: '', type: '', price: 0, count: 0, accum: 0, total: 0 }], 
        tree_costs: [{ item: '', spec: '', count: 0, price: 0, vendor: '', total: 0 }],
        material_costs: [{ item: '', spec: '', count: 0, price: 0, vendor: '', total: 0 }],
        equipment_costs: [{ item: '', type: '', price: 0, count: 0, accum: 0, total: 0 }],
        card_costs: [{ category: '', content: '', usage: '', price: 0 }],
        transport_costs: [{ item: '', spec: '', count: 0, price: 0, vendor: '', total: 0 }]
    };

    const [formData, setFormData] = useState(parsedData ? {
        ...initialState,
        ...parsedData,
        report_date: initialData.report_date,
        content: initialData.content,
    } : initialState);

    const [photoEntries, setPhotoEntries] = useState(initialData?.photos || []);

    const getSum = (section) => {
        if (!formData[section]) return 0;
        return formData[section].reduce((acc, cur) => {
            const val = section === 'card_costs' ? Number(cur.price) : Number(cur.total);
            return acc + (val || 0);
        }, 0);
    };

    const totalExpense = useMemo(() => {
        return getSum('labor_costs') + getSum('tree_costs') + getSum('material_costs') + 
               getSum('equipment_costs') + getSum('card_costs') + getSum('transport_costs');
    }, [formData]);
    
    const budgetRate = siteData.budget > 0 ? ((totalExpense / siteData.budget) * 100).toFixed(2) : '0.00';

    const handleGridChange = (section, index, field, value) => {
        const updated = [...formData[section]];
        updated[index][field] = value;
        if (field === 'price' || field === 'count') {
            updated[index].total = (Number(updated[index].price) || 0) * (Number(updated[index].count) || 0);
        }
        setFormData(prev => ({ ...prev, [section]: updated }));
    };

    const addRow = (section) => {
        const schemas = {
            labor_costs: { name: '', type: '', price: 0, count: 0, accum: 0, total: 0 },
            tree_costs: { item: '', spec: '', count: 0, price: 0, vendor: '', total: 0 },
            material_costs: { item: '', spec: '', count: 0, price: 0, vendor: '', total: 0 },
            equipment_costs: { item: '', type: '', price: 0, count: 0, accum: 0, total: 0 },
            card_costs: { category: '', content: '', usage: '', price: 0 },
            transport_costs: { item: '', spec: '', count: 0, price: 0, vendor: '', total: 0 }
        };
        setFormData(prev => ({ ...prev, [section]: [...prev[section], { ...schemas[section] }] }));
    };

    const deleteRow = (section, index) => {
        setFormData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            const compressedFile = await compressImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoEntries(prev => [...prev, { id: uuidv4(), preview: reader.result, file: compressedFile, type: '금일', description: '' }]);
            };
            reader.readAsDataURL(compressedFile);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 md:p-6 font-sans print:bg-white print:p-0">
            <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } .print-container { border: none !important; box-shadow: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; } @page { margin: 1cm; } }`}} />

            <div className="max-w-5xl mx-auto mb-4 flex justify-between items-center no-print px-4">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="text-gray-500 font-bold flex items-center gap-1 hover:text-black mr-2">
                        <ArrowLeft size={18}/> 목록으로
                    </button>
                    <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-xl border border-blue-100 shadow-sm">
                        <div className="text-center border-r pr-4 border-gray-100">
                            <span className="text-[10px] block font-bold text-gray-400">총 예산</span>
                            <span className="text-sm font-bold text-gray-700">{Number(siteData.budget || 0).toLocaleString()}원</span>
                        </div>
                        <div className="text-center border-r pr-4 border-gray-100">
                            <span className="text-[10px] block font-bold text-blue-400 uppercase tracking-tighter">금일 투입비</span>
                            <span className="text-lg font-black text-blue-800">{totalExpense.toLocaleString()}원</span>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] block font-bold text-orange-400 flex items-center gap-1 justify-center"><PieChart size={10}/> 예산 대비</span>
                            <span className="text-lg font-black text-orange-600">{budgetRate}%</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {initialData && <button onClick={() => onDelete(initialData.id)} className="px-4 py-2 text-red-500 font-bold text-sm hover:bg-red-50 rounded"><Trash2 size={16}/></button>}
                    <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-gray-300 rounded font-bold text-sm shadow-sm flex items-center gap-2 hover:bg-gray-50"><Printer size={16}/> 인쇄</button>
                    <button onClick={() => onSave(formData, photoEntries)} disabled={isSaving} className="px-6 py-2 bg-blue-700 text-white rounded font-bold shadow-md text-sm flex items-center gap-2 transition-all hover:bg-blue-800">
                        {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                        {initialData ? '수정 내용 저장' : '작업일보 저장'}
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto bg-white border border-gray-300 p-8 md:p-10 shadow-sm print-container">
                <h1 className="text-3xl font-bold text-center underline underline-offset-8 mb-8 tracking-[0.5em]">작 업 일 보</h1>
                
                <table className="w-full border-collapse border border-black text-sm mb-6">
                    <tbody>
                        <tr>
                            <td className="border border-black bg-gray-100 p-2 text-center font-bold w-24">공사명</td>
                            <td className="border border-black p-2 font-bold text-base" colSpan="3">{siteData.name}</td>
                            <td className="border border-black bg-gray-100 p-2 text-center font-bold w-24">현장소장</td>
                            <td className="border border-black p-0 w-40">
                                <input className="w-full h-full border-none p-2 text-center focus:ring-0 font-bold bg-transparent" value={formData.leader_name} onChange={e => setFormData({...formData, leader_name: e.target.value})} />
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black bg-gray-100 p-2 text-center font-bold">일시</td>
                            <td className="border border-black p-2"><input type="date" className="w-full border-none p-0 focus:ring-0 font-medium text-center bg-transparent" value={formData.report_date} onChange={e => setFormData({...formData, report_date: e.target.value})} /></td>
                            <td className="border border-black bg-gray-100 p-2 text-center font-bold w-24">날씨</td>
                            <td className="border border-black p-2"><input className="w-full border-none p-0 focus:ring-0 text-center bg-transparent" value={formData.weather} onChange={e => setFormData({...formData, weather: e.target.value})} /></td>
                            <td className="border border-black bg-gray-100 p-2 text-center font-bold w-24">작성자</td>
                            <td className="border border-black p-0 text-center font-bold text-gray-700">{formData.author_name}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="grid grid-cols-2 border border-black mb-6 min-h-[160px]">
                    <div className="border-r border-black p-3">
                        <h4 className="text-[11px] font-bold mb-2 text-blue-700 underline underline-offset-2">■ 금일 작업 내용</h4>
                        <textarea className="w-full h-28 border-none p-0 text-sm focus:ring-0 leading-relaxed resize-none font-medium" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
                    </div>
                    <div className="p-3">
                        <h4 className="text-[11px] font-bold mb-2 text-gray-400 underline underline-offset-2">■ 명일 작업 예정</h4>
                        <textarea className="w-full h-28 border-none p-0 text-sm focus:ring-0 leading-relaxed resize-none font-medium" value={formData.tomorrow_content} onChange={e => setFormData({...formData, tomorrow_content: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-6">
                    <Table section="labor_costs" title="▣ 현장 출력 현황" headers={['성명', '직종', '단가', '공수', '출력누계', '금액']} fields={['name', 'type', 'price', 'count', 'accum', 'total']} formData={formData} handleGridChange={handleGridChange} addRow={addRow} deleteRow={deleteRow} />
                    <div className="grid grid-cols-2 gap-0 border-t border-black">
                        <Table section="tree_costs" title="▣ 수목 반입 현황" headers={['품명', '규격', '단가', '수량', '거래처', '금액']} fields={['item', 'spec', 'price', 'count', 'vendor', 'total']} formData={formData} handleGridChange={handleGridChange} addRow={addRow} deleteRow={deleteRow} isHalf />
                        <Table section="material_costs" title="▣ 주요 자재 반입 현황" headers={['품명', '규격', '단가', '수량', '거래처', '금액']} fields={['item', 'spec', 'price', 'count', 'vendor', 'total']} formData={formData} handleGridChange={handleGridChange} addRow={addRow} deleteRow={deleteRow} isHalf />
                    </div>
                    <Table section="equipment_costs" title="▣ 장비 사용 현황" headers={['품명', '투입공종', '단가', '수량', '출력누계', '금액']} fields={['item', 'type', 'price', 'count', 'accum', 'total']} formData={formData} handleGridChange={handleGridChange} addRow={addRow} deleteRow={deleteRow} />
                    <div className="grid grid-cols-2 gap-0 border-t border-black">
                        <Table section="card_costs" title="▣ 법인카드 사용 내역" headers={['계 정', '내 용', '사 용 처', '금 액']} fields={['category', 'content', 'usage', 'price']} formData={formData} handleGridChange={handleGridChange} addRow={addRow} deleteRow={deleteRow} isHalf />
                        <Table section="transport_costs" title="▣ 운반비 투입 현황" headers={['품 명', '규 격', '단 가', '수 량', '거 래 처', '금 액']} fields={['item', 'spec', 'price', 'count', 'vendor', 'total']} formData={formData} handleGridChange={handleGridChange} addRow={addRow} deleteRow={deleteRow} isHalf />
                    </div>
                </div>

                <div className="mt-10 border-t-2 border-black pt-6">
                    <div className="flex justify-between items-center mb-4 no-print">
                        <h4 className="text-xs font-bold flex items-center gap-2"><Camera size={16}/> 현장 사진 증빙</h4>
                        <input type="file" multiple accept="image/*" className="text-xs" onChange={handleFileChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {photoEntries.map(entry => (
                            <div key={entry.id} className="border border-black p-2 flex gap-3 h-36 relative bg-white">
                                <img src={entry.url || entry.preview} className="w-32 h-full object-cover border shrink-0 bg-gray-50" />
                                <div className="flex-1 space-y-2">
                                    <div className="text-[10px] font-bold underline decoration-blue-500 underline-offset-2">{entry.type} 사진</div>
                                    <textarea className="w-full h-16 text-[10px] border-none p-0 focus:ring-0 resize-none font-medium leading-tight" placeholder="설명 입력..." value={entry.description} onChange={e => setPhotoEntries(ps => ps.map(p => p.id === entry.id ? {...p, description: e.target.value} : p))} />
                                </div>
                                <button onClick={() => setPhotoEntries(ps => ps.filter(p => p.id !== entry.id))} className="absolute top-1 right-1 text-red-500 no-print px-1 text-lg">×</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Table({ section, title, headers, fields, formData, handleGridChange, addRow, deleteRow, isHalf }) {
    if (!formData || !formData[section]) return null;
    return (
        <div className={`border border-black ${isHalf ? '' : 'w-full'}`}>
            <div className="bg-gray-100 border-b border-black p-1 px-3 flex justify-between items-center">
                <span className="text-[10px] font-bold">{title}</span>
                <button onClick={() => addRow(section)} className="text-[9px] font-bold text-blue-700 no-print hover:underline">+ 행추가</button>
            </div>
            <table className="w-full text-[10px] border-collapse">
                <thead>
                    <tr className="bg-white border-b border-black">
                        {headers.map(h => <th key={h} className="border-r border-black last:border-0 p-1 text-center font-bold bg-gray-50/50">{h}</th>)}
                        <th className="w-6 no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    {formData[section].map((row, i) => (
                        <tr key={i} className="border-b border-gray-200">
                            {fields.map(f => (
                                <td key={f} className="border-r border-black last:border-0 p-0">
                                    <input className="w-full border-none p-1 text-center focus:ring-0 bg-transparent font-medium" value={row[f]} onChange={e => handleGridChange(section, i, f, e.target.value)} />
                                </td>
                            ))}
                            <td className="text-center no-print"><button onClick={() => deleteRow(section, i)} className="text-red-300 hover:text-red-600">×</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// [3. 메인 관리 컴포넌트 - 목록 UI 전면 수정]
export default function DailyReportSection({ siteId }) {
    const { employee: currentUser } = useEmployee();
    const [view, setView] = useState('list');
    const [reports, setReports] = useState([]);
    const [siteData, setSiteData] = useState({ name: '', budget: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    const fetchAllData = useCallback(async () => {
        const { data: siteInfo } = await supabase.from('construction_sites').select('name, budget').eq('id', siteId).single();
        if (siteInfo) setSiteData({ name: siteInfo.name, budget: siteInfo.budget || 0 });

        // profiles를 조인해서 작성자 이름을 가져오도록 쿼리 수정
        const { data: reportList } = await supabase
            .from('daily_site_reports')
            .select(`*, profiles(full_name)`)
            .eq('site_id', siteId)
            .order('report_date', { ascending: false });
        if (reportList) setReports(reportList);
    }, [siteId]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const handleSaveReport = async (formData, photos) => {
        if (!currentUser || isSaving) return;
        setIsSaving(true);
        try {
            const uploadedPhotos = await Promise.all(photos.map(async (p) => {
                if (p.url) return p; 
                const fileName = `${siteId}/${uuidv4()}.jpg`;
                const { error: uploadErr } = await supabase.storage.from('daily_reports').upload(fileName, p.file);
                if (uploadErr) throw uploadErr;
                const { data: { publicUrl } } = supabase.storage.from('daily_reports').getPublicUrl(fileName);
                return { id: p.id, url: publicUrl, type: p.type, description: p.description };
            }));

            const payload = {
                site_id: siteId,
                report_date: formData.report_date,
                author_id: currentUser.id,
                content: formData.content,
                photos: uploadedPhotos,
                manpower_count: formData.labor_costs.reduce((sum, r) => sum + (Number(r.count) || 0), 0),
                notes: JSON.stringify(formData)
            };

            const result = selectedReport 
                ? await supabase.from('daily_site_reports').update(payload).eq('id', selectedReport.id)
                : await supabase.from('daily_site_reports').insert(payload);

            if (result.error) throw result.error;
            
            alert('저장되었습니다.');
            setView('list');
            setSelectedReport(null);
            fetchAllData();
        } catch (err) {
            alert('저장 오류: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (view === 'write' || view === 'detail') {
        return (
            <ReportEditPage 
                siteData={siteData} 
                initialData={selectedReport} 
                onCancel={() => { setView('list'); setSelectedReport(null); }} 
                onSave={handleSaveReport} 
                onDelete={async (id) => { if(confirm('삭제하시겠습니까?')) { await supabase.from('daily_site_reports').delete().eq('id', id); setView('list'); fetchAllData(); }}}
                isSaving={isSaving} 
            />
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-12 px-6 font-sans">
            <div className="flex justify-between items-end mb-10 border-b-2 border-black pb-6 no-print">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{siteData.name || '현장'}</h2>
                    <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-widest border border-blue-100">Project Log</span>
                        <span className="text-xs font-bold text-gray-400">총 {reports.length}개의 기록</span>
                    </div>
                </div>
                <button onClick={() => { setSelectedReport(null); setView('write'); }} className="px-7 py-3.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg flex items-center gap-2 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95">
                    <Plus size={20}/> 새 작업일보 작성
                </button>
            </div>
            
            {/* [업그레이드된 문서 목록 테이블] */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">날짜</th>
                            <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">작업 요약</th>
                            <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider text-center">작성자</th>
                            <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider text-center">인원</th>
                            <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider text-center">자료</th>
                            <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">상세</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-300">
                                        <FileText size={48} strokeWidth={1}/>
                                        <p className="font-bold text-sm">기록된 작업일보가 없습니다.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            reports.map(report => (
                                <tr 
                                    key={report.id} 
                                    onClick={() => { setSelectedReport(report); setView('detail'); }}
                                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-100 rounded-lg text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                                                <Calendar size={16}/>
                                            </div>
                                            <span className="font-mono font-bold text-gray-900">{report.report_date}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="font-bold text-gray-700 line-clamp-1 max-w-md group-hover:text-blue-700 transition-colors">
                                            {report.content || '내용이 입력되지 않았습니다.'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold border-2 border-white shadow-sm">
                                                {report.profiles?.full_name?.charAt(0) || <User size={12}/>}
                                            </div>
                                            <span className="font-bold text-gray-800 text-sm">{report.profiles?.full_name || '미지정'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-[11px] font-black text-gray-500 group-hover:bg-white group-hover:text-blue-600 border border-transparent group-hover:border-blue-100 transition-all">
                                            <Users size={12}/> {report.manpower_count}명
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {report.photos?.length > 0 ? (
                                                <div className="relative">
                                                    <ImageIcon size={18} className="text-blue-500"/>
                                                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{report.photos.length}</span>
                                                </div>
                                            ) : (
                                                <ImageIcon size={18} className="text-gray-200"/>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                            <ChevronRight size={18}/>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-8 flex justify-center no-print">
                <div className="flex items-center gap-6 text-[10px] font-bold text-gray-400 tracking-tighter">
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> 데이터 실시간 동기화 완료</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> 클라우드 안전 저장</span>
                </div>
            </div>
        </div>
    );
}