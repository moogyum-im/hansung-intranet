'use client';

import { useState, useRef } from 'react';

const TREE_COLS = [
  { key: 'region',    label: '지역',    placeholder: '예) 경기도',   type: 'text' },
  { key: 'tree_name', label: '수목명',   placeholder: '예) 소나무',   type: 'text' },
  { key: 'size',      label: '규격',    placeholder: '예) H3.0×R8', type: 'text' },
  { key: 'price',     label: '가격(원)', placeholder: '예) 150000',  type: 'text' },
  { key: 'quantity',  label: '수량(주)', placeholder: '예) 50',      type: 'text' },
  { key: 'remarks',   label: '비고',    placeholder: '특이사항',     type: 'text' },
];

const newRow = () => ({
  _id: Math.random().toString(36).slice(2),
  region: '', tree_name: '', size: '', price: '', quantity: '', remarks: '',
});

function parseTsv(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .split('\n')
    .map((line) => line.split('\t').map((v) => v.trim()));
}

export default function SupplierForm({ code, companyName, initialTrees }) {
  const [companyInfo, setCompanyInfo] = useState(() => ({
    company_name: initialTrees[0]?.company_name || companyName,
    contact_info: initialTrees[0]?.contact_info || '',
    manager_name: '',
  }));
  const [rows, setRows] = useState(() =>
    initialTrees.length > 0
      ? initialTrees.map((t) => ({
          _id: String(t.id),
          region: t.region || '',
          tree_name: t.tree_name || '',
          size: t.size || '',
          price: t.price ?? '',
          quantity: t.quantity ?? '',
          remarks: t.remarks || '',
        }))
      : [newRow(), newRow(), newRow()]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const focusRef = useRef({ rowIdx: 0, colIdx: 0 });

  const handleCompanyChange = (key, value) => {
    setCompanyInfo((prev) => ({ ...prev, [key]: value }));
  };

  const handleChange = (id, key, value) => {
    setRows((prev) => prev.map((r) => r._id === id ? { ...r, [key]: value } : r));
  };

  const handlePaste = (e, startRowIdx, startColIdx) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const parsed = parseTsv(text);
    if (parsed.length === 1 && parsed[0].length === 1) return;
    e.preventDefault();
    setRows((prev) => {
      const updated = prev.map((r) => ({ ...r }));
      parsed.forEach((cols, ri) => {
        const targetRow = startRowIdx + ri;
        while (updated.length <= targetRow) updated.push(newRow());
        cols.forEach((val, ci) => {
          const targetCol = startColIdx + ci;
          if (targetCol < TREE_COLS.length) {
            updated[targetRow] = { ...updated[targetRow], [TREE_COLS[targetCol].key]: val };
          }
        });
      });
      const last = updated[updated.length - 1];
      if (last?.region || last?.tree_name) updated.push(newRow());
      return updated;
    });
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (id) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  const validRows = rows.filter((r) => r.region?.trim() && r.tree_name?.trim());

  const handleSubmit = async () => {
    if (!companyInfo.company_name?.trim()) {
      setError('업체명을 입력해주세요.');
      return;
    }
    if (!companyInfo.contact_info?.trim()) {
      setError('연락처를 입력해주세요.');
      return;
    }
    if (validRows.length === 0) {
      setError('지역과 수목명은 필수입니다. 최소 1개 이상 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/supplier/${code}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyInfo.company_name,
          contact_info: companyInfo.contact_info,
          rows: validRows.map((row) => ({
            region: row.region,
            tree_name: row.tree_name,
            size: row.size || null,
            price: row.price !== '' ? Number(String(row.price).replace(/,/g, '')) : null,
            quantity: row.quantity !== '' ? Number(String(row.quantity).replace(/,/g, '')) : null,
            remarks: row.remarks || null,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSubmitted(true);
    } catch (e) {
      setError(e.message || '저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 제출 완료 화면
  if (submitted) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/submit-bg.jpg')" }} />
        <div className="absolute inset-0 bg-black/80" />
        <div className="relative z-10 flex flex-col items-center text-center text-white px-6 max-w-lg mx-auto">
          <img src="/hansung_logo.png" alt="한성종합조경" className="h-28 object-contain mb-10" style={{ opacity: 0.6 }} />
          <h1 className="text-3xl font-bold mb-8">소중한 정보 감사합니다.</h1>
          <div className="space-y-2 text-white/90 text-lg leading-relaxed">
            <p>제출하신 조경수 정보는</p>
            <p>내부 검토 후 한성종합조경의 데이터베이스에 정식 등록됩니다.</p>
            <p className="text-white font-medium pt-2">귀사의 무궁한 발전을 기원합니다.</p>
          </div>
          <p className="mt-10 text-sm text-white/40">총 {validRows.length}종의 수목 정보가 등록되었습니다.</p>
          <button onClick={() => window.close()} className="mt-6 px-8 py-3 border border-white/30 text-white/70 text-sm rounded-xl hover:bg-white/10 hover:text-white transition-colors">
            페이지 종료하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-full mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">한성종합조경</p>
            <h1 className="text-lg font-bold text-gray-900">조경수 공급업체 등록</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="shrink-0 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 transition-colors shadow-sm"
          >
            {isSubmitting
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</>
              : '저장하기'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      </div>

      <div className="flex-1 px-4 py-5 space-y-5 max-w-5xl mx-auto w-full">
        {/* 업체 정보 카드 */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            업체 정보
            <span className="text-xs font-normal text-gray-400">아래 정보는 모든 수목에 동일하게 적용됩니다.</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">업체명 <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={companyInfo.company_name}
                onChange={(e) => handleCompanyChange('company_name', e.target.value)}
                placeholder="업체명"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">연락처 <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={companyInfo.contact_info}
                onChange={(e) => handleCompanyChange('contact_info', e.target.value)}
                placeholder="010-0000-0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">담당자명</label>
              <input
                type="text"
                value={companyInfo.manager_name}
                onChange={(e) => handleCompanyChange('manager_name', e.target.value)}
                placeholder="담당자 이름 (선택)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* 수목 정보 테이블 */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            수목 정보
            <span className="text-xs font-normal text-gray-400">엑셀에서 복사 후 셀에 Ctrl+V로 붙여넣기 가능합니다.</span>
          </h2>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                    {TREE_COLS.map((col) => (
                      <th key={col.key} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                        {col.label}
                        {(col.key === 'region' || col.key === 'tree_name') && <span className="text-red-400 ml-0.5">*</span>}
                      </th>
                    ))}
                    <th className="px-3 py-3 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, rowIdx) => (
                    <tr key={row._id} className="hover:bg-gray-50 group">
                      <td className="px-3 py-2 text-xs text-gray-400 text-center">{rowIdx + 1}</td>
                      {TREE_COLS.map((col, colIdx) => (
                        <td key={col.key} className="px-2 py-1.5">
                          <input
                            type={col.type}
                            value={row[col.key] ?? ''}
                            onChange={(e) => handleChange(row._id, col.key, e.target.value)}
                            onFocus={() => { focusRef.current = { rowIdx, colIdx }; }}
                            onPaste={(e) => handlePaste(e, rowIdx, colIdx)}
                            placeholder={col.placeholder}
                            className="w-full min-w-[80px] border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 hover:border-gray-300 bg-white"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => removeRow(row._id)}
                          className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 p-3">
              <button onClick={addRow} className="w-full py-2 text-sm text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors">
                + 행 추가
              </button>
            </div>
          </div>
        </div>

        {/* 하단 저장 버튼 */}
        <div className="flex justify-end pb-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-10 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 shadow"
          >
            {isSubmitting
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</>
              : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
거