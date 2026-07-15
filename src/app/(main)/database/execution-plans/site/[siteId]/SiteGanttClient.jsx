'use client';

import { useState, useMemo, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, Fragment } from 'react';
import { Plus, Trash2, X, ChevronDown, ChevronRight, ArrowLeft, Pencil, Download, CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ── 상수 ── */
const PALETTE = ['#0891b2','#16a34a','#6366f1','#ca8a04','#dc2626','#d97706','#db2777','#7c3aed','#64748b','#059669'];

const CATEGORY_LABEL_MAP = {
  evergreen_tree: '상록교목',
  deciduous_tree: '낙엽교목',
  evergreen_shrub: '상록관목',
  deciduous_shrub: '낙엽관목',
  ground_flower: '지피 및 초화류',
  base_work: '식재기반조성',
  subsidiary: '식재부대공사',
};
const catLabel = (name) => CATEGORY_LABEL_MAP[name] || name;

const UNITS = ['주', '본', 'm²', 'm', '식'];

const MONTH_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const QUARTER_RANGES = {
  1: { label: '1분기 (1~3월)', start: '-01-01', end: '-03-31' },
  2: { label: '2분기 (4~6월)', start: '-04-01', end: '-06-30' },
  3: { label: '3분기 (7~9월)', start: '-07-01', end: '-09-30' },
  4: { label: '4분기 (10~12월)', start: '-10-01', end: '-12-31' },
};

const LEFT_W = 420;
const COL_W  = 20;
const ROW_H  = 26;
const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white';

/* ── 날짜 유틸 ── */
function generateColumns(startDate, endDate, mode = 'daily') {
  const cols = [];
  const end = new Date(endDate);
  let cur = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear(), m = cur.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    if (mode === 'tenday') {
      [10, 20, lastDay].forEach((d, idx) => {
        cols.push({ year: y, month: m, day: d, lastDay, isFirst: idx === 0, isTenday: true });
      });
    } else {
      for (let d = 1; d <= lastDay; d += 2) {
        cols.push({ year: y, month: m, day: d, lastDay, isFirst: d === 1 });
      }
    }
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

// 컬럼 → 시작일: 해당 홀수일
function colToStartDate(col) {
  return `${col.year}-${String(col.month + 1).padStart(2, '0')}-${String(col.day).padStart(2, '0')}`;
}

// 컬럼 → 종료일: 10일 단위면 그 날 그대로, 격일이면 다음날(짝수)
function colToEndDate(col) {
  const mm = String(col.month + 1).padStart(2, '0');
  if (col.isTenday) return `${col.year}-${mm}-${String(col.day).padStart(2, '0')}`;
  const endDay = Math.min(col.day + 1, col.lastDay);
  return `${col.year}-${mm}-${String(endDay).padStart(2, '0')}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function calcBarStyle(planStart, planEnd, pStart, pEnd) {
  const total = new Date(planEnd).getTime() - new Date(planStart).getTime();
  if (total <= 0) return null;
  const s = Math.max(new Date(pStart).getTime(), new Date(planStart).getTime());
  const e = Math.min(new Date(pEnd).getTime(), new Date(planEnd).getTime());
  if (e <= s) return null;
  return {
    left: `${((s - new Date(planStart).getTime()) / total) * 100}%`,
    width: `${Math.max(((e - s) / total) * 100, 0.3)}%`,
  };
}

function getQuarterLabel(startDate) {
  if (!startDate) return '';
  const d = new Date(startDate);
  return `${d.getFullYear() % 100}년 ${Math.ceil((d.getMonth() + 1) / 3)}분기`;
}

function computeStatus(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (e < today) return '완료';
  if (s <= today) return '진행';
  return '예정';
}

function StatusBadge({ startDate, endDate, className = '' }) {
  const status = computeStatus(startDate, endDate);
  const style =
    status === '진행' ? 'bg-blue-100 text-blue-600' :
    status === '완료' ? 'bg-gray-100 text-gray-400' :
                       'bg-amber-100 text-amber-600';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${style} ${className}`}>
      {status}
    </span>
  );
}

function findColIdx(columns, dateStr) {
  if (!dateStr || columns.length === 0) return 0;
  const target = new Date(dateStr).getTime();
  for (let i = 0; i < columns.length; i++) {
    const { year, month, day } = columns[i];
    if (new Date(year, month, day).getTime() >= target) return i;
  }
  return columns.length - 1;
}

/* ── 공통 UI ── */
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
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
      <button onClick={onSubmit} disabled={disabled}
        className="flex-1 py-2.5 rounded-xl text-sm text-white font-semibold disabled:opacity-40"
        style={{ backgroundColor: color || '#111827' }}>
        {label}
      </button>
    </div>
  );
}

