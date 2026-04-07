'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Save, ArrowLeft, Camera, Loader2, RefreshCw, ImageIcon, ZoomIn, ZoomOut, X, Plus, Edit3, Trash2, ChevronDown, ChevronUp, MousePointerClick, RotateCcw, AlertCircle, ListFilter, ListMinus } from 'lucide-react';
import { toast } from 'react-hot-toast';

const formatNumber = (num) => {
    if (num === null || num === undefined || num === "" || isNaN(num)) return "-";
    const n = Number(num.toString().replace(/,/g, ''));
    if (n === 0) return "0";
    if (n % 1 !== 0) return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 });
    return Math.round(n).toLocaleString();
};

const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const match = str.toString().replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
};

const safeParseJSON = (data) => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
        return JSON.parse(data);
    } catch (error) {
        console.warn('JSON parsing error (safely ignored):', error);
        return {};
    }
};

// 🚀 식재 및 반입 수기 장부 (엑셀 샘플 가이드 100% 적용 완료)
const ManualLedgerTable = ({ list, readOnly, setFormData }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const contractSum = list?.reduce((acc, cur) => acc + parseNumber(cur.contract), 0) || 0;
    const baseIncomingSum = list?.reduce((acc, cur) => acc + parseNumber(cur.base_incoming), 0) || 0;
    const incomingSum = list?.reduce((acc, cur) => acc + parseNumber(cur.incoming), 0) || 0;
    const notIncomingSum = list?.reduce((acc, cur) => acc + parseNumber(cur.not_incoming), 0) || 0;
    const prevRemainSum = list?.reduce((acc, cur) => acc + parseNumber(cur.prev_remain), 0) || 0;
    const plantedSum = list?.reduce((acc, cur) => acc + parseNumber(cur.planted), 0) || 0;
    const finalRemainSum = list?.reduce((acc, cur) => acc + parseNumber(cur.final_remain), 0) || 0;

    const todayRows = list?.filter(r => !r.isPastRecord) || [];
    const pastRows = list?.filter(r => r.isPastRecord) || [];

    const displayRows = isExpanded ? [...todayRows, ...pastRows] : todayRows;
    const colSpanTotal = readOnly ? 10 : 11;

    return (
        <div className="flex flex-col flex-1 h-full w-full bg-white">
            <div className="bg-yellow-50 min-h-[32px] text-center border-b border-slate-400 text-[10px] tracking-widest uppercase font-black flex justify-between items-center px-3 text-yellow-800 shrink-0 sticky top-0 z-10">
                <span>식재 및 반입 수기 장부 (요약)</span>
                {!readOnly && (
                    <button 
                        type="button" 
                        onClick={() => setFormData(p => ({...p, manual_ledger: [{id:uuidv4(), item: '', spec: '', contract: '', base_incoming: '', incoming: '', not_incoming: '', prev_remain: '', planted: '', final_remain: '', isPastRecord: false}, ...(p.manual_ledger||[])]}))} 
                        className="bg-white border border-yellow-300 px-2 py-0.5 rounded text-[9px] hover:bg-yellow-100 text-yellow-800 shadow-sm transition-all"
                    >+ 행 추가</button>
                )}
            </div>
            <div className="flex-1 w-full p-1 pb-4 overflow-x-auto overflow-y-hidden">
                <table className="w-full text-[9px] border-collapse font-sans" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                    <colgroup>
                        <col style={{ width: readOnly ? '13%' : '12%' }} /> {/* 수종명 */}
                        <col style={{ width: '10%' }} />  {/* 규격 */}
                        <col style={{ width: '8%' }} />   {/* 계약수량 */}
                        <col style={{ width: '9%' }} />   {/* 기반입 */}
                        <col style={{ width: '9%' }} />   {/* 금일반입 */}
                        <col style={{ width: '9%' }} />   {/* 미반입 */}
                        <col style={{ width: '10%' }} />  {/* 전일미식재 */}
                        <col style={{ width: '9%' }} />   {/* 금일반입(표출) */}
                        <col style={{ width: '9%' }} />   {/* 금일식재 */}
                        <col style={{ width: '11%' }} />  {/* 잔량(미식재) */}
                        {!readOnly && <col style={{ width: '3%' }} />} {/* 삭제 */}
                    </colgroup>
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="p-1 border border-slate-300 border-t-0 border-l-0 align-middle">수종명</th>
                            <th className="p-1 border border-slate-300 border-t-0 align-middle">규격</th>
                            <th className="p-1 border border-slate-300 border-t-0 align-middle">계약수량</th>
                            <th className="p-1 border border-slate-300 border-t-0 align-middle bg-yellow-100/50">기반입</th>
                            <th className="p-1 border border-slate-300 border-t-0 align-middle bg-yellow-100/50">금일반입</th>
                            <th className="p-1 border border-slate-300 border-t-0 align-middle text-red-600">미반입</th>
                            <th className="p-1 border border-slate-300 border-t-0 align-middle">전일미식재</th>
                            <th className="p-1 border border-slate-300 border-t-0 align-middle bg-blue-50 text-blue-700">금일반입</th>
                            <th className="p-1 border border-slate-300 border-t-0 align-middle">금일식재</th>
                            <th className="p-1 border border-slate-300 border-t-0 border-r-0 align-middle text-red-600">잔량(미식재)</th>
                            {!readOnly && <th className="p-1 border-b border-slate-300"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayRows.map((item) => {
                            const renderInput = (field, isHighlight = false, isRed = false, isBlue = false, forceReadOnly = false) => {
                                const isCalculatedField = field === 'not_incoming' || field === 'final_remain' || forceReadOnly;

                                return (
                                    <textarea
                                        rows={1}
                                        className={`w-full p-1 text-center font-black outline-none resize-none overflow-hidden whitespace-pre-wrap leading-tight 
                                        ${isHighlight ? 'bg-yellow-100 focus:bg-yellow-100' : isBlue ? 'bg-blue-50 focus:bg-blue-50' : 'bg-transparent focus:bg-slate-50'} 
                                        ${isRed ? 'text-red-600' : isBlue ? 'text-blue-700' : 'text-slate-800'}
                                        ${readOnly || isCalculatedField ? 'cursor-default' : ''}`}
                                        value={item[field] || ''}
                                        placeholder={readOnly ? "-" : ""}
                                        readOnly={readOnly || isCalculatedField}
                                        onChange={(e) => {
                                            if (readOnly || isCalculatedField) return;
                                            const val = e.target.value;
                                            setFormData(prev => {
                                                const newList = [...(prev.manual_ledger || [])];
                                                const targetIdx = newList.findIndex(li => li.id === item.id);
                                                if (targetIdx > -1) {
                                                    const row = { ...newList[targetIdx], [field]: val };
                                                    
                                                    // 🧮 엑셀 수식 실시간 연동
                                                    if (['contract', 'base_incoming', 'incoming', 'prev_remain', 'planted'].includes(field)) {
                                                        const cont = parseNumber(row.contract);
                                                        const bInc = parseNumber(row.base_incoming);
                                                        const inc = parseNumber(row.incoming);
                                                        const pRem = parseNumber(row.prev_remain);
                                                        const pl = parseNumber(row.planted);
                                                        
                                                        // 미반입 = 계약수량 - 기반입 - 금일반입
                                                        if (row.contract || row.base_incoming || row.incoming) {
                                                            row.not_incoming = (cont - bInc - inc).toString();
                                                        } else {
                                                            row.not_incoming = '';
                                                        }
                                                        
                                                        // 잔량 = 전일미식재 + 금일반입 - 금일식재
                                                        if (row.prev_remain || row.incoming || row.planted) {
                                                            row.final_remain = (pRem + inc - pl).toString();
                                                        } else {
                                                            row.final_remain = '';
                                                        }
                                                    }
                                                    newList[targetIdx] = row;
                                                }
                                                return { ...prev, manual_ledger: newList };
                                            });
                                        }}
                                        onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                    />
                                );
                            };

                            return (
                                <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 group">
                                    <td className="border-r border-slate-200 p-0 align-middle">{renderInput('item')}</td>
                                    <td className="border-r border-slate-200 p-0 align-middle">{renderInput('spec')}</td>
                                    <td className="border-r border-slate-200 p-0 align-middle">{renderInput('contract')}</td>
                                    <td className="border-r border-slate-200 p-0 align-middle bg-yellow-100/50">{renderInput('base_incoming', true)}</td>
                                    <td className="border-r border-slate-200 p-0 align-middle bg-yellow-100/50">{renderInput('incoming', true)}</td>
                                    <td className="border-r border-slate-200 p-0 align-middle">{renderInput('not_incoming', false, true)}</td>
                                    <td className="border-r border-slate-200 p-0 align-middle">{renderInput('prev_remain')}</td>
                                    {/* 🚀 금일반입 중복 연동 출력 칸 */}
                                    <td className="border-r border-slate-200 p-0 align-middle bg-blue-50">{renderInput('incoming', false, false, true, true)}</td>
                                    <td className="border-r border-slate-200 p-0 align-middle">{renderInput('planted')}</td>
                                    <td className="border-r border-slate-200 p-0 align-middle">{renderInput('final_remain', false, true)}</td>
                                    {!readOnly && (
                                        <td className="text-center align-middle opacity-0 group-hover:opacity-100 border-r border-slate-200">
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, manual_ledger: prev.manual_ledger.filter(li => li.id !== item.id) }))} className="text-red-400 hover:text-red-600 font-bold px-1 w-full h-full min-h-[24px]">×</button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}

                        {pastRows.length > 0 && (
                            <tr className="h-8">
                                <td colSpan={colSpanTotal} className="bg-slate-50/50 p-0 text-center border-b border-slate-200 align-middle">
                                    {isExpanded ? (
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(false); }} className="text-[10px] text-red-500 font-black hover:bg-red-50 flex items-center justify-center gap-1 w-full h-full transition-all py-2">
                                            <ListMinus size={13} /> 전일 내역 접어놓기
                                        </button>
                                    ) : (
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(true); }} className="text-[10px] text-blue-600 font-black hover:bg-blue-50 flex items-center justify-center gap-1 w-full h-full transition-all py-2">
                                            <ListFilter size={13} /> 전일 내역 {pastRows.length}건 펼쳐보기 (입력 시 저장 후 위로 정렬됨)
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    
                    {(displayRows.length > 0 || pastRows.length > 0) && (
                        <tfoot className="bg-slate-100 font-black text-slate-800">
                            <tr>
                                <td colSpan={2} className="border-r border-t border-slate-300 text-center p-2 uppercase tracking-widest text-[10px]">총 합계</td>
                                <td className="border-r border-t border-slate-300 text-center p-2">{formatNumber(contractSum)}</td>
                                <td className="border-r border-t border-slate-300 text-center p-2 bg-yellow-100/50 text-yellow-900">{formatNumber(baseIncomingSum)}</td>
                                <td className="border-r border-t border-slate-300 text-center p-2 bg-yellow-100/50 text-yellow-900">{formatNumber(incomingSum)}</td>
                                <td className="border-r border-t border-slate-300 text-center p-2 text-red-600">{formatNumber(notIncomingSum)}</td>
                                <td className="border-r border-t border-slate-300 text-center p-2">{formatNumber(prevRemainSum)}</td>
                                <td className="border-r border-t border-slate-300 text-center p-2 bg-blue-50 text-blue-700">{formatNumber(incomingSum)}</td>
                                <td className="border-r border-t border-slate-300 text-center p-2">{formatNumber(plantedSum)}</td>
                                <td className="border-r border-t border-slate-300 text-center p-2 text-red-600">{formatNumber(finalRemainSum)}</td>
                                {!readOnly && <td className="border-t border-slate-300 border-r"></td>}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
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
        subcontract_costs: { fields: ['item', 'spec', 'price', 'count', 'vendor', 'total'], labels: ['품명', '규격', '단가', '수량', '거래처', '금액'], title: '자재납품 및 시공', sums: ['count', 'total'] },
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
        const name = (row.item || row.name || '').trim();
        if (!name) return null;
        const spec = (row.spec || '').trim();
        const vendor = (row.vendor || '').trim();
        const price = row.price ? row.price.toString().replace(/,/g, '').trim() : '0';
        return `${name}_${spec}_${vendor}_${price}`;
    };

    // 🚀 다른 장부들과 100% 동일하게 모든 과거 데이터를 날짜순 스캔하여 완벽하게 동기화!
    const syncWithAllPastData = useCallback(async (currentData, isNewReport = false) => {
        if (!currentData?.report_date) return currentData;
        const { data: pastReports } = await supabase.from('daily_site_reports').select('notes, report_date').eq('site_id', siteId).lt('report_date', currentData.report_date);
        if (!pastReports) return currentData;

        // 과거 데이터를 정확한 시간순으로 정렬
        pastReports.sort((a, b) => new Date(a.report_date) - new Date(b.report_date));

        const historicalDataMap = {}; 
        const historicalLedgerMap = {}; // 수기장부 전용 누적 맵
        const historicalProgress = { plant: 0, facility: 0 }; 
        const historicalSettlement = {};

        pastReports.forEach(report => {
            const notes = safeParseJSON(report.notes);
            historicalProgress.plant += parseNumber(notes.progress_plant);
            historicalProgress.facility += parseNumber(notes.progress_facility);
            
            // 🚀 수기 장부: 과거 데이터 누적 훑기 엔진 (품명_규격 조합으로 고유키 생성)
            if (notes.manual_ledger && Array.isArray(notes.manual_ledger)) {
                notes.manual_ledger.forEach(row => {
                    const uKey = (row.item || '').trim() + '_' + (row.spec || '').trim();
                    if (!uKey || uKey === '_') return;

                    if (!historicalLedgerMap[uKey]) {
                        historicalLedgerMap[uKey] = { 
                            base_inc: 0, 
                            remain: 0,
                            contract: 0
                        };
                    }
                    
                    // 각 날짜별 계산을 그대로 모방하여 누적함
                    let thisBaseInc = parseNumber(row.base_incoming);
                    let thisFinalRem = parseNumber(row.final_remain);
                    let thisInc = parseNumber(row.incoming);
                    
                    // 다음 날을 위한 기반입(누계) = 해당 일자의 기반입 + 금일반입
                    historicalLedgerMap[uKey].base_inc = thisBaseInc + thisInc;
                    // 다음 날을 위한 전일잔량 = 해당 일자의 잔량
                    historicalLedgerMap[uKey].remain = thisFinalRem;
                    
                    if (row.contract) historicalLedgerMap[uKey].contract = parseNumber(row.contract);
                });
            }

            ['labor_costs', 'material_costs', 'equipment_costs', 'tree_costs', 'transport_costs', 'subcontract_costs'].forEach(key => {
                if (!historicalDataMap[key]) historicalDataMap[key] = {};
                if (notes[key] && Array.isArray(notes[key])) {
                    notes[key].forEach(row => {
                        const uKey = getUniqueKey(row);
                        if (!uKey) return;

                        if (!historicalDataMap[key][uKey]) {
                            historicalDataMap[key][uKey] = { ...row, count: 0, total: 0, prev_count: 0, accum: 0 };
                        }
                        historicalDataMap[key][uKey].prev_count += parseNumber(row.count);
                    });
                }
            });

            if (notes.settlement_costs && Array.isArray(notes.settlement_costs)) {
                notes.settlement_costs.forEach(item => {
                    const itemName = item.item === '자재납품 및 시공(외주)' ? '자재납품 및 시공' : item.item;
                    historicalSettlement[itemName] = (historicalSettlement[itemName] || 0) + parseNumber(item.today);
                });
            }
        });

        const updatedData = { ...currentData };
        updatedData.progress_plant_prev = historicalProgress.plant.toFixed(4);
        updatedData.progress_facility_prev = historicalProgress.facility.toFixed(4);
        
        // 🚀 스캔된 누적 데이터를 현재 장부에 결합 (구버전 호환성을 위해 total_remain도 스캔)
        updatedData.manual_ledger = (currentData.manual_ledger || []).map(row => {
            const uKey = (row.item || '').trim() + '_' + (row.spec || '').trim();
            const pastInfo = uKey && uKey !== '_' ? historicalLedgerMap[uKey] : null;
            const hasActivity = row.incoming?.toString().trim() || row.planted?.toString().trim();

            let bInc = parseNumber(row.base_incoming);
            let pRem = parseNumber(row.prev_remain || row.total_remain); // 호환성
            let cont = parseNumber(row.contract);

            if (pastInfo) {
                bInc = pastInfo.base_inc;
                pRem = pastInfo.remain;
                if (!row.contract && pastInfo.contract) cont = pastInfo.contract;
                delete historicalLedgerMap[uKey];
            } else if (isNewReport) {
                bInc = 0;
                pRem = 0;
            }

            const inc = parseNumber(row.incoming);
            const pl = parseNumber(row.planted);

            if (!pastInfo && row.base_incoming) {
                 bInc = parseNumber(row.base_incoming); 
            }

            const notInc = cont - bInc - inc;
            const finalRem = pRem + inc - pl;

            return {
                ...row,
                contract: cont > 0 ? cont.toString() : '',
                base_incoming: (bInc > 0 || row.base_incoming) ? bInc.toString() : '',
                prev_remain: (pRem > 0 || row.prev_remain || row.total_remain) ? pRem.toString() : '',
                not_incoming: (cont > 0 || bInc > 0 || inc > 0) ? notInc.toString() : '',
                final_remain: (pRem > 0 || inc > 0 || pl > 0) ? finalRem.toString() : '',
                isPastRecord: !hasActivity
            };
        });

        // 🚀 누락된 과거 데이터를 아래쪽에 자동으로 붙여줌 (다른 테이블들과 동일한 동작)
        const missingLedgerRows = Object.keys(historicalLedgerMap).map(uKey => {
            const pastInfo = historicalLedgerMap[uKey];
            const [item, spec] = uKey.split('_');
            const bInc = pastInfo.base_inc;
            const pRem = pastInfo.remain;
            const cont = pastInfo.contract;

            return {
                id: uuidv4(),
                item: item || '',
                spec: spec || '',
                contract: cont > 0 ? cont.toString() : '',
                base_incoming: bInc > 0 ? bInc.toString() : '',
                prev_remain: pRem > 0 ? pRem.toString() : '',
                incoming: '',
                not_incoming: (cont > 0 || bInc > 0) ? (cont - bInc).toString() : '',
                planted: '',
                final_remain: pRem > 0 ? pRem.toString() : '',
                isPastRecord: true
            };
        });

        updatedData.manual_ledger = [...updatedData.manual_ledger, ...missingLedgerRows];

        // 노무비, 자재비 등 기존 동기화
        ['labor_costs', 'material_costs', 'equipment_costs', 'tree_costs', 'transport_costs', 'subcontract_costs'].forEach(key => {
            const currentRows = updatedData[key] || [];
            const pastItems = { ...historicalDataMap[key] };
            const processedRows = currentRows.map(row => {
                const { isPastRecord, ...cleanRow } = row;
                const uKey = getUniqueKey(cleanRow);
                const pastInfo = uKey ? pastItems[uKey] : null;
                const rowId = cleanRow.id || uuidv4();

                if (pastInfo) {
                    const newPrev = pastInfo.prev_count;
                    delete pastItems[uKey];
                    return {
                        ...cleanRow,
                        id: rowId,
                        isPastRecord: false,
                        prev_count: newPrev.toString(),
                        accum: (newPrev + parseNumber(cleanRow.count)).toString()
                    };
                }
                return { ...cleanRow, id: rowId, isPastRecord: false, prev_count: "0", accum: cleanRow.count };
            });

            const missingRows = Object.values(pastItems).map(pastRow => {
                const { isPastRecord, ...cleanPastRow } = pastRow;
                return {
                    ...cleanPastRow,
                    id: cleanPastRow.id || uuidv4(),
                    isPastRecord: true,
                    prev_count: cleanPastRow.prev_count.toString(),
                    count: "0",
                    accum: cleanPastRow.prev_count.toString(),
                    total: "0"
                };
            });

            updatedData[key] = [...processedRows, ...missingRows];
        });

        updatedData.etc_costs = (updatedData.etc_costs || []).map(r => ({ ...r, isPastRecord: false, id: r.id || uuidv4() }));

        if (updatedData.settlement_costs) {
            updatedData.settlement_costs = updatedData.settlement_costs.map(item => {
                const itemName = item.item === '자재납품 및 시공(외주)' ? '자재납품 및 시공' : item.item;
                const totalPast = historicalSettlement[itemName] || 0;
                return { ...item, item: itemName, prev: totalPast, total: totalPast + parseNumber(item.today) };
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
                const notes = safeParseJSON(rep.notes);
                ['labor_costs', 'material_costs', 'equipment_costs', 'tree_costs', 'transport_costs', 'subcontract_costs', 'etc_costs'].forEach(k => {
                    if (notes[k]) notes[k] = notes[k].map(r => ({ ...r, id: r.id || uuidv4() }));
                });

                let fullData = await syncWithAllPastData({ ...notes, total_contract_amount: site?.budget || 0 }, false);
                
                fullData.today_work = notes.today_work || '';
                fullData.prev_work = notes.prev_work || '';

                setFormData(fullData); setOriginalData(fullData);
                if (notes.savedColumnWidths) setColumnWidths(notes.savedColumnWidths);
                if (notes.savedVisibleSections) setVisibleSections(notes.savedVisibleSections);
                setTodayPhotos(rep.photos?.filter(p => p.timeType === 'today') || []);
                setTomorrowPhotos(rep.photos?.filter(p => p.timeType === 'tomorrow') || []);
            } else {
                const initialData = {
                    report_date: new Date().toISOString().split('T')[0], weather: '맑음', report_category: categoryType, total_contract_amount: site?.budget || 0,
                    progress_plant_prev: '0.0000', progress_facility_prev: '0.0000', progress_plant: '0.0000', progress_facility: '0.0000',
                    settlement_costs: [{ item: '수목', prev: 0, today: 0, total: 0 }, { item: '자재납품 및 시공', prev: 0, today: 0, total: 0 }, { item: '자재비', prev: 0, today: 0, total: 0 }, { item: '장비대', prev: 0, today: 0, total: 0 }, { item: '노무비', prev: 0, today: 0, total: 0 }, { item: '운반비', prev: 0, today: 0, total: 0 }, { item: '기타경비', prev: 0, today: 0, total: 0 }],
                    labor_costs: [], material_costs: [], equipment_costs: [], tree_costs: [], transport_costs: [], subcontract_costs: [], etc_costs: [],
                    prev_work: '', today_work: '', manual_ledger: []
                };
                const synced = await syncWithAllPastData(initialData, true);
                
                if (!synced.manual_ledger || synced.manual_ledger.length === 0) {
                    synced.manual_ledger = [{ id: uuidv4(), item: '', spec: '', contract: '', base_incoming: '', incoming: '', not_incoming: '', prev_remain: '', planted: '', final_remain: '', isPastRecord: false }];
                }

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

            if (cleanDataToSave.manual_ledger) {
                cleanDataToSave.manual_ledger = cleanDataToSave.manual_ledger.map(row => {
                    const { isPastRecord, ...rest } = row;
                    return rest;
                });
            }

            ['labor_costs', 'material_costs', 'equipment_costs', 'tree_costs', 'transport_costs', 'subcontract_costs', 'etc_costs'].forEach(key => {
                if (cleanDataToSave[key]) {
                    cleanDataToSave[key] = cleanDataToSave[key].filter(row => {
                        if (key === 'etc_costs') return parseNumber(row.total) > 0 || row.content;
                        return parseNumber(row.count) > 0 || parseNumber(row.total) > 0;
                    }).map(row => {
                        const { isPastRecord, ...rest } = row;
                        return rest;
                    });
                }
            });

            const payload = {
                site_id: siteId, report_date: formData.report_date, author_id: currentUser.id, photos: uploadedPhotos.filter(v => v !== null),
                notes: JSON.stringify({ ...cleanDataToSave, savedVisibleSections: visibleSections, savedColumnWidths: columnWidths }), 
                content: cleanDataToSave.today_work || '작업일보 세부 기록 참조'
            };
            const { data: existing } = await supabase.from('daily_site_reports').select('id, notes').eq('site_id', siteId).eq('report_date', formData.report_date);
            const targetId = existing?.find(r => (safeParseJSON(r.notes)?.report_category || 'plant') === categoryType)?.id || reportId;
            
            await supabase.from('daily_site_reports').upsert(targetId ? { id: targetId, ...payload } : payload);
            
            setOriginalData(JSON.parse(JSON.stringify(cleanDataToSave)));
            setFormData(JSON.parse(JSON.stringify(cleanDataToSave)));
            toast.success("저장되었습니다."); 
            
            if (!targetId) {
                const { data: newRow } = await supabase.from('daily_site_reports').select('id').eq('site_id', siteId).eq('report_date', formData.report_date).single();
                if (newRow) router.replace(`/sites/${siteId}/work?id=${newRow.id}&type=${categoryType}`);
            } else {
                router.refresh(); 
            }

            setView('detail'); 
            
        } catch (e) { toast.error("저장 오류"); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm("정말 이 보고서를 삭제하시겠습니까?")) return;
        try {
            await supabase.from('daily_site_reports').delete().eq('id', reportId);
            toast.success("삭제되었습니다."); 
            router.push(`/sites/${siteId}`);
            router.refresh();
        } catch (e) { toast.error("삭제 실패"); }
    };

    const executeImport = async () => {
        try {
            const { data: allReports } = await supabase.from('daily_site_reports').select('*').eq('site_id', siteId).eq('report_date', importDate);
            const match = allReports?.find(r => (safeParseJSON(r.notes)?.report_category || 'plant') === categoryType);
            if (!match) return toast.error(`데이터가 없습니다.`);
            const importedData = safeParseJSON(match.notes);
            if (match.photos?.length > 0) {
                setTomorrowPhotos(match.photos.map(p => ({ ...p, timeType: 'tomorrow' })));
                setTodayPhotos([]);
            }

           const baseDataForSync = {
                ...formData,
                ...importedData,
                report_date: formData.report_date,
                report_category: categoryType,
                prev_work: importedData.today_work || '', 
                today_work: '', 
                manual_ledger: (importedData.manual_ledger || []).map(row => {
                    // 🚀 불러오기 시: 전일 '기반입' + 전일 '금일반입'을 합산하여 오늘의 '기반입'으로 설정
                    const prevBaseInc = parseNumber(row.base_incoming);
                    const prevInc = parseNumber(row.incoming);
                    const newBaseInc = prevBaseInc + prevInc; 
                    const cont = parseNumber(row.contract);

                    return {
                        ...row,
                        id: uuidv4(),
                        contract: row.contract || '',
                        base_incoming: newBaseInc > 0 ? newBaseInc.toString() : '',
                        incoming: '', 
                        // 🚀 합산된 새 기반입을 바탕으로 미반입 자동 계산 (계약수량 - 새 기반입)
                        not_incoming: (cont > 0 || newBaseInc > 0) ? (cont - newBaseInc).toString() : '',
                        prev_remain: row.final_remain || '0', 
                        planted: '', 
                        final_remain: row.final_remain || '0', 
                        isPastRecord: true
                    };
                }),
                progress_plant: '0.0000',
                progress_facility: '0.0000',
                labor_costs: [],
                material_costs: [],
                equipment_costs: [],
                tree_costs: [],
                transport_costs: [],
                subcontract_costs: [],
                etc_costs: []
            };

            setFormData(await syncWithAllPastData(baseDataForSync, false));
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
        
        const sums = { '수목': getSum('tree_costs'), '자재납품 및 시공': getSum('subcontract_costs'), '자재비': getSum('material_costs'), '장비대': getSum('equipment_costs'), '노무비': getSum('labor_costs'), '운반비': getSum('transport_costs'), '기타경비': getSum('etc_costs') };
        
        const nextSettlement = (formData.settlement_costs || []).map(s => {
            const itemName = s.item === '자재납품 및 시공(외주)' ? '자재납품 및 시공' : s.item;
            return { ...s, item: itemName, today: sums[itemName] || 0, total: parseNumber(s.prev) + (sums[itemName] || 0) };
        });

        if (JSON.stringify(formData.settlement_costs) !== JSON.stringify(nextSettlement)) {
            setFormData(prev => ({ ...prev, settlement_costs: nextSettlement }));
        }
    }, [formData?.labor_costs, formData?.tree_costs, formData?.material_costs, formData?.equipment_costs, formData?.transport_costs, formData?.subcontract_costs, formData?.etc_costs, isReadOnly]);

    const renderTable = (key) => {
        if (!visibleSections[key]) return null;
        const config = FIELD_MAPS[key]; const allRows = formData?.[key] || [];
        const isCollapsed = collapsedSections[key]; const widths = columnWidths[key] || {};

        const todayRows = allRows.filter(r => !r.isPastRecord);
        const pastRows = allRows.filter(r => r.isPastRecord);
        const isExpanded = expandedSections[key];
        const displayRows = isExpanded ? [...todayRows, ...pastRows] : todayRows;

        const colSpanTotal = config.fields.length + (isReadOnly ? 0 : 1);

        return (
            <div key={key} className="break-inside-avoid w-full bg-white font-black border-b border-slate-400 last:border-b-0">
                <table className="min-w-full text-[9px] border-collapse" style={{ tableLayout: 'fixed' }}>
                    <thead className="font-sans">
                        <tr className="bg-yellow-50 border-b border-slate-400 h-8 cursor-pointer hover:bg-yellow-100 transition-colors" onClick={() => toggleSection(key)}>
                            <th colSpan={colSpanTotal} className="p-0 text-left align-middle relative border-r-0">
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
                                                        [key]: [{id:uuidv4(), isPastRecord: false, ...config.fields.reduce((a,f)=>({...a,[f]:''}),{})}, ...(p[key]||[])]
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
                                            <td key={f} className={`p-0 align-middle font-sans ${idx !== config.fields.length - 1 || !isReadOnly ? 'border-r border-slate-200' : ''}`} style={{ width: widths[idx] ? `${widths[idx]}px` : 'auto' }}>
                                                <input className={`block w-full h-full p-1 outline-none bg-transparent font-sans font-black rounded-none text-[8.5px] z-10 ${isNumeric ? 'text-right pr-2' : 'text-center px-1'}`}
                                                    value={isNumeric && focusedField !== fieldId ? formatNumber(row[f]) : (isNumeric && (row[f] === "0" || row[f] === 0) ? "" : row[f])}
                                                    readOnly={isReadOnly}
                                                    onFocus={() => isNumeric && setFocusedField(fieldId)}
                                                    onBlur={() => setFocusedField(null)}
                                                    onChange={e => {
                                                        if (isReadOnly) return;
                                                        const updated = [...allRows];
                                                        const rIdx = allRows.findIndex(x => x.id === row.id);
                                                        if (rIdx === -1) return;

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
                                    {!isReadOnly && <td className="text-center text-red-500 cursor-pointer p-0 text-xs font-black align-middle" onClick={()=>setFormData(p=>({...p, [key]: allRows.filter(x => x.id !== row.id)}))}>×</td>}
                                </tr>
                            ))}
                            {pastRows.length > 0 && (
                                <tr className="h-8">
                                    <td colSpan={colSpanTotal} className="bg-slate-50/50 p-0 text-center border-b border-slate-200 align-middle">
                                        {isExpanded ? (
                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedSections(p=>({...p, [key]: false})); }} className="text-[10px] text-red-500 font-black hover:bg-red-50 flex items-center justify-center gap-1 w-full h-full transition-all py-2">
                                                <ListMinus size={13} /> 전일 내역 접어놓기
                                            </button>
                                        ) : (
                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedSections(p=>({...p, [key]: true})); }} className="text-[10px] text-blue-600 font-black hover:bg-blue-50 flex items-center justify-center gap-1 w-full h-full transition-all py-2">
                                                <ListFilter size={13} /> 전일 내역 {pastRows.length}건 펼쳐보기 (입력 시 저장 후 위로 정렬됨)
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

                <div className="flex-1 px-8 text-center font-black text-[16px] text-slate-800 tracking-wide truncate">
                    {siteData?.name || '현장 작업일보'}
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
                        <div className="w-full bg-red-50/50 border-2 border-red-500 p-4 mb-4 shadow-md font-sans flex flex-col justify-center text-slate-900">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle size={20} className="text-red-600 animate-pulse"/>
                                <span className="font-black text-[13px] text-red-600 uppercase tracking-wider">💡 필수 확인: 일보 작성 및 출력 가이드</span>
                            </div>
                            <div className="flex flex-col gap-2 ml-7">
                                <div className="bg-red-100/80 p-2.5 rounded-sm border-l-4 border-red-600 flex items-start gap-2">
                                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-sm whitespace-nowrap mt-0.5">회장님 지시사항</span>
                                    <p className="text-[11px] font-black text-red-900 leading-relaxed">
                                        출력 시 내용이 가려지지 않도록, 반드시 <strong>표의 각 제목(헤더) 사이 경계선</strong>에 마우스를 올린 후 좌우로 드래그하여 엑셀처럼 열 너비를 조절하여 기입하십시오.
                                    </p>
                                </div>
                                <p className="text-[11px] font-bold leading-relaxed text-slate-700 pl-1 mt-1">
                                    2. 금일 작성 내역은 수정 중에는 제자리를 유지하며, <strong>작성을 완료 후 [일보 저장]을 누른 뒤 다시 접속하면 해당 공정 테이블의 최상단</strong>으로 자동 정렬됩니다.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="w-full bg-white border border-slate-400 shadow-sm font-sans flex flex-col">
                        
                        <div className="grid grid-cols-12 border-b border-slate-400 items-stretch">
                            {/* 🚀 패딩(p-6 -> px-4 py-2), 텍스트 크기(text-5xl -> text-3xl), 마진(mb-6 -> mb-2) 대폭 축소 */}
                            <div className="col-span-7 flex flex-col justify-between px-4 py-2 border-r border-slate-400">
                                <h1 className="text-3xl font-black uppercase tracking-[0.5em] text-left mb-2 font-sans">작 업 일 보</h1>
                                <div className="flex gap-1.5 flex-wrap items-end font-sans">
                                    <div className="flex border border-slate-400 text-[9px] font-black h-6 items-center px-2 bg-slate-50 uppercase">총 도급액: {formatNumber(formData?.total_contract_amount)}원</div>
                                    <div className="flex border border-slate-400 text-[9px] font-black h-6 items-center px-2 text-blue-700">금일 사용: {formatNumber(sTotals.today)}원</div>
                                    <div className="flex border border-slate-400 text-[10px] bg-red-50 font-black h-6 items-center px-3 text-red-600">누적 집행: {formatNumber(sTotals.total)}원 ({spendRate}%)</div>
                                    {(siteData?.is_plant_active || siteData?.is_facility_active) && (
                                        <div className="flex border border-slate-400 text-[10px] bg-blue-50 font-black h-6 items-center px-3 text-blue-800 gap-3">
                                            {siteData?.is_plant_active && <span>식재 공정률: {(parseNumber(formData?.progress_plant_prev) + parseNumber(formData?.progress_plant)).toFixed(4)}%</span>}
                                            {siteData?.is_plant_active && siteData?.is_facility_active && <div className="w-[1px] h-3 bg-blue-200" />}
                                            {siteData?.is_facility_active && <span>시설 공정률: {(parseNumber(formData?.progress_facility_prev) + parseNumber(formData?.progress_facility)).toFixed(4)}%</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="col-span-5 flex flex-col bg-white">
                                <table className="w-full text-[9px] border-collapse font-black h-full" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '18%' }} />
                                        <col style={{ width: '46%' }} />
                                        <col style={{ width: '18%' }} />
                                        <col style={{ width: '18%' }} />
                                    </colgroup>
                                    <tbody>
                                        {/* 🚀 우측 정보 테이블의 row 높이(h-8, h-10)도 컴팩트하게 조정 */}
                                        <tr className="border-b border-slate-400 h-6">
                                            <th className="bg-slate-50 border-r border-slate-400 font-black text-center">현장명</th>
                                            <td className="px-2 border-r border-slate-400 text-center whitespace-normal break-keep" title={siteData?.name}>
                                                <div className="line-clamp-2 leading-tight">
                                                    {siteData?.name}
                                                </div>
                                            </td>
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
                                                <tr key={k} className={`h-8 bg-blue-50 ${!isLastActive ? 'border-b border-slate-400' : ''}`}>
                                                    <th className="bg-blue-50 border-r border-slate-400 uppercase text-[8px] font-black text-center">
                                                        {k==='plant'?'식재공정':'시설공정'}
                                                    </th>
                                                    <td className="bg-white border-r border-slate-400 text-center leading-tight">
                                                        <div className="flex flex-col items-center justify-center h-full">
                                                            <span className="text-[6px] text-slate-400 font-sans">전일</span>
                                                            <span className="text-[10px] font-black">{formData?.[`progress_${k}_prev`] === '0.0000' ? '-' : formData?.[`progress_${k}_prev`]}</span>
                                                        </div>
                                                    </td>
                                                    <td colSpan={2} className="bg-blue-50/30 text-center leading-tight p-0">
                                                        <div className="flex flex-col items-center justify-center h-full w-full">
                                                            <span className="text-[6px] text-blue-400 font-black">금일(입력)</span>
                                                            <input className="w-full text-center text-[11px] text-blue-700 outline-none font-black bg-transparent" value={displayVal} readOnly={isReadOnly} onFocus={() => setFocusedField(fieldId)} onBlur={() => setFocusedField(null)} onChange={e=>setFormData({...formData, [`progress_${k}`]: e.target.value.replace(/[^0-9.]/g, '')})} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 border-b border-slate-400 items-stretch min-h-[220px]">
                            
                            <div className="col-span-3 flex flex-col border-r border-slate-400 bg-white">
                                
                                {/* 전일 작업 요약 */}
                                <div className="flex-1 border-b border-slate-400 flex flex-col bg-white">
                                    <div className="flex justify-between items-center px-3 py-2 border-b border-slate-300 bg-slate-50/50">
                                        <h3 className="text-[10px] font-black text-slate-800 flex items-center gap-1 uppercase tracking-widest"><ListMinus size={12}/> 전일 작업 요약</h3>
                                        {!isReadOnly && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const current = formData?.prev_work || '';
                                                    setFormData({...formData, prev_work: current ? current + '\n' : '\n'});
                                                }}
                                                className="bg-white border border-slate-300 px-2 py-0.5 rounded text-[9px] hover:bg-slate-100 text-slate-600 shadow-sm transition-all"
                                            >+ 추가</button>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col px-3 pb-2 overflow-y-auto">
                                        {isReadOnly ? (
                                            <div className="flex flex-col flex-1">
                                                {(formData?.prev_work || '').split('\n').filter(l => l.trim() !== '').length > 0 
                                                    ? (formData?.prev_work || '').split('\n').filter(l => l.trim() !== '').map((line, idx) => (
                                                        <div key={idx} className="flex items-start gap-2 py-1 border-b border-slate-100 min-h-[24px]">
                                                            <span className="text-[9px] font-black text-slate-300 w-4 text-center mt-0.5">{idx + 1}</span>
                                                            <span className="text-[10px] font-bold text-slate-900 flex-1 leading-tight break-all">{line}</span>
                                                        </div>
                                                    ))
                                                    : <div className="py-2 text-[10px] text-slate-400 font-bold">-</div>
                                                }
                                            </div>
                                        ) : (
                                            <div className="flex flex-col flex-1">
                                                {(formData?.prev_work || '').split('\n').map((line, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 py-1 border-b border-slate-100 min-h-[24px] group">
                                                        <span className="text-[9px] font-black text-slate-300 w-4 text-center mt-0.5">{idx + 1}</span>
                                                        <textarea 
                                                            ref={el => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                                            className="w-full flex-1 outline-none text-[10px] font-bold bg-transparent resize-none overflow-hidden leading-tight whitespace-pre-wrap placeholder:text-slate-300 mt-0.5 break-all" 
                                                            value={line} 
                                                            onChange={e => {
                                                                const lines = (formData?.prev_work || '').split('\n');
                                                                lines[idx] = e.target.value.replace(/\n/g, ''); 
                                                                setFormData({...formData, prev_work: lines.join('\n')});
                                                            }}
                                                            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                            rows={1}
                                                            placeholder="내용 입력"
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const lines = (formData?.prev_work || '').split('\n');
                                                                lines.splice(idx, 1);
                                                                setFormData({...formData, prev_work: lines.join('\n')});
                                                            }} 
                                                            className="text-red-400 hover:text-red-600 px-1 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* 금일 작업 요약 */}
                                <div className="flex-1 flex flex-col bg-white">
                                    <div className="flex justify-between items-center px-3 py-2 border-b border-slate-300 bg-blue-50/20">
                                        <h3 className="text-[10px] font-black text-blue-800 flex items-center gap-1 uppercase tracking-widest"><ListFilter size={12}/> 금일 작업 요약</h3>
                                        {!isReadOnly && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const current = formData?.today_work || '';
                                                    setFormData({...formData, today_work: current ? current + '\n' : '\n'});
                                                }}
                                                className="bg-white border border-blue-300 px-2 py-0.5 rounded text-[9px] hover:bg-blue-100 text-blue-700 shadow-sm transition-all"
                                            >+ 추가</button>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col px-3 pb-2 overflow-y-auto">
                                        {isReadOnly ? (
                                            <div className="flex flex-col flex-1">
                                                {(formData?.today_work || '').split('\n').filter(l => l.trim() !== '').length > 0 
                                                    ? (formData?.today_work || '').split('\n').filter(l => l.trim() !== '').map((line, idx) => (
                                                        <div key={idx} className="flex items-start gap-2 py-1 border-b border-slate-100 min-h-[24px]">
                                                            <span className="text-[9px] font-black text-blue-300 w-4 text-center mt-0.5">{idx + 1}</span>
                                                            <span className="text-[10px] font-bold text-blue-900 flex-1 leading-tight break-all">{line}</span>
                                                        </div>
                                                    ))
                                                    : <div className="py-2 text-[10px] text-blue-300 font-bold">-</div>
                                                }
                                            </div>
                                        ) : (
                                            <div className="flex flex-col flex-1">
                                                {(formData?.today_work || '').split('\n').map((line, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 py-1 border-b border-slate-100 min-h-[24px] group">
                                                        <span className="text-[9px] font-black text-blue-300 w-4 text-center mt-0.5">{idx + 1}</span>
                                                        <textarea 
                                                            ref={el => { if(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                                            className="w-full flex-1 outline-none text-[10px] font-bold bg-transparent resize-none overflow-hidden leading-tight text-blue-900 placeholder:text-blue-300 mt-0.5 break-all" 
                                                            value={line} 
                                                            onChange={e => {
                                                                const lines = (formData?.today_work || '').split('\n');
                                                                lines[idx] = e.target.value.replace(/\n/g, ''); 
                                                                setFormData({...formData, today_work: lines.join('\n')});
                                                            }}
                                                            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                            rows={1}
                                                            placeholder="내용 입력"
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const lines = (formData?.today_work || '').split('\n');
                                                                lines.splice(idx, 1);
                                                                setFormData({...formData, today_work: lines.join('\n')});
                                                            }} 
                                                            className="text-red-400 hover:text-red-600 px-1 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div className="col-span-5 border-r border-slate-400 bg-white flex flex-col overflow-hidden">
                                <ManualLedgerTable list={formData?.manual_ledger || []} setFormData={setFormData} readOnly={isReadOnly} />
                            </div>

                            <div className="col-span-4 bg-white flex flex-col">
                                <div className="bg-slate-800 text-white h-8 flex items-center justify-center text-[10px] uppercase font-black shrink-0">실시간 정산 내역 합계</div>
                                <table className="w-full text-[10px] border-collapse flex-1" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '25%' }} />
                                    </colgroup>
                                    <thead className="bg-slate-50 border-b border-slate-400 font-bold">
                                        <tr className="h-6 text-slate-500">
                                            <th className="border-r border-slate-400 text-center uppercase">항목</th>
                                            <th className="border-r border-slate-400 text-center uppercase">전일</th>
                                            <th className="border-r border-slate-400 text-center text-blue-600 font-bold uppercase">금일</th>
                                            <th className="text-center text-red-600 uppercase font-bold">누계</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-black">
                                        {(formData?.settlement_costs || []).map((row, idx) => (
                                            <tr key={idx} className="border-b border-slate-200 h-5 hover:bg-slate-50 transition-colors">
                                                <td className="bg-slate-50 border-r border-slate-200 text-center p-0.5">{row.item}</td>
                                                <td className="text-right px-4 border-r border-slate-200">{formatNumber(row.prev)}</td>
                                                <td className="text-right px-4 text-blue-700 border-r border-slate-200 font-black">{formatNumber(row.today)}</td>
                                                <td className="text-right px-4 text-red-600 font-bold">{formatNumber(row.total)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-100 font-black text-blue-800 h-7">
                                            <td className="text-center p-1 border-r border-slate-200 uppercase tracking-widest">총 합계</td>
                                            <td className="text-right px-4 border-r border-slate-200">{formatNumber(sTotals.prev)}</td>
                                            <td className="text-right px-4 text-blue-800 border-r border-slate-200 font-black">{formatNumber(sTotals.today)}</td>
                                            <td className="text-right px-4 text-red-800 font-black">{formatNumber(sTotals.total)}</td>
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