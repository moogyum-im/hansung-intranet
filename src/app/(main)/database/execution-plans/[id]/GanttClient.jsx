'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  { id: 'evergreen_tree',   label: '상록교목',       color: '#16a34a' },
  { id: 'deciduous_tree',   label: '낙엽교목',       color: '#ca8a04' },
  { id: 'evergreen_shrub',  label: '상록관목',       color: '#0891b2' },
  { id: 'deciduous_shrub',  label: '낙엽관목',       color: '#d97706' },
  { id: 'ground_flower',    label: '지피 및 초화류',  color: '#db2777' },
  { id: 'base_work',        label: '식재기반조성',    color: '#6366f1' },
  { id: 'subsidiary',       label: '식재부대공사',    color: '#64748b' },
];

const UNITS = ['주', '본', 'm²', 'm', '식'];
const MONTH_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const LEFT_W = 440;
const COL_W  = 40;
const ROW_H  = 36;

function generateColumns(startDate, endDate) {
  const cols = [];
  const end = new Date(endDate);
  let cur = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear(), m = cur.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    [10, 20, last].forEach(d => {
      const date = new Date(y, m, d);
      if (date <= new Date(end.getFullYear(), end.getMonth(), new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate())) {
        cols.push({ year: y, month: m, day: d, isLast: d === last });
      }
    });
    cur = new Date(y, m + 1, 1);
  }
  return cols;
}