/* ── 수종명 콤보박스 (기존 입력 이력 기반 자동 추천) ── */
function SpeciesCombobox({ categoryId, value, onChange }) {
  const [open, setOpen]       = useState(false);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (!categoryId) return;
    fetch(`/api/execution-plans/species?category=${categoryId}`)
      .then(r => r.json())
      .then(data => setOptions(Array.isArray(data) ? data : []))
      .catch(() => setOptions([]));
  }, [categoryId]);

  const filtered = value
    ? options.filter(s => s.includes(value))
    : options;

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="수종명 직접 입력 (이전 입력값 자동 추천)"
        className={inputCls}
        autoFocus
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-44 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={() => { onChange(s); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 항목 추가/수정 모달 ── */
function ItemModal({ category, color, onSubmit, onClose, initialValues }) {
  const isEdit = !!initialValues;
  const [form, setForm] = useState(
    initialValues
      ? { ...initialValues }
      : { category, species_name: '', spec: '', unit: '주', quantity: '' }
  );
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.species_name.trim() && form.quantity;
  return (
    <Modal title={isEdit ? '항목 수정' : '항목 추가'} onClose={onClose}>
      <div className="mb-4">
        <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>{catLabel(category)}</span>
      </div>
      <div className="space-y-3">
        <Field label="수종명 *">
          <SpeciesCombobox categoryId={category} value={form.species_name} onChange={v => set('species_name', v)} />
        </Field>
        <Field label="규격">
          <input
            value={form.spec || ''}
            onChange={e => set('spec', e.target.value.replace(/[a-z]/g, c => c.toUpperCase()))}
            placeholder="예: H4.0×R20, R30"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="수량 *"><input type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" className={inputCls} /></Field>
          <Field label="단위">
            <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inputCls}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <ModalActions onClose={onClose} onSubmit={async () => { setLoading(true); await onSubmit(form); setLoading(false); }}
        label={loading ? '저장 중...' : isEdit ? '수정' : '추가'} disabled={!valid || loading} color={color} />
    </Modal>
  );
}

/* ── 기간 메모 모달 ── */
function NoteModal({ period, color, onSave, onClose }) {
  const [note, setNote] = useState(period.note || '');
  const [saving, setSaving] = useState(false);
  const handleSave = async () => { setSaving(true); await onSave(note); setSaving(false); };
  return (
    <Modal title="기간 메모" onClose={onClose}>
      <p className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: color }} />
        {period.start_date} ~ {period.end_date}
      </p>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="메모를 입력하세요 (예: 현장 반입 주의사항, 품종 변경 등)"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
        autoFocus
      />
      <ModalActions onClose={onClose} onSubmit={handleSave} label={saving ? '저장 중...' : '저장'} disabled={saving} color={color} />
    </Modal>
  );
}

