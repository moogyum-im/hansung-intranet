'use client';

import { useState, useMemo } from 'react';

function changeRate(oldPrice, newPrice) {
  if (!oldPrice || !newPrice) return null;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PriceHistoryClient({ initialHistory }) {
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('전체');

  const companies = useMemo(() => {
    const unique = [...new Set(initialHistory.map((h) => h.company_name).filter(Boolean))].sort();
    return ['전체', ...unique];
  }, [initialHistory]);

  const filtered = useMemo(() => {
    let result = initialHistory;
    if (filterCompany !== '전체') result = result.filter((h) => h.company_name === filterCompany);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((h) =>
        h.tree_name?.toLowerCase().includes(q) ||
        h.company_name?.toLowerCase().includes(q) ||
        h.region?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [initialHistory, filterCompany, search]);

  const stats = useMemo(() => {
    const increases = filtered.filter((h) => h.new_price > h.old_price).length;
    const decreases = filtered.filter((h) => h.new_price < h.old_price).length;
    return { total: filtered.length, increases, decreases };
  }, [filtered]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">단가 변경 이력</h1>
        <p className="text-sm text-gray-500 mt-1">공급업체가 단가를 수정할 때마다 자동으로 기록됩니다.</p>
      </header>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">전체 변경 이력</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}건</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs text-red-600">인상</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.increases}건</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-600">인하</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.decreases}건</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="수목명, 업체명, 지역 검색..."
          className="flex-grow min-w-52 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
        >
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['변경일시', '업체명', '지역', '수목명', '규격', '변경 전', '변경 후', '변동률'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                    변경 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const rate = changeRate(item.old_price, item.new_price);
                  const isUp = rate > 0;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(item.changed_at)}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {item.company_name}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {item.region}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {item.tree_name}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                        {item.size || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                        {item.old_price?.toLocaleString()}원
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {item.new_price?.toLocaleString()}원
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {rate != null ? (
                          <span className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full ${
                            isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {isUp ? '▲' : '▼'} {Math.abs(rate).toFixed(1)}%
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