function groupByMonth(cols) {
  const groups = [];
  cols.forEach(col => {
    const key = `${col.year}-${col.month}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.count++;
    else groups.push({ key, year: col.year, month: col.month, count: 1 });
  });
  return groups;
}

function calcBarStyle(planStart, planEnd, pStart, pEnd) {
  const totalMs = new Date(planEnd).getTime() - new Date(planStart).getTime();
  if (totalMs <= 0) return null;
  const s = Math.max(new Date(pStart).getTime(), new Date(planStart).getTime());
  const e = Math.min(new Date(pEnd).getTime(), new Date(planEnd).getTime());
  if (e <= s) return null;
  const left = ((s - new Date(planStart).getTime()) / totalMs) * 100;
  const width = Math.max(((e - s) / totalMs) * 100, 0.3);
  return { left: `${left}%`, width: `${width}%` };
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSubmit, label, disabled, color }) {
  return (
    <div className="flex gap-2 mt-5">
      <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">취소</button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="flex-1 py-2.5 rounded-xl text-sm text-white font-semibold disabled:opacity-40 transition-opacity"
        style={{ backgroundColor: color || '#111827' }}
      >
        {label}
      </button>
    </div>
  );
}

function ItemModal({ categoryId, onSubmit, onClose }) {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  const [form, setForm] = useState({ category: categoryId, species_name: '', spec: '', unit: '주', quantity: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.species_name.trim() && form.quantity;

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  };

  return (
    <Modal title="항목 추가" onClose={onClose}>
      <div className="mb-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: cat?.color }}>
          {cat?.label}
        </span>
      </div>
      <div className="space-y-3">
        <Field label="수종명 *">
          <input value={form.species_name} onChange={e => set('species_name', e.target.value)} placeholder="예: 소나무" className={inputCls} autoFocus />
        </Field>
        <Field label="규격">
          <input value={form.spec} onChange={e => set('spec', e.target.value)} placeholder="예: H4.0xR20, R30, H2.5xW1.2" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="수량 *">
            <input type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          <Field label="단위">
            <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inputCls + ' bg-white'}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <ModalActions onClose={onClose} onSubmit={handleSubmit} label={loading ? '저장 중...' : '추가'} disabled={!valid || loading} color={cat?.color} />
    </Modal>
  );
}

function PeriodModal({ planStart, planEnd, onSubmit, onClose }) {
  const [form, setForm] = useState({ start_date: planStart, end_date: '', note: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.start_date && form.end_date && form.start_date <= form.end_date;

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  };

  return (
    <Modal title="반입 기간 추가" onClose={onClose}>
      <p className="text-xs text-gray-400 mb-4">같은 항목에 기간 제한 없이 추가 가능합니다 (분할 반입)</p>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작일 *">
            <input type="date" value={form.start_date} min={planStart} max={planEnd}
              onChange={e => set('start_date', e.target.value)} className={inputCls} />
          </Field>
          <Field label="종료일 *">
            <input type="date" value={form.end_date} min={form.start_date || planStart} max={planEnd}
              onChange={e => set('end_date', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="비고">
          <input value={form.note} onChange={e => set('note', e.target.value)}
            placeholder="예: 1차 반입, 2차 반입" className={inputCls} />
        </Field>
      </div>
      <ModalActions onClose={onClose} onSubmit={handleSubmit} label={loading ? '저장 중...' : '추가'} disabled={!valid || loading} />
    </Modal>
  );
}

export default function GanttClient({ plan, items: initItems }) {
  const [items, setItems]           = useState(initItems);
  const [collapsed, setCollapsed]   = useState({});
  const [itemModal, setItemModal]   = useState(null); // { categoryId }
  const [periodModal, setPeriodModal] = useState(null); // { itemId }

  const columns    = useMemo(() => generateColumns(plan.start_date, plan.end_date), [plan]);
  const monthGroups = useMemo(() => groupByMonth(columns), [columns]);
  const ganttW     = columns.length * COL_W;
  const totalW     = LEFT_W + ganttW;

  const byCategory = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map(c => [c.id, []]));
    items.forEach(item => { if (map[item.category]) map[item.category].push(item); });
    return map;
  }, [items]);

  const toggleCollapse = id => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  /* ── CRUD handlers ── */
  const addItem = async (data) => {
    const res = await fetch(`/api/execution-plans/${plan.id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (res.ok) {
      const item = await res.json();
      setItems(p => [...p, { ...item, periods: [] }]);
    }
    setItemModal(null);
  };

  const deleteItem = async (itemId) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/execution-plans/${plan.id}/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) setItems(p => p.filter(i => i.id !== itemId));
  };

  const addPeriod = async (itemId, data) => {
    const res = await fetch(`/api/execution-plans/${plan.id}/items/${itemId}/periods`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (res.ok) {
      const period = await res.json();
      setItems(p => p.map(i => i.id === itemId ? { ...i, periods: [...(i.periods || []), period] } : i));
    }
    setPeriodModal(null);
  };

  const deletePeriod = async (itemId, periodId) => {
    const res = await fetch(`/api/execution-plans/${plan.id}/items/${itemId}/periods/${periodId}`, { method: 'DELETE' });
    if (res.ok) setItems(p => p.map(i => i.id === itemId ? { ...i, periods: i.periods.filter(p => p.id !== periodId) } : i));
  };

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── 상단 헤더 ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase mb-0.5">공사 예정 공정표</p>
          <h1 className="text-lg font-bold text-gray-900">{plan.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{plan.site?.name && `${plan.site.name} · `}{plan.start_date} ~ {plan.end_date}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
          plan.status === '진행' ? 'bg-blue-100 text-blue-700' :
          plan.status === '완료' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
        }`}>{plan.status}</span>
      </div>

      {/* ── 간트 본체 (단일 스크롤 컨테이너) ── */}
      <div className="flex-1 overflow-auto">
        <div style={{ width: totalW, minWidth: '100%' }}>

          {/* ── 헤더 행 (sticky top) ── */}
          <div className="sticky top-0 z-20 flex bg-gray-50 border-b border-gray-200" style={{ height: 48 }}>
            {/* 좌측 고정 헤더 */}
            <div
              className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200 flex items-end pb-1.5 px-4"
              style={{ width: LEFT_W }}
            >
              <div className="grid w-full text-[10px] font-semibold text-gray-400 uppercase tracking-wide"
                style={{ gridTemplateColumns: '5fr 3fr 2fr 1.5fr 1fr' }}>
                <span>수종명</span>
                <span>규격</span>
                <span className="text-right">수량</span>
                <span className="text-center">단위</span>
                <span />
              </div>
            </div>
            {/* 월 + 일 헤더 */}
            <div className="flex flex-col" style={{ width: ganttW }}>
              <div className="flex" style={{ height: 24 }}>
                {monthGroups.map(g => (
                  <div key={g.key} className="flex items-center justify-center text-[11px] font-bold text-gray-600 border-r border-gray-200 flex-shrink-0"
                    style={{ width: g.count * COL_W }}>
                    {g.year}.{MONTH_KR[g.month]}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ height: 24 }}>
                {columns.map((col, i) => (
                  <div key={i} className="flex items-center justify-center text-[10px] text-gray-400 border-r border-gray-100 flex-shrink-0"
                    style={{ width: COL_W }}>
                    {col.isLast ? '말' : col.day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 카테고리별 행 렌더링 ── */}
          {CATEGORIES.map(cat => {
            const catItems = byCategory[cat.id] || [];
            const isCollapsed = collapsed[cat.id];

            return (
              <div key={cat.id}>

                {/* 카테고리 헤더 행 */}
                <div className="flex" style={{ height: ROW_H }}>
                  <div
                    className="sticky left-0 z-10 flex items-center px-3 border-b border-r border-gray-200 cursor-pointer select-none"
                    style={{ width: LEFT_W, backgroundColor: `${cat.color}14` }}
                    onClick={() => toggleCollapse(cat.id)}
                  >
                    {isCollapsed
                      ? <ChevronRight size={13} className="mr-1.5 flex-shrink-0" style={{ color: cat.color }} />
                      : <ChevronDown  size={13} className="mr-1.5 flex-shrink-0" style={{ color: cat.color }} />}
                    <span className="text-xs font-bold" style={{ color: cat.color }}>{cat.label}</span>
                    <span className="ml-2 text-[10px] text-gray-400">({catItems.length})</span>
                    <button
                      className="ml-auto p-1 rounded hover:bg-white/60 transition-colors"
                      style={{ color: cat.color }}
                      title="항목 추가"
                      onClick={e => { e.stopPropagation(); setItemModal({ categoryId: cat.id }); }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="flex border-b border-gray-200 flex-shrink-0" style={{ width: ganttW, backgroundColor: `${cat.color}07` }}>
                    {columns.map((_, i) => (
                      <div key={i} className="border-r border-gray-100 h-full flex-shrink-0" style={{ width: COL_W }} />
                    ))}
                  </div>
                </div>

                {/* 항목 행 */}
                {!isCollapsed && catItems.map(item => (
                  <div key={item.id} className="flex group" style={{ height: ROW_H }}>

                    {/* 좌측 정보 셀 */}
                    <div
                      className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-gray-100 flex items-center px-3 flex-shrink-0"
                      style={{ width: LEFT_W }}
                    >
                      <div className="grid w-full items-center gap-1" style={{ gridTemplateColumns: '5fr 3fr 2fr 1.5fr 1fr' }}>
                        <span className="text-xs text-gray-800 font-medium truncate pl-5">{item.species_name}</span>
                        <span className="text-[11px] text-gray-400 truncate">{item.spec}</span>
                        <span className="text-xs text-gray-700 text-right font-semibold">{Number(item.quantity).toLocaleString()}</span>
                        <span className="text-[11px] text-gray-400 text-center">{item.unit}</span>
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => deleteItem(item.id)} className="p-0.5 text-gray-300 hover:text-red-400 transition-colors" title="항목 삭제">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 간트 바 영역 */}
                    <div
                      className="relative bg-white group-hover:bg-slate-50/50 border-b border-gray-100 cursor-pointer flex-shrink-0"
                      style={{ width: ganttW }}
                      onClick={() => setPeriodModal({ itemId: item.id })}
                      title="클릭하여 반입 기간 추가"
                    >
                      {/* 그리드 선 */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {columns.map((col, i) => (
                          <div key={i}
                            className={`border-r h-full flex-shrink-0 ${col.isLast ? 'border-gray-200' : 'border-gray-100'}`}
                            style={{ width: COL_W }}
                          />
                        ))}
                      </div>

                      {/* 간트 바 */}
                      {(item.periods || []).map(period => {
                        const bs = calcBarStyle(plan.start_date, plan.end_date, period.start_date, period.end_date);
                        if (!bs) return null;
                        return (
                          <div
                            key={period.id}
                            className="absolute top-1/2 -translate-y-1/2 h-[14px] rounded-sm cursor-pointer group/bar hover:brightness-75 transition-all"
                            style={{ ...bs, backgroundColor: cat.color, opacity: 0.8, minWidth: 6 }}
                            onClick={e => { e.stopPropagation(); if (confirm(`기간 삭제: ${period.start_date} ~ ${period.end_date}${period.note ? ` (${period.note})` : ''}`)) deletePeriod(item.id, period.id); }}
                            title={`${period.start_date} ~ ${period.end_date}${period.note ? ' · ' + period.note : ''}\n클릭하여 삭제`}
                          />
                        );
                      })}

                      {/* 기간 추가 힌트 */}
                      {(item.periods || []).length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                          <span className="text-[10px] text-gray-300 font-medium">+ 기간 추가</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 모달 ── */}
      {itemModal && (
        <ItemModal categoryId={itemModal.categoryId} onSubmit={addItem} onClose={() => setItemModal(null)} />
      )}
      {periodModal && (
        <PeriodModal planStart={plan.start_date} planEnd={plan.end_date}
          onSubmit={data => addPeriod(periodModal.itemId, data)} onClose={() => setPeriodModal(null)} />
      )}
    </div>
  );
}
