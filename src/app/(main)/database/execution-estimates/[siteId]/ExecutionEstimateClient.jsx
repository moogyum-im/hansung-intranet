'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Upload, Loader2, CheckCircle, AlertCircle,
  FileSpreadsheet, ChevronDown, ChevronUp, Trash2, Plus, ArrowLeftRight,
} from 'lucide-react';

/* ─── 카테고리 정의 ─── */
const CAT_CONTRACT = {
  evergreen_tree:  { label: '1. 상록교목',       color: 'bg-emerald-50 text-emerald-700' },
  deciduous_tree:  { label: '2. 낙엽교목',       color: 'bg-lime-50 text-lime-700' },
  evergreen_shrub: { label: '3. 상록관목',       color: 'bg-teal-50 text-teal-700' },
  deciduous_shrub: { label: '4. 낙엽관목',       color: 'bg-green-50 text-green-700' },
  ground_flower:   { label: '5. 지피 및 초화류', color: 'bg-yellow-50 text-yellow-700' },
  supplementary:   { label: '6. 식재부대공사',   color: 'bg-orange-50 text-orange-700' },
  maintenance:     { label: '7. 유지관리공사',   color: 'bg-gray-50 text-gray-600' },
};

/* ─── 포맷 ─── */
const fmtN = (n) => (Number(n) || 0).toLocaleString();
const fmtB = (n) => {
  const v = Number(n) || 0;
  if (!v) return '-';
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(2)}억`;
  if (Math.abs(v) >= 10000)     return `${Math.round(v / 10000).toLocaleString()}만원`;
  return `${v.toLocaleString()}원`;
};

/* ─── 총공사비 계산 (계약 내역용) ─── */
function calcCosts(items, vatAmount = 0) {
  const mat  = items.reduce((s, i) => s + (i.material_amount || 0), 0);
  const lab  = items.reduce((s, i) => s + (i.labor_amount || 0), 0);
  const ovh  = items.reduce((s, i) => s + (i.overhead_amount || 0), 0);
  const pure = items.reduce((s, i) => s + (i.total_amount || 0), 0);
  const trunc = (v) => Math.floor(v / 1000) * 1000;
  const health   = trunc(lab * 0.03545);
  const pension  = trunc(lab * 0.045);
  const elderly  = trunc(health * 0.1281);
  const safety   = trunc((mat + lab + ovh) * 0.002);
  const equip    = trunc(pure * 0.0007);
  const insurSum = health + pension + elderly + safety + equip;
  const costBase = pure + insurSum + (Number(vatAmount) || 0);
  const total    = Math.round(costBase * 1.1);
  return { pure, mat, lab, ovh, health, pension, elderly, safety, equip, insurSum, costBase, total, vatAmount: Number(vatAmount) || 0 };
}

/* ─── diff 계산 ─── */
function calcDiff(baseItems, currentItems) {
  const key = (i) => `${i.item_name}|${i.spec || ''}|${i.category}`;
  const baseMap = new Map(baseItems.map(i => [key(i), i]));
  const currMap = new Map(currentItems.map(i => [key(i), i]));
  const result = [];
  for (const item of currentItems) {
    const base = baseMap.get(key(item));
    if (!base) {
      result.push({ ...item, _diffStatus: 'added' });
    } else {
      const qtyDiff   = (item.quantity || 0) - (base.quantity || 0);
      const totalDiff = (item.total_amount || 0) - (base.total_amount || 0);
      const changed   = Math.abs(qtyDiff) > 0.001 || totalDiff !== 0;
      result.push({
        ...item,
        _diffStatus: changed ? 'changed' : 'unchanged',
        ...(changed && { _base: base, _delta: {
          quantity:        qtyDiff,
          total_amount:    totalDiff,
          material_amount: (item.material_amount || 0) - (base.material_amount || 0),
          labor_amount:    (item.labor_amount || 0) - (base.labor_amount || 0),
          overhead_amount: (item.overhead_amount || 0) - (base.overhead_amount || 0),
        }}),
      });
    }
  }
  for (const item of baseItems) {
    if (!currMap.has(key(item))) result.push({ ...item, _diffStatus: 'removed' });
  }
  return result;
}

/* ─── 변경 요약 ─── */
function DiffSummary({ baseItems, currentItems, baseLabel }) {
  const diff    = calcDiff(baseItems, currentItems);
  const added   = diff.filter(i => i._diffStatus === 'added');
  const removed = diff.filter(i => i._diffStatus === 'removed');
  const changed = diff.filter(i => i._diffStatus === 'changed');
  const baseTot = baseItems.reduce((s, i) => s + (i.total_amount || 0), 0);
  const currTot = currentItems.reduce((s, i) => s + (i.total_amount || 0), 0);
  const delta   = currTot - baseTot;
  const isPos   = delta > 0;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{baseLabel} 대비 변경 요약</p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl font-black text-gray-900">{fmtB(currTot)}</span>
            {delta !== 0 && <span className={`text-sm font-bold ${isPos ? 'text-red-500' : 'text-blue-500'}`}>{isPos ? '▲' : '▼'} {fmtB(Math.abs(delta))}</span>}
            {delta === 0 && <span className="text-xs text-gray-400">변동 없음</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{baseLabel} {fmtB(baseTot)}</p>
        </div>
        <div className="flex gap-3">
          {added.length > 0 && <div className="text-center px-3 py-2 bg-emerald-50 rounded-xl min-w-[60px]"><div className="text-lg font-black text-emerald-600">+{added.length}</div><div className="text-[10px] text-emerald-500 font-semibold">추가</div></div>}
          {changed.length > 0 && <div className="text-center px-3 py-2 bg-amber-50 rounded-xl min-w-[60px]"><div className="text-lg font-black text-amber-600">{changed.length}</div><div className="text-[10px] text-amber-500 font-semibold">변경</div></div>}
          {removed.length > 0 && <div className="text-center px-3 py-2 bg-red-50 rounded-xl min-w-[60px]"><div className="text-lg font-black text-red-500">-{removed.length}</div><div className="text-[10px] text-red-400 font-semibold">삭제</div></div>}
          {added.length === 0 && changed.length === 0 && removed.length === 0 && <div className="px-3 py-2 bg-gray-50 rounded-xl"><div className="text-sm font-bold text-gray-400">항목 변경 없음</div></div>}
        </div>
      </div>
    </div>
  );
}

/* ─── 업로드 모달 ─── */
function UploadModal({ siteId, apiBase, parseLabel, onSaved, onClose }) {
  const [step, setStep] = useState('drop');
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [versionDate, setVersionDate] = useState('');
  const fileRef = useRef();

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setStep('parsing'); setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await fetch(`/api/${apiBase}/parse`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '파싱 실패');
      setParsed(data);
      setVersionLabel(data.meta?.version_label || '');
      setVersionDate(data.meta?.version_date   || '');
      setStep('preview');
    } catch (e) { setError(e.message); setStep('drop'); }
  }, [apiBase]);

  const handleSave = async () => {
    setStep('saving');
    try {
      const res  = await fetch(`/api/${apiBase}/${siteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta: { version_label: versionLabel, version_date: versionDate || null }, items: parsed.items }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setStep('done');
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (e) { setError(e.message); setStep('preview'); }
  };

  const CATMETA = CAT_CONTRACT;
  const CATORDER = Object.keys(CATMETA);
  const groupedItems = parsed ? CATORDER.reduce((acc, cat) => {
    const items = parsed.items.filter(i => i.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {}) : {};

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            {step === 'drop'    && `${parseLabel} 엑셀 업로드`}
            {step === 'parsing' && 'AI 분석 중...'}
            {step === 'preview' && `미리보기 — ${parsed?.items?.length || 0}개 항목 추출됨`}
            {step === 'saving'  && '저장 중...'}
            {step === 'done'    && '저장 완료'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'drop' && (
            <div
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">엑셀 파일을 여기에 드래그하거나 클릭하세요</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx 형식 지원 · AI가 자동으로 항목을 분석합니다</p>
              {error && <p className="mt-4 text-xs text-red-500 font-medium">{error}</p>}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => processFile(e.target.files[0])} />
            </div>
          )}
          {(step === 'parsing' || step === 'saving') && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={36} className="animate-spin mb-4 text-blue-500" />
              <p className="text-sm font-semibold text-gray-500">{step === 'parsing' ? 'Claude AI가 파일을 분석하고 있습니다...' : '저장 중...'}</p>
            </div>
          )}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-20">
              <CheckCircle size={36} className="mb-4 text-green-500" />
              <p className="text-sm font-semibold text-gray-600">저장 완료!</p>
            </div>
          )}
          {step === 'preview' && parsed && (
            <div className="space-y-5">
              <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">구분 라벨</label>
                  <input value={versionLabel} onChange={e => setVersionLabel(e.target.value)} placeholder="예: 원계약, 1차 변경" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </div>
                <div className="w-48">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">날짜</label>
                  <input type="date" value={versionDate} onChange={e => setVersionDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </div>
              </div>
              {Object.entries(groupedItems).map(([cat, items]) => {
                const meta = CATMETA[cat] || { label: cat, color: 'bg-gray-50 text-gray-600' };
                return (
                  <div key={cat}>
                    <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg mb-1 ${meta.color}`}>
                      <span className="text-xs font-bold">{meta.label}</span>
                      <span className="text-xs font-semibold">{fmtB(items.reduce((s, i) => s + (i.total_amount || 0), 0))}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[600px]">
                        <thead><tr className="text-gray-400 border-b border-gray-50">
                          <th className="text-left py-1.5 font-medium w-32">품명</th>
                          <th className="text-left py-1.5 font-medium w-28">규격</th>
                          <th className="text-right py-1.5 font-medium w-10">단위</th>
                          <th className="text-right py-1.5 font-medium w-12">수량</th>
                          <th className="text-right py-1.5 font-medium">재료비</th>
                          <th className="text-right py-1.5 font-medium">노무비</th>
                          <th className="text-right py-1.5 font-medium">경비</th>
                          <th className="text-right py-1.5 font-medium font-semibold">합계</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-1.5 text-gray-800 font-medium">{item.item_name}</td>
                              <td className="py-1.5 text-gray-500">{item.spec || '-'}</td>
                              <td className="py-1.5 text-right text-gray-500">{item.unit || '-'}</td>
                              <td className="py-1.5 text-right text-gray-700">{fmtN(item.quantity)}</td>
                              <td className="py-1.5 text-right text-gray-600">{item.material_amount ? fmtN(item.material_amount) : '-'}</td>
                              <td className="py-1.5 text-right text-gray-600">{item.labor_amount ? fmtN(item.labor_amount) : '-'}</td>
                              <td className="py-1.5 text-right text-gray-600">{item.overhead_amount ? fmtN(item.overhead_amount) : '-'}</td>
                              <td className="py-1.5 text-right font-bold text-gray-900">{fmtN(item.total_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-xs text-red-600"><AlertCircle size={14} /> {error}</div>}
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-400">총 {parsed?.items?.length || 0}개 항목 · {fmtB(parsed?.items?.reduce((s, i) => s + (i.total_amount || 0), 0))}</p>
            <div className="flex gap-3">
              <button onClick={() => { setParsed(null); setStep('drop'); }} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-800">다시 업로드</button>
              <button onClick={handleSave} disabled={!versionLabel} className="px-5 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">저장</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 총공사비 블록 (계약 내역용) ─── */
function CostSummary({ items }) {
  const [vatAmount, setVatAmount] = useState(0);
  const [open, setOpen] = useState(true);
  const c = calcCosts(items, vatAmount);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl">
      <button className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-100 text-left" onClick={() => setOpen(v => !v)}>
        <span className="text-sm font-bold text-gray-900">총공사비 계산</span>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 py-4 space-y-2">
          <div className="space-y-1 mb-3">
            {Object.keys(CAT_CONTRACT).map(cat => {
              const catItems = items.filter(i => i.category === cat);
              if (!catItems.length) return null;
              const total = catItems.reduce((s, i) => s + (i.total_amount || 0), 0);
              return <div key={cat} className="flex justify-between text-xs"><span className="text-gray-500">{CAT_CONTRACT[cat].label}</span><span className="font-semibold text-gray-700">{fmtN(total)}원</span></div>;
            })}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            {[
              { label: '순공사비 소계',                         value: c.pure,    bold: true, border: true },
              { label: '건강보험료 (노무비 × 3.545%)',           value: c.health },
              { label: '연금보험료 (노무비 × 4.5%)',             value: c.pension },
              { label: '노인장기요양보험료 (건강보험 × 12.81%)', value: c.elderly },
              { label: '안전관리비 ((재+노+경) × 0.2%)',         value: c.safety },
              { label: '건설기계대여지급보증 (순공사비 × 0.07%)', value: c.equip },
            ].map((row, i) => (
              <div key={i} className={`flex justify-between text-xs ${row.border ? 'border-t border-gray-200 pt-2 mb-1' : ''}`}>
                <span className={row.bold ? 'font-bold text-gray-900' : 'text-gray-500'}>{row.label}</span>
                <span className={row.bold ? 'font-black text-gray-900' : 'font-semibold text-gray-700'}>{fmtN(row.value)}원</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">매입부가세 (입력)</span>
              <input type="number" value={vatAmount || ''} onChange={e => setVatAmount(Number(e.target.value))} placeholder="0" className="w-36 text-right border border-gray-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1"><span className="text-gray-900">9. 공사원가</span><span className="text-gray-900">{fmtN(c.costBase)}원</span></div>
            <p className="text-[10px] text-gray-400">순공사비 + 보험료·수수료{c.vatAmount > 0 ? ' + 매입부가세' : ''}</p>
            <div className="flex justify-between text-base font-black border-t-2 border-gray-300 pt-3 mt-2"><span className="text-gray-900">10. 총공사비 (VAT 포함)</span><span className="text-blue-700">{fmtN(c.total)}원</span></div>
            <p className="text-[10px] text-gray-400">공사원가 × 1.1 (부가가치세 10%)</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 항목 테이블 ─── */
function ItemsTable({ items, baseItems, showDiff, catMeta }) {
  const CATORDER = Object.keys(catMeta);
  const [openCats, setOpenCats] = useState(new Set(CATORDER));
  const toggle = (cat) => setOpenCats(prev => { const next = new Set(prev); next.has(cat) ? next.delete(cat) : next.add(cat); return next; });

  const diffItems = showDiff && baseItems ? calcDiff(baseItems, items) : null;
  const getDisplayItems = (cat) => (diffItems || items).filter(i => i.category === cat);
  const rowBg = (item) => {
    if (!showDiff) return 'hover:bg-gray-50/50';
    return { added: 'bg-emerald-50/70', removed: 'bg-red-50/70', changed: 'bg-amber-50/70', unchanged: 'hover:bg-gray-50/50' }[item._diffStatus] ?? 'hover:bg-gray-50/50';
  };
  const Delta = ({ value, isQty = false }) => {
    if (!value || value === 0) return null;
    const pos = value > 0;
    return <div className={`text-[10px] font-bold leading-tight ${pos ? 'text-red-500' : 'text-blue-500'}`}>{pos ? '▲' : '▼'}{isQty ? fmtN(Math.abs(value)) : fmtB(Math.abs(value))}</div>;
  };
  const Tag = ({ status }) => {
    const cfg = { added: 'bg-emerald-100 text-emerald-700', removed: 'bg-red-100 text-red-600', changed: 'bg-amber-100 text-amber-700' }[status];
    const lbl = { added: '추가', removed: '삭제', changed: '변경' }[status];
    if (!cfg) return null;
    return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${cfg}`}>{lbl}</span>;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {CATORDER.map(cat => {
        const catItems = getDisplayItems(cat);
        if (!catItems.length) return null;
        const meta = catMeta[cat];
        const isOpen = openCats.has(cat);
        const activeItems = diffItems ? catItems.filter(i => i._diffStatus !== 'removed') : catItems;
        const catTotal = activeItems.reduce((s, i) => s + (i.total_amount || 0), 0);

        return (
          <div key={cat} className="border-b border-gray-50 last:border-0">
            <button className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 text-left" onClick={() => toggle(cat)}>
              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${meta.color}`}>{meta.label}</span>
                <span className="text-xs text-gray-400">{catItems.length}개 항목</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-800">{fmtN(catTotal)}원</span>
                {isOpen ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
              </div>
            </button>
            {isOpen && (
              <div className="overflow-x-auto px-5 pb-3">
                <table className="w-full text-xs min-w-[700px]">
                  <thead><tr className="text-[11px] text-gray-400 border-b border-gray-50">
                    {showDiff && <th className="py-2 w-10" />}
                    <th className="text-left py-2 font-medium">품명</th>
                    <th className="text-left py-2 font-medium">규격</th>
                    <th className="text-right py-2 font-medium">단위</th>
                    <th className="text-right py-2 font-medium">수량</th>
                    <th className="text-right py-2 font-medium">재료비 단가</th>
                    <th className="text-right py-2 font-medium">노무비 단가</th>
                    <th className="text-right py-2 font-medium">재료비</th>
                    <th className="text-right py-2 font-medium">노무비</th>
                    <th className="text-right py-2 font-medium">경비</th>
                    <th className="text-right py-2 font-semibold text-gray-600">합계</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {catItems.map((item, idx) => {
                      const gone = item._diffStatus === 'removed';
                      const mutated = item._diffStatus === 'changed';
                      const d = item._delta;
                      return (
                        <tr key={idx} className={rowBg(item)}>
                          {showDiff && <td className="py-2 pr-1"><Tag status={item._diffStatus} /></td>}
                          <td className={`py-2 font-medium ${gone ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.item_name}</td>
                          <td className={`py-2 ${gone ? 'line-through text-gray-300' : 'text-gray-500'}`}>{item.spec || '-'}</td>
                          <td className={`py-2 text-right ${gone ? 'text-gray-300' : 'text-gray-500'}`}>{item.unit || '-'}</td>
                          <td className="py-2 text-right">
                            <div className={gone ? 'line-through text-gray-300' : 'text-gray-700'}>{fmtN(item.quantity)}</div>
                            {showDiff && mutated && <Delta value={d?.quantity} isQty />}
                          </td>
                          <td className={`py-2 text-right ${gone ? 'line-through text-gray-300' : 'text-gray-500'}`}>{item.material_unit_price ? fmtN(item.material_unit_price) : '-'}</td>
                          <td className={`py-2 text-right ${gone ? 'line-through text-gray-300' : 'text-gray-500'}`}>{item.labor_unit_price ? fmtN(item.labor_unit_price) : '-'}</td>
                          <td className="py-2 text-right">
                            <div className={gone ? 'line-through text-gray-300' : 'text-gray-600'}>{item.material_amount ? fmtN(item.material_amount) : '-'}</div>
                            {showDiff && mutated && d?.material_amount !== 0 && <Delta value={d?.material_amount} />}
                          </td>
                          <td className="py-2 text-right">
                            <div className={gone ? 'line-through text-gray-300' : 'text-gray-600'}>{item.labor_amount ? fmtN(item.labor_amount) : '-'}</div>
                            {showDiff && mutated && d?.labor_amount !== 0 && <Delta value={d?.labor_amount} />}
                          </td>
                          <td className="py-2 text-right">
                            <div className={gone ? 'line-through text-gray-300' : 'text-gray-600'}>{item.overhead_amount ? fmtN(item.overhead_amount) : '-'}</div>
                            {showDiff && mutated && d?.overhead_amount !== 0 && <Delta value={d?.overhead_amount} />}
                          </td>
                          <td className="py-2 text-right">
                            <div className={`font-bold ${gone ? 'line-through text-gray-300' : 'text-gray-900'}`}>{fmtN(item.total_amount)}</div>
                            {showDiff && mutated && d?.total_amount !== 0 && <Delta value={d?.total_amount} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-t border-gray-200">
                    <td colSpan={showDiff ? 7 : 6} className="pt-2 text-xs font-bold text-gray-700">소계</td>
                    <td className="pt-2 text-right text-xs font-bold text-gray-700">{fmtN(activeItems.reduce((s,i)=>s+(i.material_amount||0),0))}</td>
                    <td className="pt-2 text-right text-xs font-bold text-gray-700">{fmtN(activeItems.reduce((s,i)=>s+(i.labor_amount||0),0))}</td>
                    <td className="pt-2 text-right text-xs font-bold text-gray-700">{fmtN(activeItems.reduce((s,i)=>s+(i.overhead_amount||0),0))}</td>
                    <td className="pt-2 text-right text-xs font-black text-gray-900">{fmtN(catTotal)}</td>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── 내역 패널 (계약/실행 공통) ─── */
function EstimatePanel({ siteId, apiBase, itemsKey, catMeta, addLabel, showCostSummary }) {
  const [estimates, setEstimates] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [compareIdx, setCompareIdx]   = useState(0);
  const [showDiff, setShowDiff]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showModal, setShowModal]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/${apiBase}/${siteId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const arr = Array.isArray(data) ? data : [];
      setEstimates(arr);
      setSelectedIdx(Math.max(0, arr.length - 1));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [siteId, apiBase]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('이 차수를 삭제하시겠습니까?')) return;
    await fetch(`/api/${apiBase}/${siteId}?estimateId=${id}`, { method: 'DELETE' });
    load();
  };

  const current     = estimates[selectedIdx];
  const currentItems = current?.[itemsKey] || [];
  const baseItems    = estimates[compareIdx]?.[itemsKey] || [];
  const baseLabel    = estimates[compareIdx]?.version_label || '이전';
  const canCompare   = estimates.length > 1 && selectedIdx > 0;

  if (loading) return <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}</div>;
  if (error) return <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"><AlertCircle size={15} /> {error}</div>;

  if (estimates.length === 0) return (
    <>
      {showModal && <UploadModal siteId={siteId} apiBase={apiBase} parseLabel={addLabel} onSaved={load} onClose={() => setShowModal(false)} />}
      <div className="flex flex-col items-center justify-center py-32 text-gray-300">
        <FileSpreadsheet size={44} className="mb-4" />
        <p className="text-sm font-semibold text-gray-400">등록된 내역이 없습니다</p>
        <p className="text-xs mt-1 mb-6">엑셀 파일을 업로드하면 AI가 자동으로 항목을 분석합니다</p>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700">
          <Upload size={15} /> 엑셀 업로드
        </button>
      </div>
    </>
  );

  return (
    <>
      {showModal && <UploadModal siteId={siteId} apiBase={apiBase} parseLabel={addLabel} onSaved={load} onClose={() => setShowModal(false)} />}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {estimates.map((est, idx) => (
            <div key={est.id} className="flex items-center">
              <button
                onClick={() => { setSelectedIdx(idx); setShowDiff(false); setCompareIdx(0); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${idx === selectedIdx ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}
              >
                {est.version_label}
                {est.version_date && <span className="ml-1 opacity-60">({est.version_date})</span>}
                {est.is_current && <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-600 px-1 rounded-sm font-bold">현재</span>}
              </button>
              {idx === selectedIdx && (
                <button onClick={() => handleDelete(est.id)} className="ml-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
              )}
            </div>
          ))}
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-gray-700 border border-dashed border-gray-200 hover:border-gray-400 transition-colors">
            <Plus size={12} /> {addLabel} 추가
          </button>
        </div>

        {canCompare && (
          <div className="flex items-center gap-2">
            {estimates.length > 2 && selectedIdx > 1 && (
              <select value={compareIdx} onChange={e => { setCompareIdx(Number(e.target.value)); setShowDiff(true); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none">
                {estimates.slice(0, selectedIdx).map((est, idx) => <option key={est.id} value={idx}>{est.version_label} 대비</option>)}
              </select>
            )}
            <button
              onClick={() => setShowDiff(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${showDiff ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'}`}
            >
              <ArrowLeftRight size={12} />
              {showDiff ? `${baseLabel} 대비 비교 중` : `${baseLabel} 대비 비교`}
            </button>
          </div>
        )}
      </div>

      {showDiff && canCompare && <DiffSummary baseItems={baseItems} currentItems={currentItems} baseLabel={baseLabel} />}

      {currentItems.length > 0
        ? <ItemsTable items={currentItems} baseItems={showDiff && canCompare ? baseItems : null} showDiff={showDiff && canCompare} catMeta={catMeta} />
        : <div className="text-center py-12 text-sm text-gray-300">이 차수에 항목이 없습니다</div>
      }

      {currentItems.length > 0 && showCostSummary && <CostSummary items={currentItems} />}

    </>
  );
}

/* ─── 메인 컴포넌트 ─── */
export default function ExecutionEstimateClient({ site }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <button onClick={() => router.push('/database/execution-estimates')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors">
          <ArrowLeft size={13} /> 목록으로
        </button>
        <div>
          <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase mb-0.5">내역 관리</p>
          <h1 className="text-xl font-bold text-gray-900">{site.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{site.start_date} ~ {site.end_date}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <EstimatePanel
          siteId={site.id}
          apiBase="contract-estimates"
          itemsKey="contract_estimate_items"
          catMeta={CAT_CONTRACT}
          addLabel="변경계약"
          showCostSummary={true}
        />
      </div>
    </div>
  );
}
