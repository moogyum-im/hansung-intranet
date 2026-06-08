'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Upload, Loader2, CheckCircle, AlertCircle,
  FileSpreadsheet, ChevronDown, ChevronUp, Trash2, Plus,
  Calendar, TrendingUp, Banknote, Clock,
} from 'lucide-react';

const CATEGORY_META = {
  evergreen_tree:     '상록교목',
  deciduous_tree:     '낙엽교목',
  evergreen_shrub:    '상록관목',
  deciduous_shrub:    '낙엽관목',
  ground_flower:      '지피·초화류',
  supplementary:      '식재부대공사',
  maintenance:        '유지관리공사',
  facility_landscape: '경관·관리시설',
  facility_water:     '수경시설',
  facility_sports:    '운동시설',
  facility_drainage:  '배수시설',
  facility_pavement:  '포장공사',
  facility_lighting:  '조명공사',
};

const fmtN = (n) => (Number(n) || 0).toLocaleString();
const fmtB = (n) => {
  const v = Number(n) || 0;
  if (!v) return '-';
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(2)}억`;
  if (Math.abs(v) >= 10000)     return `${Math.round(v / 10000).toLocaleString()}만원`;
  return `${v.toLocaleString()}원`;
};
const fmtDate = (d) => d ? d.replace(/-/g, '.') : '-';

function UploadModal({ siteId, onSaved, onClose }) {
  const [step, setStep] = useState('drop');
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ billing_date: '', billing_period_start: '', billing_period_end: '', notes: '' });
  const fileRef = useRef();

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setStep('parsing');
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/progress-billings/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '파싱 실패');
      setParsed(data);
      setMeta(m => ({
        ...m,
        billing_date: data.meta?.billing_date || '',
        notes: data.meta?.title || '',
      }));
      setStep('preview');
    } catch (e) {
      setError(e.message);
      setStep('drop');
    }
  }, []);

  const expectedDate = (() => {
    if (!meta.billing_period_end) return '';
    const end = new Date(meta.billing_period_end);
    const y = end.getMonth() === 11 ? end.getFullYear() + 1 : end.getFullYear();
    const m = end.getMonth() === 11 ? 1 : end.getMonth() + 2;
    return `${y}-${String(m).padStart(2, '0')}-25`;
  })();

  const handleSave = async () => {
    setStep('saving');
    try {
      const res = await fetch(`/api/progress-billings/${siteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta: { ...meta, expected_receive_date: expectedDate || undefined }, items: parsed.items }),
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

  const totalAmount = parsed?.items?.reduce((s, i) => s + (Number(i.billing_amount) || 0), 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            {step === 'drop' && '기성 청구서 업로드'}
            {step === 'parsing' && '파싱 중...'}
            {step === 'preview' && `미리보기 — 청구금액 ${fmtB(totalAmount)}`}
            {step === 'saving' && '저장 중...'}
            {step === 'done' && '저장 완료'}
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
              <Upload size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">기성 청구서 파일을 드래그하거나 클릭하세요</p>
              <p className="text-xs text-gray-400 mt-1">엑셀, PDF, 이미지 등 모든 형식 지원</p>
              {error && <p className="mt-4 text-xs text-red-500 font-medium">{error}</p>}
              <input ref={fileRef} type="file" className="hidden" onChange={e => processFile(e.target.files[0])} />
            </div>
          )}

          {(step === 'parsing' || step === 'saving') && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={36} className="animate-spin mb-4 text-blue-500" />
              <p className="text-sm font-semibold text-gray-500">{step === 'parsing' ? '파일을 분석하고 있습니다...' : '저장 중...'}</p>
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
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">청구일</label>
                  <input type="date" value={meta.billing_date} onChange={e => setMeta(m => ({ ...m, billing_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">비고</label>
                  <input value={meta.notes} onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))} placeholder="예: 1회차 기성"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">청구 기간 시작</label>
                  <input type="date" value={meta.billing_period_start} onChange={e => setMeta(m => ({ ...m, billing_period_start: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">청구 기간 종료</label>
                  <input type="date" value={meta.billing_period_end} onChange={e => setMeta(m => ({ ...m, billing_period_end: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </div>
                {expectedDate && (
                  <div className="col-span-2 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                    <Clock size={13} />
                    예상 수령일: <strong>{fmtDate(expectedDate)}</strong> (청구 기간 종료 익월 25일)
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="text-[11px] text-gray-400 border-b border-gray-100">
                      <th className="text-left py-2 font-medium">품명</th>
                      <th className="text-left py-2 font-medium">규격</th>
                      <th className="text-right py-2 font-medium">단위</th>
                      <th className="text-right py-2 font-medium">계약수량</th>
                      <th className="text-right py-2 font-medium">청구수량</th>
                      <th className="text-right py-2 font-medium">청구율</th>
                      <th className="text-right py-2 font-medium">단가</th>
                      <th className="text-right py-2 font-semibold text-gray-600">청구금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(parsed.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-1.5 font-medium text-gray-800">{item.item_name}</td>
                        <td className="py-1.5 text-gray-500">{item.spec || '-'}</td>
                        <td className="py-1.5 text-right text-gray-500">{item.unit || '-'}</td>
                        <td className="py-1.5 text-right text-gray-600">{fmtN(item.contract_quantity)}</td>
                        <td className="py-1.5 text-right text-gray-700">{fmtN(item.billing_quantity)}</td>
                        <td className="py-1.5 text-right text-gray-500">{item.billing_rate ? `${item.billing_rate}%` : '-'}</td>
                        <td className="py-1.5 text-right text-gray-500">{item.unit_price ? fmtN(item.unit_price) : '-'}</td>
                        <td className="py-1.5 text-right font-bold text-gray-900">{fmtN(item.billing_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-xs text-red-600">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-400">총 청구금액 <strong className="text-gray-700">{fmtB(totalAmount)}</strong></p>
            <div className="flex gap-3">
              <button onClick={() => { setParsed(null); setStep('drop'); }} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-800">다시 업로드</button>
              <button onClick={handleSave} className="px-5 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700">저장</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddReceiptModal({ billing, onSaved, onClose }) {
  const [form, setForm] = useState({ received_date: '', received_amount: '', notes: '' });
  const [pct, setPct] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAmountChange = (val) => {
    setForm(f => ({ ...f, received_amount: val }));
    const num = Number(val.replace(/,/g, ''));
    if (billing.total_amount && num) {
      setPct(String(Math.round(num / billing.total_amount * 1000) / 10));
    } else {
      setPct('');
    }
  };

  const handlePctChange = (val) => {
    setPct(val);
    const p = Number(val);
    if (billing.total_amount && p) {
      setForm(f => ({ ...f, received_amount: String(Math.round(billing.total_amount * p / 100)) }));
    } else {
      setForm(f => ({ ...f, received_amount: '' }));
    }
  };

  const handleSave = async () => {
    if (!form.received_date || !form.received_amount) { setError('수령일과 수령금액을 입력하세요'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/progress-billings/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_id: billing.id, received_date: form.received_date, received_amount: Number(form.received_amount.replace(/,/g, '')), notes: form.notes }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const rate = form.received_amount && billing.total_amount
    ? Math.round(Number(form.received_amount.replace(/,/g, '')) / billing.total_amount * 1000) / 10
    : null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">수령금액 입력</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="px-3 py-2 bg-blue-50 rounded-lg text-xs text-blue-700">
            {billing.billing_round}회차 · 청구금액 <strong>{fmtB(billing.total_amount)}</strong>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">수령일</label>
            <input type="date" value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">수령금액</label>
            <div className="flex gap-2">
              <input
                value={form.received_amount}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder="0"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <div className="relative w-24">
                <input
                  value={pct}
                  onChange={e => handlePctChange(e.target.value)}
                  placeholder="0"
                  type="number"
                  min="0"
                  max="100"
                  className="w-full border border-gray-200 rounded-lg pl-3 pr-6 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
              </div>
            </div>
            {rate !== null && (
              <p className="text-[11px] text-gray-400 mt-1">청구 대비 <strong className={rate < 100 ? 'text-amber-500' : 'text-green-600'}>{rate}%</strong> · {fmtB(Number(form.received_amount.replace(/,/g, '')))} 수령</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">비고</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="선택사항"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-800">취소</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 disabled:opacity-40">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BillingCard({ billing, onDelete, onReceiptAdded }) {
  const [open, setOpen] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const receipts = billing.progress_billing_receipts || [];
  const totalReceived = receipts.reduce((s, r) => s + (Number(r.received_amount) || 0), 0);
  const outstanding = (billing.total_amount || 0) - totalReceived;
  const receiptRate = billing.total_amount > 0 ? Math.round(totalReceived / billing.total_amount * 1000) / 10 : 0;
  const isFullyReceived = outstanding <= 0;

  const handleDeleteReceipt = async (id) => {
    if (!confirm('이 수령 내역을 삭제하시겠습니까?')) return;
    await fetch(`/api/progress-billings/receipts?id=${id}`, { method: 'DELETE' });
    onReceiptAdded();
  };

  return (
    <>
      {showReceiptModal && (
        <AddReceiptModal billing={billing} onSaved={onReceiptAdded} onClose={() => setShowReceiptModal(false)} />
      )}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-left" onClick={() => setOpen(v => !v)}>
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${isFullyReceived ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {billing.billing_round}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900">{billing.billing_round}회차 기성 청구</p>
                {billing.notes && <span className="text-[10px] text-gray-400">{billing.notes}</span>}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {billing.billing_period_start && (
                  <span className="text-xs text-gray-400">
                    {fmtDate(billing.billing_period_start)} ~ {fmtDate(billing.billing_period_end)}
                  </span>
                )}
                {billing.expected_receive_date && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={10} /> 예상 수령 {fmtDate(billing.expected_receive_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-black text-gray-900">{fmtB(billing.total_amount)}</p>
              <p className={`text-xs font-semibold ${isFullyReceived ? 'text-green-600' : outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {isFullyReceived ? '수령 완료' : `미수금 ${fmtB(outstanding)}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={e => { e.stopPropagation(); onDelete(billing.id); }} className="text-gray-300 hover:text-red-500 p-1 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
              {open ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
            </div>
          </div>
        </button>

        {open && (
          <div className="border-t border-gray-50 px-5 pb-5">
            <div className="mt-4 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-1.5 bg-gray-100 rounded-full w-32 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(receiptRate, 100)}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-600">{receiptRate}% 수령</span>
              </div>
              <button onClick={() => setShowReceiptModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                <Plus size={12} /> 수령 추가
              </button>
            </div>

            {receipts.length > 0 ? (
              <div className="space-y-1">
                {receipts.map((r, idx) => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50 group">
                    <div className="flex items-center gap-3">
                      <Calendar size={12} className="text-gray-300" />
                      <span className="text-xs text-gray-600">{fmtDate(r.received_date)}</span>
                      {r.notes && <span className="text-[10px] text-gray-400">{r.notes}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-800">{fmtB(r.received_amount)}</span>
                      {r.receipt_rate != null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${r.receipt_rate < 100 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {r.receipt_rate}%
                        </span>
                      )}
                      <button onClick={() => handleDeleteReceipt(r.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between py-1.5 px-3 border-t border-gray-100 mt-1">
                  <span className="text-xs font-bold text-gray-700">수령 누계</span>
                  <span className="text-sm font-black text-gray-900">{fmtB(totalReceived)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-300 text-center py-3">수령 내역이 없습니다</p>
            )}

            {(billing.progress_billing_items || []).length > 0 && (
              <details className="mt-4">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">청구 항목 상세 보기 ({billing.progress_billing_items.length}개)</summary>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="text-[11px] text-gray-400 border-b border-gray-50">
                        <th className="text-left py-1.5 font-medium">품명</th>
                        <th className="text-left py-1.5 font-medium">규격</th>
                        <th className="text-right py-1.5 font-medium">단위</th>
                        <th className="text-right py-1.5 font-medium">계약수량</th>
                        <th className="text-right py-1.5 font-medium">청구수량</th>
                        <th className="text-right py-1.5 font-medium">청구율</th>
                        <th className="text-right py-1.5 font-semibold text-gray-600">청구금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {billing.progress_billing_items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-1 font-medium text-gray-700">{item.item_name}</td>
                          <td className="py-1 text-gray-400">{item.spec || '-'}</td>
                          <td className="py-1 text-right text-gray-400">{item.unit || '-'}</td>
                          <td className="py-1 text-right text-gray-500">{fmtN(item.contract_quantity)}</td>
                          <td className="py-1 text-right text-gray-600">{fmtN(item.billing_quantity)}</td>
                          <td className="py-1 text-right text-gray-400">{item.billing_rate ? `${item.billing_rate}%` : '-'}</td>
                          <td className="py-1 text-right font-bold text-gray-800">{fmtN(item.billing_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function ProgressBillingClient({ site, embedded = false }) {
  const router = useRouter();
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const loadBillings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/progress-billings/${site.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBillings(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [site.id]);

  useEffect(() => { loadBillings(); }, [loadBillings]);

  const handleDelete = async (billingId) => {
    if (!confirm('이 기성 청구 내역을 삭제하시겠습니까?')) return;
    await fetch(`/api/progress-billings/${site.id}?billingId=${billingId}`, { method: 'DELETE' });
    loadBillings();
  };

  const totalBilled      = billings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
  const totalReceived    = billings.reduce((s, b) => s + (b.progress_billing_receipts || []).reduce((rs, r) => rs + (Number(r.received_amount) || 0), 0), 0);
  const totalOutstanding = totalBilled - totalReceived;

  const billingContent = (
    <>
      {showModal && (
        <UploadModal siteId={site.id} onSaved={loadBillings} onClose={() => setShowModal(false)} />
      )}

      {/* 헤더 (standalone 모드에서만) */}
      {!embedded && (
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <button onClick={() => router.push('/database/progress-billings')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-3 transition-colors">
            <ArrowLeft size={13} /> 목록으로
          </button>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase mb-0.5">기성 청구 관리</p>
              <h1 className="text-xl font-bold text-gray-900">{site.name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{site.start_date} ~ {site.end_date}</p>
            </div>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors">
              <Upload size={14} /> 기성 청구 추가
            </button>
          </div>
        </div>
      )}

      {/* 요약 KPI (embedded에서도 보임) */}
      {billings.length > 0 && (
        <div className={embedded ? 'mb-4' : 'max-w-4xl mx-auto px-6 pt-5'}>
          <div className={`grid gap-4 ${embedded ? 'grid-cols-3' : 'grid-cols-3'}`}>
            {[
              { label: '총 청구 누계', value: fmtB(totalBilled), sub: `${billings.length}회차`, color: 'text-gray-900' },
              { label: '총 수령 누계', value: fmtB(totalReceived), sub: totalBilled > 0 ? `${Math.round(totalReceived / totalBilled * 1000) / 10}%` : '-', color: 'text-green-600' },
              { label: '미수금', value: fmtB(totalOutstanding), sub: totalOutstanding > 0 ? '수령 대기' : '전액 수령 완료', color: totalOutstanding > 0 ? 'text-amber-600' : 'text-gray-300' },
            ].map(c => (
              <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{c.label}</p>
                <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* embedded 모드: 추가 버튼 */}
      {embedded && (
        <div className="flex justify-end mb-3">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors">
            <Upload size={13} /> 기성 청구 추가
          </button>
        </div>
      )}

      <div className={embedded ? 'space-y-3' : 'max-w-4xl mx-auto p-6 space-y-3'}>
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {loading && (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-20 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        )}
        {!loading && !error && billings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Banknote size={44} className="mb-4" />
            <p className="text-sm font-semibold text-gray-400">등록된 기성 청구 내역이 없습니다</p>
            <p className="text-xs mt-1 mb-6">기성 청구서 엑셀 파일을 업로드하세요</p>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700">
              <Upload size={15} /> 기성 청구 추가
            </button>
          </div>
        )}
        {!loading && billings.map(billing => (
          <BillingCard key={billing.id} billing={billing} onDelete={handleDelete} onReceiptAdded={loadBillings} />
        ))}
      </div>
    </>
  );

  if (embedded) return billingContent;
  return <div className="min-h-screen bg-gray-50">{billingContent}</div>;
}