/* ── 10일 단위 기간 선택 모달 ── */
function TenDayPickerModal({ globalStart, globalEnd, onSubmit, onClose }) {
  function getMonths(start, end) {
    const months = [];
    let cur = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), 1);
    const e = new Date(new Date(end).getFullYear(), new Date(end).getMonth(), 1);
    while (cur <= e) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return months;
  }
  const months = getMonths(globalStart, globalEnd);
  const [start, setStart] = useState({ year: months[0]?.year, month: months[0]?.month, unit: null });
  const [end,   setEnd]   = useState({ year: months[0]?.year, month: months[0]?.month, unit: null });
  const [note, setNote]   = useState('');
  const [loading, setLoading] = useState(false);

  function toDate({ year, month, unit }) {
    if (unit == null) return '';
    const mm = String(month + 1).padStart(2, '0');
    if (unit === 'last') return `${year}-${mm}-${new Date(year, month + 1, 0).getDate()}`;
    return `${year}-${mm}-${String(unit).padStart(2, '0')}`;
  }

  const startDate = toDate(start);
  const endDate   = toDate(end);
  const valid = start.unit != null && end.unit != null && startDate <= endDate;

  const UNITS = [
    { value: 10,     label: '상순', sub: '~10일' },
    { value: 20,     label: '중순', sub: '~20일' },
    { value: 'last', label: '하순', sub: '~말일' },
  ];

  function UnitSelector({ sel, onChange }) {
    return (
      <div className="space-y-2">
        <select
          value={`${sel.year}-${sel.month}`}
          onChange={e => {
            const [y, m] = e.target.value.split('-').map(Number);
            onChange({ ...sel, year: y, month: m, unit: null });
          }}
          className={inputCls}
        >
          {months.map(({ year, month }) => (
            <option key={`${year}-${month}`} value={`${year}-${month}`}>
              {year}년 {MONTH_KR[month]}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-1.5">
          {UNITS.map(u => (
            <button key={u.value} type="button"
              onClick={() => onChange({ ...sel, unit: u.value })}
              className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                sel.unit === u.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}>
              <div>{u.label}</div>
              <div className="text-[10px] font-normal opacity-60">{u.sub}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Modal title="기간 추가 (10일 단위)" onClose={onClose}>
      <p className="text-xs text-gray-400 mb-4">상순·중순·하순으로 반입 기간을 선택하세요.</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="시작"><UnitSelector sel={start} onChange={setStart} /></Field>
        <Field label="종료"><UnitSelector sel={end}   onChange={setEnd}   /></Field>
      </div>
      {valid && (
        <div className="mt-3 bg-gray-50 rounded-xl px-4 py-2.5 text-xs text-gray-500">
          선택 기간: <span className="font-semibold text-gray-800">{startDate} ~ {endDate}</span>
        </div>
      )}
      {start.unit != null && end.unit != null && !valid && (
        <p className="mt-2 text-xs text-red-400">종료일이 시작일보다 앞설 수 없습니다.</p>
      )}
      <div className="mt-3">
        <Field label="비고">
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="예: 1차 반입, 분할 반입" className={inputCls} />
        </Field>
      </div>
      <ModalActions onClose={onClose}
        onSubmit={async () => { setLoading(true); await onSubmit({ start_date: startDate, end_date: endDate, note }); setLoading(false); }}
        label={loading ? '추가 중...' : '기간 추가'} disabled={!valid || loading} />
    </Modal>
  );
}

const SITE_STATUS_MAP = { '진행중': '진행', '진행': '진행', '완료': '완료', '대기': '계획', '보류': '계획' };

/* ── 분기 추가 모달 ── */
function AddQuarterModal({ site, existingPlans, onCreated, onSelectExisting, onClose }) {
  const siteId   = site.id;
  const siteName = site.name;

  const currentYear = new Date().getFullYear();
  const [year, setYear]           = useState(currentYear);
  const [quarter, setQuarter]     = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [execPrice, setExecPrice] = useState(site.budget ? String(site.budget) : '');
  const [status, setStatus]       = useState(SITE_STATUS_MAP[site.status] || '계획');
  const [loading, setLoading]     = useState(false);

  const existingKeys = new Set(existingPlans.map(p => {
    const d = new Date(p.start_date);
    return `${d.getFullYear()}-${Math.ceil((d.getMonth() + 1) / 3)}`;
  }));
  const available = [1, 2, 3, 4].filter(q => !existingKeys.has(`${year}-${q}`));
  const valid = quarter && customTitle.trim();

  const handleCreate = async () => {
    const qr = QUARTER_RANGES[quarter];
    setLoading(true);
    try {
      const res = await fetch('/api/execution-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim(),
          site_id: siteId,
          start_date: `${year}${qr.start}`,
          end_date: `${year}${qr.end}`,
          execution_price: execPrice ? Number(execPrice) : 0,
          status,
        }),
      });
      if (res.ok) {
        const plan = await res.json();
        onCreated({ ...plan, items: [] });
        onClose();
      } else if (res.status === 409) {
        const err = await res.json().catch(() => ({}));
        onClose();
        if (err.existingId) onSelectExisting(err.existingId);
      } else {
        const err = await res.json().catch(() => ({}));
        alert('분기 생성 실패: ' + (err.error || res.status));
      }
    } catch (err) {
      alert('네트워크 오류: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="분기 추가" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="연도">
            <select value={year} onChange={e => { setYear(Number(e.target.value)); setQuarter(''); setCustomTitle(''); }} className={inputCls}>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
          </Field>
          <Field label="분기 *">
            <select value={quarter} onChange={e => {
              const q = Number(e.target.value);
              setQuarter(q);
              setCustomTitle(siteName ? `${siteName} ${year}년 ${q}분기` : `${year}년 ${q}분기 식재공사`);
            }} className={inputCls}>
              <option value="">선택</option>
              {available.map(q => <option key={q} value={q}>{QUARTER_RANGES[q].label}</option>)}
            </select>
          </Field>
        </div>
        {quarter && (
          <>
            <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-xs text-gray-500">
              기간: <span className="font-semibold text-gray-700">{year}{QUARTER_RANGES[quarter].start} ~ {year}{QUARTER_RANGES[quarter].end}</span>
            </div>
            <Field label="공정표 제목">
              <input value={customTitle} onChange={e => setCustomTitle(e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="실행가 (원)">
                <input type="number" value={execPrice} onChange={e => setExecPrice(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
              <Field label="상태">
                <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                  <option value="계획">계획</option>
                  <option value="진행">진행</option>
                  <option value="완료">완료</option>
                </select>
              </Field>
            </div>
            {execPrice && <p className="text-[11px] text-gray-400 -mt-2">= {(Number(execPrice) / 100000000).toFixed(2)}억원</p>}
          </>
        )}
      </div>
      <ModalActions onClose={onClose} onSubmit={handleCreate} label={loading ? '생성 중...' : '분기 추가'} disabled={!valid || loading} />
    </Modal>
  );
}

/* ── 간트 차트 (전역 타임라인 기반) ── */
const QuarterGantt = forwardRef(function QuarterGantt({ plan, onUnsavedChange, chartColor, sectionRef, globalColumns, globalGanttW, globalStart, globalEnd, colW }, ref) {
  const router = useRouter();
  const [items, setItems]         = useState(plan.items || []);
  const [collapsed, setCollapsed] = useState({});
  const [itemModal, setItemModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [categories, setCategories] = useState(() =>
    [...new Set((plan.items || []).map(i => i.category).filter(Boolean))]
  );
  const [drag, setDrag] = useState(null);
  const [tenDayModal, setTenDayModal] = useState(null); // { itemId }

  // 전역 컬럼 사용 (props로 전달받음)
  const columns = globalColumns;
  const ganttW  = globalGanttW;

  const byCategory = useMemo(() => {
    const map = {};
    categories.forEach(cat => { map[cat] = []; });
    items.forEach(item => {
      if (!item.category) return;
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return map;
  }, [categories, items]);

  // 미저장 항목 여부
  const hasUnsaved = items.some(item =>
    String(item.id).startsWith('_local_') ||
    (item.periods || []).some(p => String(p.id).startsWith('_local_'))
  );

  // 미저장 상태를 부모에게 전달
  useEffect(() => { onUnsavedChange?.(hasUnsaved); }, [hasUnsaved, onUnsavedChange]);

  const newLocalId = () => `_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  /* ── 드래그: 로컬 상태에만 저장 ── */
  const finalizeDrag = useCallback((itemId, startCol, endCol) => {
    const s = Math.min(startCol, endCol);
    const e = Math.max(startCol, endCol);
    const startDate = colToStartDate(columns[s]);
    const endDate   = colToEndDate(columns[e]);
    setItems(p => p.map(i =>
      i.id === itemId
        ? { ...i, periods: [...(i.periods || []), { id: newLocalId(), start_date: startDate, end_date: endDate, note: '' }] }
        : i
    ));
  }, [columns]);

  useEffect(() => {
    if (!drag) return;

    const onMove = (e) => {
      const el = document.getElementById(`gantt-row-${drag.itemId}`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const col = Math.min(Math.max(Math.floor((e.clientX - rect.left) / colW), 0), columns.length - 1);
      if (col !== drag.currentCol) setDrag(d => d ? { ...d, currentCol: col } : null);
    };

    const onUp = (e) => {
      const el = document.getElementById(`gantt-row-${drag.itemId}`);
      let endCol = drag.currentCol;
      if (el) {
        const rect = el.getBoundingClientRect();
        endCol = Math.min(Math.max(Math.floor((e.clientX - rect.left) / colW), 0), columns.length - 1);
      }
      const { itemId, startCol } = drag;
      setDrag(null);
      finalizeDrag(itemId, startCol, endCol);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, columns, finalizeDrag]);

  const handleGanttMouseDown = (e, itemId) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = document.getElementById(`gantt-row-${itemId}`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const col = Math.min(Math.max(Math.floor((e.clientX - rect.left) / colW), 0), columns.length - 1);
    setDrag({ itemId, startCol: col, currentCol: col });
  };

  /* ── 대분류 관리 ── */
  const addCategory = () => {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) return;
    setCategories(p => [...p, name]);
    setAddingCat(false);
    setNewCatName('');
  };

  const deleteCategory = (catName) => {
    if (!confirm(`"${catName}" 대분류와 소속 항목을 모두 삭제하시겠습니까?`)) return;
    setCategories(p => p.filter(c => c !== catName));
    setItems(p => p.filter(i => i.category !== catName));
  };

  /* ── CRUD (로컬) ── */
  const addItem = (data) => {
    setItems(p => [...p, { id: newLocalId(), plan_id: plan.id, ...data, periods: [], sort_order: p.length }]);
    setItemModal(null);
  };

  const deleteItem = async (itemId) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    if (String(itemId).startsWith('_local_')) {
      setItems(p => p.filter(i => i.id !== itemId));
      return;
    }
    const res = await fetch(`/api/execution-plans/${plan.id}/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) setItems(p => p.filter(i => i.id !== itemId));
  };

  const editItem = async (data) => {
    const { item } = editModal;
    const updated = { ...item, ...data };
    if (String(item.id).startsWith('_local_')) {
      setItems(p => p.map(i => i.id === item.id ? updated : i));
    } else {
      const { species_name, spec, quantity, unit, category } = data;
      const res = await fetch(`/api/execution-plans/${plan.id}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ species_name, spec, quantity: Number(quantity), unit, category }),
      });
      if (res.ok) {
        const saved = await res.json();
        setItems(p => p.map(i => i.id === item.id ? { ...i, ...saved } : i));
      } else {
        alert('수정에 실패했습니다.');
      }
    }
    setEditModal(null);
  };

  const deletePeriod = async (itemId, periodId) => {
    if (String(periodId).startsWith('_local_')) {
      setItems(p => p.map(i => i.id === itemId ? { ...i, periods: i.periods.filter(p => p.id !== periodId) } : i));
      return;
    }
    const res = await fetch(`/api/execution-plans/${plan.id}/items/${itemId}/periods/${periodId}`, { method: 'DELETE' });
    if (res.ok) setItems(p => p.map(i => i.id === itemId ? { ...i, periods: i.periods.filter(p => p.id !== periodId) } : i));
  };

  const addPeriodFromTenDay = ({ start_date, end_date, note }) => {
    setItems(p => p.map(i =>
      i.id === tenDayModal.itemId
        ? { ...i, periods: [...(i.periods || []), { id: newLocalId(), start_date, end_date, note }] }
        : i
    ));
    setTenDayModal(null);
  };

  const updatePeriodNote = async (note) => {
    const { period, itemId } = noteModal;
    const updateLocal = () => setItems(p => p.map(i =>
      i.id === itemId ? { ...i, periods: i.periods.map(pr => pr.id === period.id ? { ...pr, note } : pr) } : i
    ));
    updateLocal();
    if (!String(period.id).startsWith('_local_')) {
      await fetch(`/api/execution-plans/${plan.id}/items/${itemId}/periods/${period.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }),
      });
    }
    setNoteModal(null);
  };

  /* ── 저장 (배치) ── */
  const savePlan = async () => {
    setSaving(true);
    try {
      let saved = [...items];
      for (let i = 0; i < saved.length; i++) {
        const item = saved[i];
        let realItemId = item.id;

        if (String(item.id).startsWith('_local_')) {
          const { id, periods, ...body } = item;
          const res = await fetch(`/api/execution-plans/${plan.id}/items`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          });
          if (!res.ok) { const e = await res.json().catch(() => ({})); alert('항목 저장 실패: ' + (e.error || res.status)); setSaving(false); return; }
          const dbItem = await res.json();
          realItemId = dbItem.id;
          saved[i] = { ...dbItem, periods: item.periods };
        }

        const savedPeriods = [];
        for (const period of (saved[i].periods || [])) {
          if (String(period.id).startsWith('_local_')) {
            const { id, ...pbody } = period;
            const res = await fetch(`/api/execution-plans/${plan.id}/items/${realItemId}/periods`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pbody),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); alert('기간 저장 실패: ' + (e.error || res.status)); setSaving(false); return; }
            savedPeriods.push(await res.json());
          } else {
            savedPeriods.push(period);
          }
        }
        saved[i] = { ...saved[i], periods: savedPeriods };
      }
      setItems(saved);
      router.refresh();
    } catch (err) {
      alert('네트워크 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 부모에서 저장 트리거 가능하도록 expose
  useImperativeHandle(ref, () => ({ save: savePlan }));

  /* ── 드래그 프리뷰 ── */
  const getDragPreview = (itemId) => {
    if (!drag || drag.itemId !== itemId) return null;
    const s = Math.min(drag.startCol, drag.currentCol);
    const e = Math.max(drag.startCol, drag.currentCol);
    return { left: s * colW, width: (e - s + 1) * colW };
  };

  const getDragLabel = () => {
    if (!drag) return null;
    const s = Math.min(drag.startCol, drag.currentCol);
    const e = Math.max(drag.startCol, drag.currentCol);
    return `${formatDateShort(colToStartDate(columns[s]))} ~ ${formatDateShort(colToEndDate(columns[e]))}`;
  };

  return (
    <div ref={sectionRef} data-plan-id={plan.id}>

      {/* 대분류별 행 */}
      {categories.map((catName) => {
        const color = chartColor;
        const catItems    = byCategory[catName] || [];
        const isCollapsed = collapsed[catName];
        return (
          <div key={catName}>
            <div className="flex" style={{ height: ROW_H }}>
              <div className="sticky left-0 z-10 flex items-center px-3 border-b border-r border-gray-200 cursor-pointer select-none"
                style={{ width: LEFT_W, backgroundColor: `${color}14` }}
                onClick={() => setCollapsed(p => ({ ...p, [catName]: !p[catName] }))}>
                {isCollapsed
                  ? <ChevronRight size={11} className="mr-1 flex-shrink-0" style={{ color }} />
                  : <ChevronDown  size={11} className="mr-1 flex-shrink-0" style={{ color }} />}
                <span className="text-[11px] font-bold" style={{ color }}>{catLabel(catName)}</span>
                <span className="ml-1.5 text-[10px] text-gray-400">({catItems.length})</span>
                <div className="ml-auto flex items-center gap-0.5">
                  <button className="p-1 rounded hover:bg-white/60" style={{ color }}
                    onClick={e => { e.stopPropagation(); setItemModal({ category: catName, color }); }}>
                    <Plus size={13} />
                  </button>
                  <button className="p-1 rounded hover:bg-white/60 text-gray-300 hover:text-red-400"
                    onClick={e => { e.stopPropagation(); deleteCategory(catName); }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              <div className="flex border-b border-gray-200 flex-shrink-0" style={{ width: ganttW, backgroundColor: `${color}07` }}>
                {columns.map((_, i) => <div key={i} className="border-r border-gray-100 h-full flex-shrink-0" style={{ width: colW }} />)}
              </div>
            </div>

            {!isCollapsed && catItems.map(item => {
              const preview = getDragPreview(item.id);
              const isDraggingThis = drag?.itemId === item.id;
              return (
                <div key={item.id} className="flex group" style={{ height: ROW_H }}>
                  <div className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-gray-100 flex items-center px-3 flex-shrink-0"
                    style={{ width: LEFT_W }}>
                    <div className="grid w-full items-center gap-1" style={{ gridTemplateColumns: '5fr 3fr 2fr 1.5fr 1fr' }}>
                      <span className="text-[11px] text-gray-800 font-medium truncate pl-4">{item.species_name}</span>
                      <span className="text-[10px] text-gray-400 truncate">{item.spec}</span>
                      <span className="text-[11px] text-gray-700 text-right font-semibold">{Number(item.quantity).toLocaleString()}</span>
                      <span className="text-[10px] text-gray-400 text-center">{item.unit}</span>
                      <div className="flex justify-end items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setTenDayModal({ itemId: item.id })} className="p-0.5 text-gray-300 hover:text-emerald-500" title="10일 단위로 기간 추가">
                          <CalendarDays size={11} />
                        </button>
                        <button onClick={() => setEditModal({ item, color })} className="p-0.5 text-gray-300 hover:text-blue-400" title="항목 수정">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="p-0.5 text-gray-300 hover:text-red-400" title="항목 삭제">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div id={`gantt-row-${item.id}`}
                    className={`relative border-b border-gray-100 flex-shrink-0 ${isDraggingThis ? 'cursor-col-resize' : 'cursor-crosshair'}`}
                    style={{ width: ganttW, backgroundColor: isDraggingThis ? `${color}06` : 'white' }}
                    onMouseDown={e => handleGanttMouseDown(e, item.id)}>
                    <div className="absolute inset-0 flex pointer-events-none">
                      {columns.map((col, i) => (
                        <div key={i} className={`border-r h-full flex-shrink-0 ${col.isFirst ? 'border-gray-300' : 'border-gray-100'}`}
                          style={{ width: colW }} />
                      ))}
                    </div>

                    {(item.periods || []).map(period => {
                      const bs = calcBarStyle(globalStart, globalEnd, period.start_date, period.end_date);
                      if (!bs) return null;
                      return (
                        <Fragment key={period.id}>
                          <div className="absolute top-1/2 -translate-y-1/2 h-[10px] rounded-sm group/bar cursor-pointer"
                            style={{ ...bs, backgroundColor: color, opacity: 0.85, minWidth: 6 }}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); setNoteModal({ period, itemId: item.id, color }); }}>
                            <button
                              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover/bar:flex z-10 text-[8px] leading-none"
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); deletePeriod(item.id, period.id); }}>✕</button>
                          </div>
                          {period.note && (
                            <div className="absolute text-[9px] leading-none font-semibold truncate pointer-events-none"
                              style={{ left: bs.left, maxWidth: bs.width, top: 1, color: '#1f2937', zIndex: 5, background: 'rgba(255,255,255,0.88)', borderRadius: 3, paddingLeft: 3, paddingRight: 3 }}>
                              {period.note}
                            </div>
                          )}
                        </Fragment>
                      );
                    })}

                    {preview && (
                      <>
                        <div className="absolute top-1/2 -translate-y-1/2 h-[10px] rounded-sm pointer-events-none z-10"
                          style={{ left: preview.left, width: preview.width, backgroundColor: color, opacity: 0.4, border: `1.5px dashed ${color}` }} />
                        <div className="absolute top-0 pointer-events-none z-20 bg-gray-900 text-white text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap -translate-y-full"
                          style={{ left: Math.min(preview.left + preview.width / 2, ganttW - 80) }}>
                          {getDragLabel()}
                        </div>
                      </>
                    )}

                    {(item.periods || []).length === 0 && !isDraggingThis && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        <span className="text-[10px] text-gray-300 font-medium">← 드래그하여 기간 추가</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* 대분류 추가 */}
      <div className="sticky left-0 flex items-center gap-2 px-4 py-2 border-b border-gray-100" style={{ width: LEFT_W }}>
        {addingCat ? (
          <>
            <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') { setAddingCat(false); setNewCatName(''); } }}
              placeholder="대분류명 입력 (예: 상록교목)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400" />
            <button onClick={addCategory} className="text-xs px-2.5 py-1.5 bg-gray-900 text-white rounded-lg font-semibold">추가</button>
            <button onClick={() => { setAddingCat(false); setNewCatName(''); }} className="text-xs text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </>
        ) : (
          <button onClick={() => setAddingCat(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            <Plus size={13} /> 대분류 추가
          </button>
        )}
      </div>

      {itemModal && <ItemModal category={itemModal.category} color={itemModal.color} onSubmit={addItem} onClose={() => setItemModal(null)} />}
      {editModal && <ItemModal category={editModal.item.category} color={editModal.color} initialValues={editModal.item} onSubmit={editItem} onClose={() => setEditModal(null)} />}
      {noteModal && <NoteModal period={noteModal.period} color={noteModal.color} onSave={updatePeriodNote} onClose={() => setNoteModal(null)} />}
      {tenDayModal && (
        <TenDayPickerModal
          globalStart={globalStart}
          globalEnd={globalEnd}
          onSubmit={addPeriodFromTenDay}
          onClose={() => setTenDayModal(null)}
        />
      )}
    </div>
  );
});

/* ── 엑셀 내보내기 모달 ── */
function ExportModal({ plans, chartColor, onClose }) {
  const [selected, setSelected] = useState(new Set(plans.map(p => p.id)));
  const [loading, setLoading] = useState(false);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleExport = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    const ids = plans.filter(p => selected.has(p.id)).map(p => p.id).join(',');
    const a = document.createElement('a');
    a.href = `/api/execution-plans/export?planIds=${ids}&color=${encodeURIComponent(chartColor)}`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => { setLoading(false); onClose(); }, 800);
  };

  return (
    <Modal title="엑셀 내보내기" onClose={onClose}>
      <p className="text-xs text-gray-500 mb-3">내보낼 분기를 선택하세요. 여러 분기를 선택하면 날짜 범위가 합쳐져 하나의 파일로 추출됩니다.</p>
      <div className="space-y-2 mb-5">
        {plans.map(plan => (
          <label key={plan.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
            selected.has(plan.id) ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input type="checkbox" checked={selected.has(plan.id)} onChange={() => toggle(plan.id)}
              className="w-4 h-4 accent-gray-900" />
            <div>
              <p className="text-sm font-semibold text-gray-800">{getQuarterLabel(plan.start_date)}</p>
              <p className="text-[11px] text-gray-400">{plan.start_date} ~ {plan.end_date}</p>
            </div>
            <StatusBadge startDate={plan.start_date} endDate={plan.end_date} className="ml-auto" />
          </label>
        ))}
      </div>
      <ModalActions
        onClose={onClose}
        onSubmit={handleExport}
        label={loading ? '생성 중...' : `${selected.size}개 분기 내보내기`}
        disabled={selected.size === 0 || loading}
      />
    </Modal>
  );
}

/* ── 메인: 현장 공정표 (분기 탭 + 전체 스크롤) ── */
export default function SiteGanttClient({ site, initialPlans, initialPlanId }) {
  const [plans, setPlans]               = useState(initialPlans);
  const [activeIdx, setActiveIdx]       = useState(() => {
    if (initialPlanId) {
      const idx = initialPlans.findIndex(p => p.id === initialPlanId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  const [refreshKey, setRefreshKey]     = useState(0);
  const [addQuarterModal, setAddQuarterModal] = useState(false);
  const [exportModal, setExportModal]   = useState(false);
  const [chartColor, setChartColor]     = useState('#0891b2');
  const [colMode, setColMode]           = useState('daily'); // 'daily' | 'tenday'

  const mainScrollRef  = useRef(null);
  const sectionRefs    = useRef([]);
  const ganttRefs      = useRef([]);
  const [unsavedPerPlan, setUnsavedPerPlan] = useState({});
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const hasAnyUnsaved = Object.values(unsavedPerPlan).some(Boolean);

  // 전역 타임라인 (모든 분기를 아우르는 단일 컬럼 배열)
  const globalColumns = useMemo(() => {
    if (plans.length === 0) return [];
    return generateColumns(plans[0].start_date, plans[plans.length - 1].end_date, colMode);
  }, [plans, colMode]);
  const globalMonthGroups = useMemo(() => groupByMonth(globalColumns), [globalColumns]);
  const colW          = colMode === 'tenday' ? 40 : COL_W;
  const globalGanttW  = globalColumns.length * colW;
  const globalTotalW  = LEFT_W + globalGanttW;
  const globalStart   = plans[0]?.start_date || '';
  const globalEnd     = plans[plans.length - 1]?.end_date || '';

  // 마운트 시 API에서 최신 데이터 가져오기 (Router Cache 우회)
  useEffect(() => {
    fetch(`/api/execution-plans/site/${site.id}`)
      .then(r => r.json())
      .then(freshPlans => {
        if (!Array.isArray(freshPlans)) return;
        setPlans(freshPlans);
        setRefreshKey(k => k + 1);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 가로 스크롤 → 활성 탭 업데이트
  useEffect(() => {
    const container = mainScrollRef.current;
    if (!container || globalColumns.length === 0 || plans.length === 0) return;

    const onScroll = () => {
      const centerLeft = container.scrollLeft + container.clientWidth * 0.3;
      let bestIdx = 0;
      for (let i = 0; i < plans.length; i++) {
        const colIdx = findColIdx(globalColumns, plans[i].start_date);
        const planLeft = LEFT_W + colIdx * COL_W;
        if (planLeft <= centerLeft) bestIdx = i;
      }
      setActiveIdx(bestIdx);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [globalColumns, plans]);

  // 탭 클릭 → 해당 분기 시작일로 가로 스크롤
  const scrollToQuarter = (idx) => {
    setActiveIdx(idx);
    const container = mainScrollRef.current;
    if (!container || globalColumns.length === 0) return;
    const plan = plans[idx];
    if (!plan) return;
    const colIdx = findColIdx(globalColumns, plan.start_date);
    const section = sectionRefs.current[idx];
    container.scrollTo({
      left: colIdx * COL_W,
      top: section ? section.offsetTop : 0,
      behavior: 'smooth',
    });
  };

  const handleUnsavedChange = useCallback((planId, isUnsaved) => {
    setUnsavedPerPlan(prev => ({ ...prev, [planId]: isUnsaved }));
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (hasAnyUnsaved) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasAnyUnsaved]);

  const handleBack = () => {
    if (hasAnyUnsaved && !confirm('저장하지 않은 변경사항이 있습니다.\n나가면 변경사항이 사라집니다. 계속하시겠습니까?')) return;
    window.location.href = '/database/execution-plans';
  };

  const handleQuarterCreated = (newPlan) => {
    setPlans(p => {
      const next = [...p, newPlan].sort((a, b) => a.start_date.localeCompare(b.start_date));
      const newIdx = next.findIndex(x => x.id === newPlan.id);
      setActiveIdx(newIdx);
      setTimeout(() => scrollToQuarter(newIdx), 100);
      return next;
    });
  };

  const handleSelectExisting = (planId) => {
    const idx = plans.findIndex(p => p.id === planId);
    if (idx >= 0) scrollToQuarter(idx);
  };

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 64px)' }}>

      {/* 상단 헤더 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 pt-2 pb-0">
        <button onClick={handleBack}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-1.5 transition-colors">
          <ArrowLeft size={13} /> 목록으로
        </button>
        <div className="flex items-end justify-between">
          <div className="mb-2">
            <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mb-0">공사 예정 공정표</p>
            <h1 className="text-base font-bold text-gray-900">{site.name}</h1>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {/* 바 색상 피커 */}
            <div className="relative flex items-center gap-1.5">
              <span className="text-xs text-gray-400">바 색상</span>
              <button
                className="w-5 h-5 rounded-full border-2 border-gray-200 shadow-sm hover:scale-110 transition-transform"
                style={{ backgroundColor: chartColor }}
                onClick={() => setColorPickerOpen(p => !p)}
              />
              {colorPickerOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-2.5 flex flex-wrap gap-1.5" style={{ width: 140 }}>
                  {PALETTE.map(c => (
                    <button key={c}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: chartColor === c ? '#111827' : 'transparent' }}
                      onClick={() => { setChartColor(c); setColorPickerOpen(false); }} />
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setColMode(m => m === 'daily' ? 'tenday' : 'daily')}
              className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                colMode === 'tenday'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {colMode === 'tenday' ? '10일 단위' : '격일'}
            </button>
            {plans.length > 0 && (
              <button onClick={() => setExportModal(true)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors">
                <Download size={12} /> 엑셀 내보내기
              </button>
            )}
            <button onClick={() => setAddQuarterModal(true)}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors">
              <Plus size={13} strokeWidth={2.5} /> 분기 추가
            </button>
          </div>
        </div>

        {/* 분기 탭 — 클릭 시 해당 분기 시작점으로 가로 스크롤 */}
        <div className="flex gap-0.5 items-end">
          {plans.length === 0 ? (
            <div className="pb-2 text-sm text-gray-400">분기 추가를 눌러 시작하세요.</div>
          ) : plans.map((plan, idx) => (
            <div key={plan.id} className="flex items-end gap-1 -mb-px">
              <button onClick={() => scrollToQuarter(idx)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeIdx === idx ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {getQuarterLabel(plan.start_date)}
                <StatusBadge startDate={plan.start_date} endDate={plan.end_date} className="ml-1.5" />
              </button>
              {unsavedPerPlan[plan.id] && (
                <button
                  onClick={() => ganttRefs.current[idx]?.save()}
                  className="mb-0.5 px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition-colors"
                >
                  저장
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 간트 본체 — 전체 분기를 가로로 이어지는 단일 타임라인 */}
      <div ref={mainScrollRef} className="flex-1 overflow-auto select-none">
        {plans.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-300 flex-col gap-3">
            <p className="text-sm">분기를 선택하거나 추가하세요</p>
            <button onClick={() => setAddQuarterModal(true)}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-700">
              <Plus size={14} /> 분기 추가
            </button>
          </div>
        ) : (
          <div style={{ width: globalTotalW, minWidth: '100%' }}>

            {/* 전역 날짜 헤더 — 모든 분기 공통, sticky top-0 */}
            <div className="sticky top-0 z-30 flex bg-gray-50 border-b border-gray-200" style={{ height: 34 }}>
              <div className="sticky left-0 z-40 bg-gray-50 border-r border-gray-200 flex items-end pb-1 px-3" style={{ width: LEFT_W }}>
                <div className="grid w-full text-[9px] font-semibold text-gray-400 uppercase tracking-wide"
                  style={{ gridTemplateColumns: '5fr 3fr 2fr 1.5fr 1fr' }}>
                  <span>수종명</span><span>규격</span>
                  <span className="text-right">수량</span>
                  <span className="text-center">단위</span>
                  <span />
                </div>
              </div>
              <div className="flex flex-col" style={{ width: globalGanttW }}>
                <div className="flex" style={{ height: 17 }}>
                  {globalMonthGroups.map((g, gi) => {
                    const yearChanged = gi === 0 || g.year !== globalMonthGroups[gi - 1].year;
                    return (
                      <div key={g.key} className="flex items-center justify-center text-[10px] font-bold text-gray-600 border-r border-gray-200 flex-shrink-0 gap-1"
                        style={{ width: g.count * colW }}>
                        {yearChanged && <span className="text-[9px] font-normal text-gray-400">{g.year}</span>}
                        {MONTH_KR[g.month]}
                      </div>
                    );
                  })}
                </div>
                <div className="flex" style={{ height: 17 }}>
                  {globalColumns.map((col, i) => (
                    <div key={i} className="flex items-center justify-center text-[9px] text-gray-400 border-r border-gray-100 flex-shrink-0"
                      style={{ width: colW }}>
                      {col.isTenday && col.day === col.lastDay ? '말' : col.day}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 분기별 섹션 */}
            {plans.map((plan, idx) => (
              <QuarterGantt
                key={`${plan.id}-${refreshKey}-${colMode}`}
                ref={el => { ganttRefs.current[idx] = el; }}
                plan={plan}
                chartColor={chartColor}
                onUnsavedChange={(isUnsaved) => handleUnsavedChange(plan.id, isUnsaved)}
                sectionRef={el => { sectionRefs.current[idx] = el; }}
                globalColumns={globalColumns}
                globalGanttW={globalGanttW}
                globalStart={globalStart}
                globalEnd={globalEnd}
                colW={colW}
              />
            ))}
          </div>
        )}
      </div>

      {addQuarterModal && (
        <AddQuarterModal
          site={site}
          existingPlans={plans}
          onCreated={handleQuarterCreated}
          onSelectExisting={handleSelectExisting}
          onClose={() => setAddQuarterModal(false)}
        />
      )}
      {exportModal && (
        <ExportModal
          plans={plans}
          chartColor={chartColor}
          onClose={() => setExportModal(false)}
        />
      )}
    </div>
  );
}
