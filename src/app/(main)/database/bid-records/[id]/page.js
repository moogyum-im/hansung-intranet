'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import {
    ArrowLeft, Plus, Trash2, Upload, FileText, Download,
    Edit3, Check, X, Settings, ChevronDown, ChevronUp, AlertCircle,
    Sparkles, RefreshCw, Search
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

const ALLOWED = ['임아름', '임무겸'];

const fmtShort = (n) => {
    const v = Number(n) || 0;
    if (!v) return '-';
    if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(2)}억`;
    if (Math.abs(v) >= 10000) return `${Math.round(v / 10000).toLocaleString()}만`;
    return `${v.toLocaleString()}원`;
};

const KEYS = ['A', 'B', 'C']; // fallback, 실제 순서는 sortedKeys 사용

export default function BidRecordDetailPage() {
    const router = useRouter();
    const { id } = useParams();
    const { employee, loading } = useEmployee();

    const [project, setProject] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [items, setItems] = useState([]);
    const [costs, setCosts] = useState({});
    const [fetching, setFetching] = useState(true);

    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState('');
    const [editingCompanies, setEditingCompanies] = useState(false);
    const [companyDraft, setCompanyDraft] = useState({});

    const [newItemName, setNewItemName] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('식');
    const [addingItem, setAddingItem] = useState(false);

    const [editingCell, setEditingCell] = useState(null); // 'q_{itemId}' | 'p_{itemId}_{key}' | 'a_{itemId}_{key}'
    const [cellDraft, setCellDraft] = useState('');

    const [uploadingKey, setUploadingKey] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!loading && employee && !ALLOWED.includes(employee.full_name)) {
            router.replace('/dashboard');
        }
    }, [employee, loading, router]);

    const fetchAll = useCallback(async () => {
        if (!id) return;
        setFetching(true);

        const [{ data: proj }, { data: comps }, { data: itms }, { data: csts }] = await Promise.all([
            supabase.from('bid_projects').select('*').eq('id', id).single(),
            supabase.from('bid_companies').select('*').eq('project_id', id).order('company_key'),
            supabase.from('bid_items').select('*').eq('project_id', id).order('display_order').order('created_at'),
            supabase.from('bid_costs').select('*, bid_items!inner(project_id)').eq('bid_items.project_id', id),
        ]);

        setProject(proj);
        setCompanies(comps || []);
        setItems(itms || []);

        const costMap = {};
        for (const c of (csts || [])) {
            if (!costMap[c.item_id]) costMap[c.item_id] = {};
            costMap[c.item_id][c.company_key] = c;
        }
        setCosts(costMap);
        setFetching(false);
    }, [id]);

    useEffect(() => {
        if (!loading && employee && ALLOWED.includes(employee.full_name)) {
            fetchAll();
        }
    }, [employee, loading, fetchAll]);

    // 제목 저장
    const saveTitle = async () => {
        if (!titleDraft.trim()) return;
        const { error } = await supabase.from('bid_projects').update({ title: titleDraft.trim() }).eq('id', id);
        if (error) { toast.error('저장 실패'); return; }
        setProject(p => ({ ...p, title: titleDraft.trim() }));
        setEditingTitle(false);
        toast.success('제목이 저장되었습니다.');
    };

    // 회사명 저장
    const saveCompanies = async () => {
        const updates = Object.entries(companyDraft).map(([key, name]) =>
            supabase.from('bid_companies').update({ company_name: name.trim() })
                .eq('project_id', id).eq('company_key', key)
        );
        await Promise.all(updates);
        setCompanies(prev => prev.map(c => ({ ...c, company_name: companyDraft[c.company_key] ?? c.company_name })));
        setEditingCompanies(false);
        toast.success('회사명이 저장되었습니다.');
    };

    // 우리 회사 토글
    const toggleOurs = async (key) => {
        await supabase.from('bid_companies').update({ is_ours: false }).eq('project_id', id);
        await supabase.from('bid_companies').update({ is_ours: true }).eq('project_id', id).eq('company_key', key);
        setCompanies(prev => prev.map(c => ({ ...c, is_ours: c.company_key === key })));
        toast.success('우리 회사가 변경되었습니다.');
    };

    // 항목 추가
    const addItem = async () => {
        if (!newItemName.trim()) return;
        const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.display_order || 0)) + 1 : 0;
        const { data, error } = await supabase.from('bid_items')
            .insert({ project_id: id, item_name: newItemName.trim(), unit: newItemUnit, display_order: maxOrder })
            .select().single();
        if (error) { toast.error('추가 실패'); return; }
        setItems(prev => [...prev, data]);
        setNewItemName('');
        setNewItemUnit('식');
        setAddingItem(false);
    };

    // 항목 삭제
    const deleteItem = async (itemId) => {
        if (!confirm('이 항목을 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('bid_items').delete().eq('id', itemId);
        if (error) { toast.error('삭제 실패'); return; }
        setItems(prev => prev.filter(i => i.id !== itemId));
        setCosts(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    };

    // 셀 편집 시작
    const startEdit = (type, itemId, key) => {
        let current = '';
        if (type === 'q') current = items.find(i => i.id === itemId)?.quantity || '';
        else if (type === 'p') current = costs[itemId]?.[key]?.unit_price || '';
        else if (type === 'a') current = costs[itemId]?.[key]?.amount || '';
        setEditingCell(`${type}_${itemId}${key ? '_' + key : ''}`);
        setCellDraft(String(current));
    };

    // 셀 저장
    const saveCell = async (type, itemId, key) => {
        const value = Number(String(cellDraft).replace(/,/g, '')) || 0;

        if (type === 'q') {
            const { error } = await supabase.from('bid_items').update({ quantity: value }).eq('id', itemId);
            if (error) { toast.error('저장 실패'); return; }
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: value } : i));
        } else {
            const field = type === 'p' ? 'unit_price' : 'amount';
            const existing = costs[itemId]?.[key];
            let error;
            if (existing) {
                ({ error } = await supabase.from('bid_costs').update({ [field]: value }).eq('id', existing.id));
            } else {
                ({ error } = await supabase.from('bid_costs').insert({ item_id: itemId, company_key: key, [field]: value }));
            }
            if (error) { toast.error('저장 실패'); return; }
            setCosts(prev => ({
                ...prev,
                [itemId]: {
                    ...(prev[itemId] || {}),
                    [key]: { ...(prev[itemId]?.[key] || {}), item_id: itemId, company_key: key, [field]: value }
                }
            }));
        }
        setEditingCell(null);
        setCellDraft('');
    };

    // PDF 업로드
    const handlePdfUpload = async (e, companyKey) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') { toast.error('PDF 파일만 업로드 가능합니다.'); return; }

        setUploadingKey(companyKey);
        const path = `bid-pdfs/${id}/${companyKey}_${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from('bid-pdfs').upload(path, file, { upsert: true });
        if (upErr) { toast.error('업로드 실패: ' + upErr.message); setUploadingKey(null); return; }

        const { data: urlData } = supabase.storage.from('bid-pdfs').getPublicUrl(path);
        const { error: dbErr } = await supabase.from('bid_companies')
            .update({ pdf_url: urlData.publicUrl, pdf_filename: file.name })
            .eq('project_id', id).eq('company_key', companyKey);

        if (dbErr) { toast.error('DB 저장 실패'); setUploadingKey(null); return; }

        setCompanies(prev => prev.map(c =>
            c.company_key === companyKey
                ? { ...c, pdf_url: urlData.publicUrl, pdf_filename: file.name }
                : c
        ));
        toast.success(`${companies.find(c => c.company_key === companyKey)?.company_name || companyKey} PDF 업로드 완료`);
        setUploadingKey(null);
        e.target.value = '';
    };

    // AI 자동 파싱
    const handleAiParse = async (pdfUrl) => {
        if (!pdfUrl) { toast.error('PDF를 먼저 업로드하세요.'); return; }
        if (!confirm(`AI가 PDF를 분석해서 항목과 금액을 자동 입력합니다.\n기존에 입력된 항목은 모두 교체됩니다. 계속하시겠습니까?`)) return;

        setParsing(true);
        const t = toast.loading('AI가 PDF를 분석 중입니다... (최대 1-2분 소요)');

        try {
            const res = await fetch('/api/bid-records/parse-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdf_url: pdfUrl, project_id: id }),
            });
            const data = await res.json();
            toast.dismiss(t);

            if (!res.ok || !data.success) {
                toast.error(data.error || '파싱 실패');
            } else {
                toast.success(`${data.count}개 항목이 자동 입력되었습니다.`);
                await fetchAll();
            }
        } catch (e) {
            toast.dismiss(t);
            toast.error('오류: ' + e.message);
        } finally {
            setParsing(false);
        }
    };

    // 검색 필터
    const filteredItems = search.trim()
        ? items.filter(item =>
            item.item_name.toLowerCase().includes(search.toLowerCase()) ||
            (item.spec || '').toLowerCase().includes(search.toLowerCase())
          )
        : items;

    const oursKey = companies.find(c => c.is_ours)?.company_key;
    // 우리 회사를 맨 왼쪽으로
    const sortedKeys = companies.length
        ? [...companies].sort((a, b) => (b.is_ours ? 1 : 0) - (a.is_ours ? 1 : 0)).map(c => c.company_key)
        : KEYS;

    // 합계 계산 (전체 기준)
    const totals = sortedKeys.reduce((acc, key) => {
        acc[key] = items.reduce((sum, item) => sum + (Number(costs[item.id]?.[key]?.amount) || 0), 0);
        return acc;
    }, {});

    if (loading || fetching) return <div className="flex items-center justify-center h-64 text-slate-400">로딩 중...</div>;
    if (!employee || !ALLOWED.includes(employee.full_name)) return null;
    if (!project) return <div className="flex items-center justify-center h-64 text-slate-400">프로젝트를 찾을 수 없습니다.</div>;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <Toaster />

            {/* 헤더 */}
            <div className="flex items-start gap-4 mb-6">
                <button onClick={() => router.push('/database/bid-records')}
                    className="mt-1 p-2 hover:bg-slate-100 rounded-lg text-slate-500 shrink-0 transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                    {editingTitle ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={titleDraft}
                                onChange={e => setTitleDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                                className="text-xl font-bold text-slate-800 border-b-2 border-blue-500 outline-none bg-transparent flex-1"
                            />
                            <button onClick={saveTitle} className="p-1.5 bg-blue-600 text-white rounded-lg"><Check size={15} /></button>
                            <button onClick={() => setEditingTitle(false)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg"><X size={15} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h1 className="text-xl font-bold text-slate-800 truncate">{project.title}</h1>
                            <button onClick={() => { setTitleDraft(project.title); setEditingTitle(true); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded text-slate-400 transition-all">
                                <Edit3 size={14} />
                            </button>
                        </div>
                    )}
                    {project.bid_date && <p className="text-sm text-slate-500 mt-0.5">입찰일: {project.bid_date}</p>}
                </div>
                <button onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
                    <Settings size={14} />
                    설정
                    {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
            </div>

            {/* 설정 패널 */}
            {showSettings && (
                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">회사 설정</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {sortedKeys.map(key => {
                            const comp = companies.find(c => c.company_key === key);
                            return (
                                <div key={key} className="bg-white border border-slate-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-slate-500">{key}사</span>
                                        <button
                                            onClick={() => toggleOurs(key)}
                                            className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${comp?.is_ours ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}
                                        >
                                            {comp?.is_ours ? '✓ 우리 회사' : '우리 회사로 설정'}
                                        </button>
                                    </div>
                                    {editingCompanies ? (
                                        <input
                                            value={companyDraft[key] ?? comp?.company_name ?? ''}
                                            onChange={e => setCompanyDraft(prev => ({ ...prev, [key]: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder={`${key}사 이름`}
                                        />
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-800">{comp?.company_name || `${key}사`}</p>
                                    )}

                                    {/* PDF 업로드 */}
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        {comp?.pdf_url ? (
                                            <div className="flex items-center gap-2">
                                                <FileText size={13} className="text-blue-500 shrink-0" />
                                                <a href={comp.pdf_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:underline truncate flex-1">
                                                    {comp.pdf_filename || 'PDF 보기'}
                                                </a>
                                                <label className="cursor-pointer p-1 hover:bg-slate-100 rounded text-slate-400">
                                                    <Upload size={12} />
                                                    <input type="file" accept=".pdf" className="hidden"
                                                        onChange={e => handlePdfUpload(e, key)} />
                                                </label>
                                            </div>
                                        ) : (
                                            <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium transition-colors
                                                ${uploadingKey === key ? 'text-slate-400' : 'text-blue-600 hover:text-blue-700'}`}>
                                                {uploadingKey === key ? (
                                                    <><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />업로드 중...</>
                                                ) : (
                                                    <><Upload size={13} />PDF 첨부</>
                                                )}
                                                <input type="file" accept=".pdf" className="hidden"
                                                    disabled={uploadingKey !== null}
                                                    onChange={e => handlePdfUpload(e, key)} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-2">
                        {editingCompanies ? (
                            <>
                                <button onClick={saveCompanies} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                                    <Check size={13} />저장
                                </button>
                                <button onClick={() => { setEditingCompanies(false); setCompanyDraft({}); }}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                                    취소
                                </button>
                            </>
                        ) : (
                            <button onClick={() => {
                                setEditingCompanies(true);
                                setCompanyDraft(Object.fromEntries(companies.map(c => [c.company_key, c.company_name])));
                            }} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                                <Edit3 size={13} />회사명 수정
                            </button>
                        )}

                        {/* AI 자동 파싱 버튼 */}
                        {(() => {
                            const anyPdf = companies.find(c => c.pdf_url);
                            return anyPdf ? (
                                <button
                                    onClick={() => handleAiParse(anyPdf.pdf_url)}
                                    disabled={parsing}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                    {parsing ? (
                                        <><RefreshCw size={13} className="animate-spin" />분석 중...</>
                                    ) : (
                                        <><Sparkles size={13} />AI 자동 파싱</>
                                    )}
                                </button>
                            ) : (
                                <p className="text-xs text-slate-400">PDF를 먼저 업로드하면 AI가 자동으로 항목을 파싱합니다.</p>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* 합계 요약 카드 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {sortedKeys.map(key => {
                    const comp = companies.find(c => c.company_key === key);
                    const total = totals[key];
                    const isOurs = comp?.is_ours;
                    const diff = !isOurs && oursKey ? totals[oursKey] - total : null;

                    return (
                        <div key={key} className={`rounded-2xl p-4 border-2 transition-all ${isOurs ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOurs ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {comp?.company_name || `${key}사`}
                                </span>
                                {isOurs && <span className="text-[10px] font-black text-blue-600">우리 회사</span>}
                            </div>
                            <p className={`text-lg font-black mt-1 ${isOurs ? 'text-blue-700' : 'text-slate-800'}`}>
                                {total ? fmtShort(total) : '-'}
                            </p>
                            {total > 0 && <p className="text-[10px] text-slate-400 mt-0.5">{total.toLocaleString()}원</p>}
                            {diff !== null && total > 0 && (
                                <p className={`text-xs font-bold mt-2 ${diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    우리보다 {fmtShort(Math.abs(diff))} {diff > 0 ? '저렴' : '비쌈'}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 검색 */}
            <div className="relative mb-3">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="항목명 또는 규격 검색..."
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                    </button>
                )}
            </div>
            {search && (
                <p className="text-xs text-slate-400 mb-2 px-1">
                    {filteredItems.length}개 결과 / 전체 {items.length}개
                </p>
            )}

            {/* 비교 테이블 */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-800 text-white">
                                <th className="text-left px-3 py-3 text-xs font-bold w-8">#</th>
                                <th className="text-left px-3 py-3 text-xs font-bold min-w-[150px]">항목명</th>
                                <th className="text-center px-2 py-3 text-xs font-bold w-10">단위</th>
                                <th className="text-right px-3 py-3 text-xs font-bold w-16">수량</th>
                                {sortedKeys.map(key => {
                                    const comp = companies.find(c => c.company_key === key);
                                    const isOurs = comp?.is_ours;
                                    return (
                                        <th key={key} colSpan={2} className={`text-center px-2 py-3 text-xs font-bold min-w-[200px] border-l border-slate-600 ${isOurs ? 'bg-blue-700' : ''}`}>
                                            <div>{comp?.company_name || `${key}사`}</div>
                                            <div className={`font-normal text-[10px] mt-0.5 grid grid-cols-2 gap-4 ${isOurs ? 'text-blue-300' : 'text-slate-400'}`}>
                                                <span>단가</span><span>금액</span>
                                            </div>
                                        </th>
                                    );
                                })}
                                <th className="px-2 py-3 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={3 + KEYS.length + 1} className="text-center py-12 text-slate-400 text-sm">
                                        <AlertCircle size={24} className="mx-auto mb-2 text-slate-300" />
                                        {search ? `"${search}"에 해당하는 항목이 없습니다.` : '항목을 추가해 비교를 시작하세요.'}
                                    </td>
                                </tr>
                            )}
                            {filteredItems.map((item, idx) => {
                                const rowCosts = costs[item.id] || {};
                                const oursAmount = oursKey ? Number(rowCosts[oursKey]?.amount) || 0 : 0;

                                const EditCell = ({ cellKey, value, placeholder, onSave }) => {
                                    const isEditing = editingCell === cellKey;
                                    return isEditing ? (
                                        <div className="flex items-center gap-0.5">
                                            <input autoFocus type="text" value={cellDraft}
                                                onChange={e => setCellDraft(e.target.value.replace(/[^0-9]/g, ''))}
                                                onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') { setEditingCell(null); setCellDraft(''); } }}
                                                className="w-20 border border-blue-400 rounded px-1.5 py-0.5 text-xs text-right focus:outline-none"
                                            />
                                            <button onClick={onSave} className="p-0.5 bg-blue-600 text-white rounded"><Check size={10} /></button>
                                            <button onClick={() => { setEditingCell(null); setCellDraft(''); }} className="p-0.5 bg-slate-200 rounded"><X size={10} /></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => { setEditingCell(cellKey); setCellDraft(String(value || '')); }}
                                            className={`w-full text-right text-xs font-medium ${value ? 'text-slate-700' : 'text-slate-300 hover:text-slate-400'}`}>
                                            {value ? Number(value).toLocaleString() : placeholder}
                                        </button>
                                    );
                                };

                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 group">
                                        <td className="px-3 py-2 text-xs text-slate-400">{idx + 1}</td>
                                        <td className="px-3 py-2">
                                            <div className="font-semibold text-slate-800 text-sm leading-tight">{item.item_name}</div>
                                            {item.spec && <div className="text-xs text-slate-400 mt-0.5">{item.spec}</div>}
                                        </td>
                                        <td className="px-2 py-2 text-center text-xs text-slate-500">{item.unit}</td>
                                        <td className="px-3 py-2 text-right">
                                            <EditCell
                                                cellKey={`q_${item.id}`}
                                                value={item.quantity}
                                                placeholder="수량"
                                                onSave={() => saveCell('q', item.id)}
                                            />
                                        </td>
                                        {sortedKeys.map(key => {
                                            const comp = companies.find(c => c.company_key === key);
                                            const isOurs = comp?.is_ours;
                                            const costEntry = rowCosts[key];
                                            const unitPrice = Number(costEntry?.unit_price) || 0;
                                            const amount = Number(costEntry?.amount) || 0;
                                            const diff = !isOurs && oursAmount && amount ? oursAmount - amount : null;

                                            return (
                                                <td key={key} colSpan={2} className={`py-2 border-l border-slate-100 ${isOurs ? 'bg-blue-50' : ''}`}>
                                                    <div className="grid grid-cols-2">
                                                        <div className="px-2 border-r border-slate-100">
                                                            <EditCell
                                                                cellKey={`p_${item.id}_${key}`}
                                                                value={unitPrice}
                                                                placeholder="단가"
                                                                onSave={() => saveCell('p', item.id, key)}
                                                            />
                                                        </div>
                                                        <div className="px-2">
                                                            <EditCell
                                                                cellKey={`a_${item.id}_${key}`}
                                                                value={amount}
                                                                placeholder="금액"
                                                                onSave={() => saveCell('a', item.id, key)}
                                                            />
                                                            {diff !== null && amount > 0 && (
                                                                <div className={`text-[10px] font-bold text-right ${diff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                    {diff > 0 ? '▼' : '▲'}{Math.abs(diff).toLocaleString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-2 py-2 text-center">
                                            <button onClick={() => deleteItem(item.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-lg transition-all">
                                                <Trash2 size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* 합계 행 */}
                            {items.length > 0 && (
                                <tr className="bg-slate-800 text-white font-bold">
                                    <td colSpan={4} className="px-3 py-3 text-sm">합계</td>
                                    {sortedKeys.map(key => {
                                        const comp = companies.find(c => c.company_key === key);
                                        const isOurs = comp?.is_ours;
                                        const total = totals[key];
                                        return (
                                            <td key={key} colSpan={2} className={`px-3 py-3 text-right text-sm border-l border-slate-600 ${isOurs ? 'bg-blue-700 text-blue-100' : ''}`}>
                                                {total ? total.toLocaleString() : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-2" />
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 항목 추가 */}
            {addingItem ? (
                <div className="bg-white border border-blue-300 rounded-2xl p-4 flex items-center gap-3">
                    <input
                        autoFocus
                        type="text"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setAddingItem(false); }}
                        placeholder="항목명 입력 (예: 공사관리비, 자재비 등)"
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="text"
                        value={newItemUnit}
                        onChange={e => setNewItemUnit(e.target.value)}
                        placeholder="단위"
                        className="w-16 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={addItem} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                        <Check size={14} />추가
                    </button>
                    <button onClick={() => { setAddingItem(false); setNewItemName(''); setNewItemUnit('식'); }}
                        className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors">
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setAddingItem(true)}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-blue-400 text-slate-400 hover:text-blue-600 py-3.5 rounded-2xl text-sm font-semibold transition-all"
                >
                    <Plus size={16} />
                    항목 추가
                </button>
            )}

            {/* PDF 원본 링크 */}
            {companies.some(c => c.pdf_url) && (
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-slate-600 mb-3">첨부 PDF 원본</h3>
                    <div className="flex flex-wrap gap-3">
                        {companies.filter(c => c.pdf_url).map(c => (
                            <a key={c.company_key} href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-400 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-blue-600 transition-all">
                                <FileText size={15} className="text-red-500" />
                                {c.company_name} 입찰 내역서
                                <Download size={13} className="text-slate-400" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
