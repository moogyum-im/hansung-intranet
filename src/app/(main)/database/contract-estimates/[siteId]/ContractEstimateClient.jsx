'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Upload, Loader2, CheckCircle, AlertCircle,
  FileSpreadsheet, ChevronDown, ChevronUp, Trash2, Plus, ArrowLeftRight,
} from 'lucide-react';

/* ───────── 상수 ───────── */
const CATEGORY_META = {
  evergreen_tree:  { label: '1. 상록교목',      color: 'bg-emerald-50 text-emerald-700' },
  deciduous_tree:  { label: '2. 낙엽교목',      color: 'bg-lime-50 text-lime-700' },
  evergreen_shrub: { label: '3. 상록관목',      color: 'bg-teal-50 text-teal-700' },
  deciduous_shrub: { label: '4. 낙엽관목',      color: 'bg-green-50 text-green-700' },
  ground_flower:   { label: '5. 지피 및 초화류', color: 'bg-yellow-50 text-yellow-700' },
  supplementary:   { label: '6. 식재부대공사',   color: 'bg-orange-50 text-orange-700' },
  maintenance:     { label: '7. 유지관리공사',   color: 'bg-gray-50 text-gray-600' },
};
const CATEGORY_ORDER = Object.keys(CATEGORY_META);

/* ───────── 포맷 ───────── */
const fmtN = (n) => (Number(n) || 0).toLocaleString();
const fmtB = (n) => {
  const v = Number(n) || 0;
  if (!v) return '-';
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(2)}억`;
  if (Math.abs(v) >= 10000)     return `${Math.round(v / 10000).toLocaleString()}만원`;
  return `${v.toLocaleString()}원`;
};

/* ───────── 총공사비 계산 ───────── */
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

/* ───────── diff 계산 ───────── */
// item_name + spec + category 조합으로 항목 매칭
function calcDiff(baseItems, currentItems) {
  const key = (i) => `${i.item_name}|${i.spec || ''}|${i.category}`;

  const baseMap = new Map(baseItems.map(i => [key(i), i]));
  const currMap = new Map(currentItems.map(i => [key(i), i]));

  const result = [];

  // 현재 항목 처리 (추가 / 변경 / 동일)
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
        ...(changed && {
          _base: base,
          _delta: {
            quantity:         qtyDiff,
            total_amount:     totalDiff,
            material_amount:  (item.material_amount || 0) - (base.material_amount || 0),
            labor_amount:     (item.labor_amount || 0)    - (base.labor_amount || 0),
            overhead_amount:  (item.overhead_amount || 0) - (base.overhead_amount || 0),
          },
        }),
      });
    }
  }

  // 원계약에 있었지만 현재에 없는 항목 (삭제됨)
  for (const item of baseItems) {
    if (!currMap.has(key(item))) {
      result.push({ ...item, _diffStatus: 'removed' });
    }
  }

  return result;
}

/* ───────── 변경 요약 카드 ───────── */
function DiffSummary({ baseItems, currentItems, baseLabel }) {
  const diff        = calcDiff(baseItems, currentItems);
  const added       = diff.filter(i => i._diffStatus === 'added');
  const removed     = diff.filter(i => i._diffStatus === 'removed');
  const changed     = diff.filter(i => i._diffStatus === 'changed');

  const baseCosts   = calcCosts(baseItems);
  const currCosts   = calcCosts(currentItems);
  const delta       = currCosts.total - baseCosts.total;
  const isPos       = delta > 0;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
        {baseLabel} 대비 변경 요약
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 금액 변화 */}
        <div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl font-black text-gray-900">{fmtB(currCosts.total)}</span>
            {delta !== 0 && (
              <span className={`text-sm font-bold ${isPos ? 'text-red-500' : 'text-blue-500'}`}>
                {isPos ? '▲' : '▼'} {fmtB(Math.abs(delta))}
              </span>
            )}
            {delta === 0 && (
              <span className="text-xs text-gray-400">변동 없음</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{baseLabel} {fmtB(baseCosts.total)}</p>
        </div>

        {/* 항목 수 변화 */}
        <div className="flex gap-3">
          {added.length > 0 && (
            <div className="text-center px-3 py-2 bg-emerald-50 rounded-xl min-w-[60px]">
              <div className="text-lg font-black text-emerald-600">+{added.length}</div>
              <div className="text-[10px] text-emerald-500 font-semibold">추가</div>
            </div>
          )}
          {changed.length > 0 && (
            <div className="text-center px-3 py-2 bg-amber-50 rounded-xl min-w-[60px]">
              <div className="text-lg font-black text-amber-600">{changed.length}</div>
              <div className="text-[10px] text-amber-500 font-semibold">변경</div>
            </div>
          )}
          {removed.length > 0 && (
            <div className="text-center px-3 py-2 bg-red-50 rounded-xl min-w-[60px]">
              <div className="text-lg font-black text-red-500">-{removed.length}</div>
              <div className="text-[10px] text-red-400 font-semibold">삭제</div>
            </div>
          )}
          {added.length === 0 && changed.length === 0 && removed.length === 0 && (
            <div className="text-center px-3 py-2 bg-gray-50 rounded-xl">
              <div className="text-sm font-bold text-gray-400">항목 변경 없음</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── 업로드 모달 ───────── */
function UploadModal({ siteId, onSaved, onClose }) {
  const [step, setStep] = useState('drop'); // drop → ai → preview → saving → done
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [versionDate, setVersionDate] = useState('');
  const fileRef = useRef();

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setStep('ai');
    setError('');

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/contract-estimates/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'AI 파싱 실패');
      setParsed(data);
      setVersionLabel(data.meta?.version_label || '');
      setVersionDate(data.meta?.version_date || '');
      setStep('preview');
    } catch (e) {
      setError(e.message);
      setStep('drop');
    }
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleSave = async () => {
    setStep('saving');
    try {
      const res = await fetch(`/api/contract-estimates/${siteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta: { version_label: versionLabel, version_date: versionDate || null, is_change_order: parsed?.meta?.is_change_order },
          items: parsed.items,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setStep('done');
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (e) {
      setError(e.message);
      setStep('preview');
    }
  };

  const groupedItems = parsed ? CATEGORY_ORDER.reduce((acc, cat) => {
    const catItems = parsed.items.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {}) : {};

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            {step === 'drop' && '엑셀 파일 업로드'}
            {step === 'ai'   && 'AI 분석 중...'}
            {step === 'preview' && `미리보기 — ${parsed?.items?.length || 0}개 항목 추출됨`}
            {step === 'saving' && '저장 중...'}
            {step === 'done' && '저장 완료'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 드롭 영역 */}
          {(step === 'drop') && (
            <div
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">엑셀 파일을 여기에 드래그하거나 클릭하세요</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx 형식 지원 · AI가 자동으로 항목을 분석합니다</p>
              {error && <p className="mt-4 text-xs text-red-500 font-medium">{error}</p>}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => processFile(e.target.files[0])} />
            </div>
          )}

          {/* AI 분석 중 */}
          {step === 'ai' && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 size={36} className="animate-spin mb-4 text-blue-500" />
              <p className="text-sm font-semibold">Claude AI가 엑셀 구조를 분석하고 있습니다...</p>
              <p className="text-xs text-gray-400 mt-2">항목 수에 따라 10~30초 소요됩니다</p>
            </div>
          )}

          {/* 저장/완료 */}
          {(step === 'saving' || step === 'done') && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              {step === 'saving'
                ? <Loader2 size={36} className="animate-spin mb-4 text-blue-500" />
                : <CheckCircle size={36} className="mb-4 text-green-500" />}
              <p className="text-sm font-semibold">{step === 'saving' ? '저장 중...' : '저장 완료!'}</p>
            </div>
          )}

          {/* 미리보기 */}
          {step === 'preview' && parsed && (
            <div className="space-y-5">
              {/* 계약 구분 입력 */}
              <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">계약 구분</label>
                  <input
                    value={versionLabel}
                    onChange={e => setVersionLabel(e.target.value)}
                    placeholder="예: 원계약, 1차 변경계약"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
                <div className="w-48">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">계약 날짜</label>
                  <input
                    type="date"
                    value={versionDate}
                    onChange={e => setVersionDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
              </div>

              {/* 항목 테이블 */}
              {Object.entries(groupedItems).map(([cat, items]) => {
                const meta = CATEGORY_META[cat] || { label: cat, color: 'bg-gray-50 text-gray-600' };
                const catTotal = items.reduce((s, i) => s + (i.total_amount || 0), 0);
                return (
                  <div key={cat}>
                    <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg mb-1 ${meta.color}`}>
                      <span className="text-xs font-bold">{meta.label}</span>
                      <span className="text-xs font-semibold">{fmtB(catTotal)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[600px]">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-50">
                            <th className="text-left py-1.5 font-medium w-32">품명</th>
                            <th className="text-left py-1.5 font-medium w-28">규격</th>
                            <th className="text-right py-1.5 font-medium w-10">단위</th>
                            <th className="text-right py-1.5 font-medium w-12">수량</th>
                            <th className="text-right py-1.5 font-medium">재료비</th>
                            <th className="text-right py-1.5 font-medium">노무비</th>
                            <th className="text-right py-1.5 font-medium">경비</th>
                            <th className="text-right py-1.5 font-medium font-semibold">합계</th>
                          </tr>
                        </thead>
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

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-xs text-red-600">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        {step === 'preview' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-400">
              총 {parsed?.items?.length || 0}개 항목 · {fmtB(parsed?.items?.reduce((s, i) => s + (i.total_amount || 0), 0))}
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setParsed(null); setStep('drop'); }} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-800">
                다시 업로드
              </button>
              <button
                onClick={handleSave}
                disabled={!versionLabel}
                className="px-5 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── 총공사비 블록 ───────── */
function CostSummary({ items }) {
  const [vatAmount, setVatAmount] = useState(0);
  const [open, setOpen] = useState(true);
  const c = calcCosts(items, vatAmount);

  const rows = [
    { label: '순공사비 소계', value: c.pure, bold: true, border: true },
    { label: '건강보험료 (노무비 × 3.545%)', value: c.health },
    { label: '연금보험료 (노무비 × 4.5%)', value: c.pension },
    { label: '노인장기요양보험료 (건강보험 × 12.81%)', value: c.elderly },
    { label: '안전관리비 ((재+노+경) × 0.2%)', value: c.safety },
    { label: '건설기계대여지급보증 (순공사비 × 0.07%)', value: c.equip },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl">
      <button className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-100 text-left" onClick={() => setOpen(v => !v)}>
        <span className="text-sm font-bold text-gray-900">총공사비 계산</span>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 py-4 space-y-2">
          <div className="space-y-1 mb-3">
            {CATEGORY_ORDER.map(cat => {
              const catItems = items.filter(i => i.category === cat);
              if (!catItems.length) return null;
              const total = catItems.reduce((s, i) => s + (i.total_amount || 0), 0);
              return (
                <div key={cat} className="flex justify-between text-xs">
                  <span className="text-gray-500">{CATEGORY_META[cat]?.label || cat}</span>
                  <span className="font-semibold text-gray-700">{fmtN(total)}원</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            {rows.map((row, i) => (
              <div key={i} className={`flex justify-between text-xs ${row.border ? 'border-t border-gray-200 pt-2 mb-1' : ''}`}>
                <span className={row.bold ? 'font-bold text-gray-900' : 'text-gray-500'}>{row.label}</span>
                <span className={`${row.bold ? 'font-black text-gray-900' : 'font-semibold text-gray-700'}`}>{fmtN(row.value)}원</span>
              </div>
            ))}

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">매입부가세 (입력)</span>
              <input
                type="number"
                value={vatAmount || ''}
                onChange={e => setVatAmount(Number(e.target.value))}
                placeholder="0"
                className="w-36 text-right border border-gray-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1">
              <span className="text-gray-900">9. 공사원가</span>
              <span className="text-gray-900">{fmtN(c.costBase)}원</span>
            </div>
            <p className="text-[10px] text-gray-400">순공사비 + 보험료·수수료{c.vatAmount > 0 ? ' + 매입부가세' : ''}</p>

            <div className="flex justify-between text-base font-black border-t-2 border-gray-300 pt-3 mt-2">
              <span className="text-gray-900">10. 총공사비 (VAT 포함)</span>
              <span className="text-blue-700">{fmtN(c.total)}원</span>
            </div>
            <p className="text-[10px] text-gray-400">공사원가 × 1.1 (부가가치세 10%)</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── 항목 테이블 ───────── */
function ItemsTable({ items, baseItems, showDiff }) {
  const [openCats, setOpenCats] = useState(new Set(CATEGORY_ORDER));
  const toggle = (cat) => setOpenCats(prev => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });

  // diff 모드일 때 항목 계산 (삭제된 항목 포함)
  const diffItems = showDiff && baseItems ? calcDiff(baseItems, items) : null;

  const getDisplayItems = (cat) =>
    (diffItems || items).filter(i => i.category === cat);

  const rowBg = (item) => {
    if (!showDiff) return 'hover:bg-gray-50/50';
    return {
      added:     'bg-emerald-50/70 hover:bg-emerald-50',
      removed:   'bg-red-50/70 hover:bg-red-50',
      changed:   'bg-amber-50/70 hover:bg-amber-50',
      unchanged: 'hover:bg-gray-50/50',
    }[item._diffStatus] ?? 'hover:bg-gray-50/50';
  };

  // 변경 델타 배지
  const Delta = ({ value, isQty = false }) => {
    if (!value || value === 0) return null;
    const pos = value > 0;
    return (
      <div className={`text-[10px] font-bold leading-tight ${pos ? 'text-red-500' : 'text-blue-500'}`}>
        {pos ? '▲' : '▼'}{isQty ? fmtN(Math.abs(value)) : fmtB(Math.abs(value))}
      </div>
    );
  };

  // 변경 상태 태그
  const Tag = ({ status }) => {
    const cfg = {
      added:   'bg-emerald-100 text-emerald-700',
      removed: 'bg-red-100 text-red-600',
      changed: 'bg-amber-100 text-amber-700',
    }[status];
    const lbl = { added: '추가', removed: '삭제', changed: '변경' }[status];
    if (!cfg) return null;
    return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${cfg}`}>{lbl}</span>;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {CATEGORY_ORDER.map(cat => {
        const catItems = getDisplayItems(cat);
        if (!catItems.length) return null;

        const meta   = CATEGORY_META[cat];
        const isOpen = openCats.has(cat);

        // 카테고리 합계 = 삭제 항목 제외
        const activeItems = diffItems
          ? catItems.filter(i => i._diffStatus !== 'removed')
          : catItems;
        const catTotal = activeItems.reduce((s, i) => s + (i.total_amount || 0), 0);

        return (
          <div key={cat} className="border-b border-gray-50 last:border-0">
            <button
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 text-left"
              onClick={() => toggle(cat)}
            >
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
                  <thead>
                    <tr className="text-[11px] text-gray-400 border-b border-gray-50">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {catItems.map((item, idx) => {
                      const gone    = item._diffStatus === 'removed';
                      const mutated = item._diffStatus === 'changed';
                      const d       = item._delta;

                      return (
                        <tr key={idx} className={rowBg(item)}>
                          {showDiff && (
                            <td className="py-2 pr-1">
                              <Tag status={item._diffStatus} />
                            </td>
                          )}
                          <td className={`py-2 font-medium ${gone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {item.item_name}
                          </td>
                          <td className={`py-2 ${gone ? 'line-through text-gray-300' : 'text-gray-500'}`}>
                            {item.spec || '-'}
                          </td>
                          <td className={`py-2 text-right ${gone ? 'text-gray-300' : 'text-gray-500'}`}>
                            {item.unit || '-'}
                          </td>

                          {/* 수량 */}
                          <td className="py-2 text-right">
                            <div className={gone ? 'line-through text-gray-300' : 'text-gray-700'}>
                              {fmtN(item.quantity)}
                            </div>
                            {showDiff && mutated && <Delta value={d?.quantity} isQty />}
                          </td>

                          <td className={`py-2 text-right ${gone ? 'line-through text-gray-300' : 'text-gray-500'}`}>
                            {item.material_unit_price ? fmtN(item.material_unit_price) : '-'}
                          </td>
                          <td className={`py-2 text-right ${gone ? 'line-through text-gray-300' : 'text-gray-500'}`}>
                            {item.labor_unit_price ? fmtN(item.labor_unit_price) : '-'}
                          </td>

                          {/* 재료비 */}
                          <td className="py-2 text-right">
                            <div className={gone ? 'line-through text-gray-300' : 'text-gray-600'}>
                              {item.material_amount ? fmtN(item.material_amount) : '-'}
                            </div>
                            {showDiff && mutated && d?.material_amount !== 0 && <Delta value={d?.material_amount} />}
                          </td>

                          {/* 노무비 */}
                          <td className="py-2 text-right">
                            <div className={gone ? 'line-through text-gray-300' : 'text-gray-600'}>
                              {item.labor_amount ? fmtN(item.labor_amount) : '-'}
                            </div>
                            {showDiff && mutated && d?.labor_amount !== 0 && <Delta value={d?.labor_amount} />}
                          </td>

                          {/* 경비 */}
                          <td className="py-2 text-right">
                            <div className={gone ? 'line-through text-gray-300' : 'text-gray-600'}>
                              {item.overhead_amount ? fmtN(item.overhead_amount) : '-'}
                            </div>
                            {showDiff && mutated && d?.overhead_amount !== 0 && <Delta value={d?.overhead_amount} />}
                          </td>

                          {/* 합계 */}
                          <td className="py-2 text-right">
                            <div className={`font-bold ${gone ? 'line-through text-gray-300' : 'text-gray-900'}`}>
                              {fmtN(item.total_amount)}
                            </div>
                            {showDiff && mutated && d?.total_amount !== 0 && <Delta value={d?.total_amount} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={showDiff ? 7 : 6} className="pt-2 text-xs font-bold text-gray-700">소계</td>
                      <td className="pt-2 text-right text-xs font-bold text-gray-700">{fmtN(activeItems.reduce((s,i)=>s+(i.material_amount||0),0))}</td>
                      <td className="pt-2 text-right text-xs font-bold text-gray-700">{fmtN(activeItems.reduce((s,i)=>s+(i.labor_amount||0),0))}</td>
                      <td className="pt-2 text-right text-xs font-bold text-gray-700">{fmtN(activeItems.reduce((s,i)=>s+(i.overhead_amount||0),0))}</td>
                      <td className="pt-2 text-right text-xs font-black text-gray-900">{fmtN(catTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────── 메인 컴포넌트 ───────── */
export default function ContractEstimateClient({ site }) {
  const router = useRouter();
  const [estimates, setEstimates]   = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [compareIdx, setCompareIdx]   = useState(0);   // 비교 기준 차수 (기본: 원계약)
  const [showDiff, setShowDiff]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showModal, setShowModal]     = useState(false);

  const loadEstimates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contract-estimates/${site.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEstimates(Array.isArray(data) ? data : []);
      setSelectedIdx((Array.isArray(data) ? data.length : 1) - 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [site.id]);

  useEffect(() => { loadEstimates(); }, [loadEstimates]);

  const handleSelectIdx = (idx) => {
    setSelectedIdx(idx);
    setShowDiff(false);
    setCompareIdx(0); // 차수 바꾸면 비교 기준 초기화
  };

  const handleDelete = async (estimateId) => {
    if (!confirm('이 계약 차수를 삭제하시겠습니까?')) return;
    await fetch(`/api/contract-estimates/${site.id}?estimateId=${estimateId}`, { method: 'DELETE' });
    loadEstimates();
  };

  const currentEstimate = estimates[selectedIdx];
  const currentItems    = currentEstimate?.contract_estimate_items || [];
  const baseItems       = estimates[compareIdx]?.contract_estimate_items || [];
  const baseLabel       = estimates[compareIdx]?.version_label || '원계약';

  // 비교 가능 조건: 차수가 2개 이상이고 현재 선택이 원계약이 아닐 때
  const canCompare = estimates.length > 1 && selectedIdx > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {showModal && (
        <UploadModal
          siteId={site.id}
          onSaved={loadEstimates}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <button
          onClick={() => router.push('/database/contract-estimates')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={13} /> 목록으로
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase mb-0.5">계약 내역 관리</p>
            <h1 className="text-xl font-bold text-gray-900">{site.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{site.start_date} ~ {site.end_date}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors"
          >
            <Upload size={14} /> 엑셀 업로드
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">
        {/* 에러 */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-20 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && estimates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-gray-300">
            <FileSpreadsheet size={44} className="mb-4" />
            <p className="text-sm font-semibold text-gray-400">등록된 계약 내역이 없습니다</p>
            <p className="text-xs mt-1 mb-6">엑셀 파일을 업로드하면 AI가 자동으로 항목을 분석합니다</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700"
            >
              <Upload size={15} /> 엑셀 업로드
            </button>
          </div>
        )}

        {/* 차수 탭 + 비교 컨트롤 */}
        {!loading && estimates.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* 차수 탭 */}
              <div className="flex items-center gap-2 flex-wrap">
                {estimates.map((est, idx) => (
                  <div key={est.id} className="flex items-center">
                    <button
                      onClick={() => handleSelectIdx(idx)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        idx === selectedIdx
                          ? 'bg-gray-900 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {est.version_label}
                      {est.version_date && <span className="ml-1 opacity-60">({est.version_date})</span>}
                      {est.is_current && (
                        <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-600 px-1 rounded-sm font-bold">현재</span>
                      )}
                    </button>
                    {idx === selectedIdx && (
                      <button
                        onClick={() => handleDelete(est.id)}
                        className="ml-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-gray-700 border border-dashed border-gray-200 hover:border-gray-400 transition-colors"
                >
                  <Plus size={12} /> 변경계약 추가
                </button>
              </div>

              {/* 비교 컨트롤 — 원계약이 아닌 차수를 선택했을 때만 표시 */}
              {canCompare && (
                <div className="flex items-center gap-2">
                  {/* 비교 기준 선택 (3개 이상 차수일 때) */}
                  {estimates.length > 2 && selectedIdx > 1 && (
                    <select
                      value={compareIdx}
                      onChange={e => { setCompareIdx(Number(e.target.value)); setShowDiff(true); }}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                      {estimates.slice(0, selectedIdx).map((est, idx) => (
                        <option key={est.id} value={idx}>{est.version_label} 대비</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => setShowDiff(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      showDiff
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    <ArrowLeftRight size={12} />
                    {showDiff ? `${baseLabel} 대비 비교 중` : `${baseLabel} 대비 비교`}
                  </button>
                </div>
              )}
            </div>

            {/* 변경 요약 카드 */}
            {showDiff && canCompare && (
              <DiffSummary
                baseItems={baseItems}
                currentItems={currentItems}
                baseLabel={baseLabel}
              />
            )}

            {/* 항목 테이블 */}
            {currentItems.length > 0
              ? (
                <ItemsTable
                  items={currentItems}
                  baseItems={showDiff && canCompare ? baseItems : null}
                  showDiff={showDiff && canCompare}
                />
              )
              : <div className="text-center py-12 text-sm text-gray-300">이 차수에 항목이 없습니다</div>
            }

            {/* 총공사비 */}
            {currentItems.length > 0 && <CostSummary items={currentItems} />}
          </>
        )}
      </div>
    </div>
  );
}
