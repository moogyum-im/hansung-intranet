'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function formatSync(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-gray-700 ml-1">{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>;
}

function PriceChangeBadge({ item, priceChangeMap }) {
  if (!item.supplier_token_code) return null;
  const key = `${item.supplier_token_code}||${item.tree_name}||${item.size || ''}||${item.region}`;
  const change = priceChangeMap?.[key];
  if (!change) return null;
  const rate = ((change.new_price - change.old_price) / change.old_price) * 100;
  const isUp = rate > 0;
  return (
    <a
      href="/database/price-history"
      title={`${change.old_price.toLocaleString()}원 → ${change.new_price.toLocaleString()}원`}
      className={`ml-1.5 inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full hover:opacity-70 transition-opacity ${isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}
    >
      {isUp ? '▲' : '▼'}{Math.abs(rate).toFixed(0)}%
    </a>
  );
}

// ── 가격 분석 뷰 ──
function PriceAnalysis({ data }) {
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const map = {};
    for (const item of data) {
      if (!item.price || !item.tree_name) continue;
      const key = `${item.tree_name}__${item.size || ''}`;
      if (!map[key]) map[key] = { tree_name: item.tree_name, size: item.size || '', prices: [], companies: new Set() };
      map[key].prices.push(item.price);
      if (item.company_name) map[key].companies.add(item.company_name);
    }
    return Object.values(map)
      .map((g) => ({
        ...g,
        min: Math.min(...g.prices),
        max: Math.max(...g.prices),
        avg: Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length),
        count: g.companies.size,
      }))
      .sort((a, b) => a.tree_name.localeCompare(b.tree_name));
  }, [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.filter((g) => g.tree_name.toLowerCase().includes(q) || g.size.toLowerCase().includes(q));
  }, [grouped, search]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="수목명, 규격 검색..."
        className="mb-4 w-full max-w-xs px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">수목명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">규격</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">최저가</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">평균가</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">최고가</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">업체 수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">데이터가 없습니다.</td></tr>
            ) : filtered.map((g) => {
              const spread = g.max - g.min;
              const spreadPct = g.min > 0 ? ((spread / g.min) * 100).toFixed(0) : 0;
              return (
                <tr key={`${g.tree_name}__${g.size}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{g.tree_name}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{g.size || '-'}</td>
                  <td className="px-6 py-3.5 text-sm text-right text-blue-600 font-medium">{g.min.toLocaleString()}원</td>
                  <td className="px-6 py-3.5 text-sm text-right font-semibold text-gray-900">
                    {g.avg.toLocaleString()}원
                    {spread > 0 && (
                      <span className="ml-1.5 text-[10px] text-gray-400 font-normal">±{spreadPct}%</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-right text-red-500 font-medium">{g.max.toLocaleString()}원</td>
                  <td className="px-6 py-3.5 text-sm text-right text-gray-500">{g.count}곳</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 공급업체 코드 관리 뷰 ──
function SupplierCodes({ initialTokens }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [newCompany, setNewCompany] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCompany.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/supplier-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: newCompany.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTokens((prev) => [data, ...prev]);
      setNewCompany('');
    } catch (e) {
      alert(e.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (token) => {
    const res = await fetch(`/api/admin/supplier-codes/${token.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !token.is_active }),
    });
    if (res.ok) {
      setTokens((prev) => prev.map((t) => t.id === token.id ? { ...t, is_active: !t.is_active } : t));
    }
  };

  const handleDelete = async (token) => {
    if (!confirm(`"${token.company_name}" 코드를 삭제하시겠습니까?\n연결된 수목 데이터는 남아있습니다.`)) return;
    const res = await fetch(`/api/admin/supplier-codes/${token.id}`, { method: 'DELETE' });
    if (res.ok) setTokens((prev) => prev.filter((t) => t.id !== token.id));
  };

  const copyLink = (code) => {
    navigator.clipboard.writeText(`${baseUrl}/submit/${code}`);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">새 업체 코드 발급</h2>
        <p className="text-xs text-gray-400 mb-3">링크를 업체에 전달하면 해당 업체만 데이터를 입력할 수 있습니다.</p>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            placeholder="업체명 입력 (예: 한강조경)"
            className="flex-grow border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <button
            type="submit"
            disabled={isCreating || !newCompany.trim()}
            className="px-5 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
          >
            {isCreating ? '발급 중...' : '코드 발급'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">업체명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">코드</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">발급일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">상태</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tokens.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">발급된 코드가 없습니다.</td>
              </tr>
            )}
            {tokens.map((token) => (
              <tr key={token.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{token.company_name}</td>
                <td className="px-6 py-4">
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">{token.code}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(token.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${token.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {token.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => copyLink(token.code)} className="text-sm text-blue-500 hover:underline">
                      {copiedId === token.code ? '복사됨!' : '링크 복사'}
                    </button>
                    <button onClick={() => handleToggle(token)} className="text-sm text-gray-500 hover:underline">
                      {token.is_active ? '비활성화' : '활성화'}
                    </button>
                    <button onClick={() => handleDelete(token)} className="text-sm text-red-400 hover:underline">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──
export default function TreeSalesClient({ initialData, lastSyncTime, priceChangeMap = {}, initialTokens = [] }) {
  const [allData, setAllData] = useState(initialData);
  const [lastSync, setLastSync] = useState(lastSyncTime);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState('list');

  const supabase = createClientComponentClient();

  const fetchAllData = useCallback(async () => {
    const { data } = await supabase
      .from('tree_sales_info')
      .select('*')
      .order('region', { ascending: true })
      .order('tree_name', { ascending: true });
    if (data?.length) {
      setAllData(data);
      const latest = data.reduce((max, item) => ((item.last_updated || '') > max ? item.last_updated : max), '');
      if (latest) setLastSync(latest);
    }
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('tree-sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tree_sales_info' }, () => {
        fetchAllData().then(() => {
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 4000);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAllData, supabase]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/sync-tree-sales', { method: 'POST' });
      await fetchAllData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tree-sales/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setAllData((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const stats = useMemo(() => ({
    total: allData.length,
    companies: new Set(allData.map((d) => d.company_name).filter(Boolean)).size,
    treeTypes: new Set(allData.map((d) => d.tree_name).filter(Boolean)).size,
    regions: new Set(allData.map((d) => d.region).filter(Boolean)).size,
  }), [allData]);

  const regionOptions = useMemo(() => {
    const unique = [...new Set(allData.map((d) => d.region).filter(Boolean))].sort();
    return ['전체', ...unique];
  }, [allData]);

  const filteredData = useMemo(() => {
    let result = allData;
    if (selectedRegion !== '전체') result = result.filter((d) => d.region === selectedRegion);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) =>
        d.tree_name?.toLowerCase().includes(q) ||
        d.region?.toLowerCase().includes(q) ||
        d.size?.toLowerCase().includes(q) ||
        d.company_name?.toLowerCase().includes(q)
      );
    }
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const aVal = Number(a[sortConfig.key]) || 0;
        const bVal = Number(b[sortConfig.key]) || 0;
        return sortConfig.dir === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return result;
  }, [allData, selectedRegion, searchQuery, sortConfig]);

  const groupedData = useMemo(() => filteredData.reduce((acc, item) => {
    const region = item.region || '기타';
    (acc[region] = acc[region] || []).push(item);
    return acc;
  }, {}), [filteredData]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const handleExport = () => {
    const headers = ['지역', '업체명', '수목명', '규격', '가격', '수량', '연락처', '비고'];
    const rows = filteredData.map((d) =>
      [d.region, d.company_name, d.tree_name, d.size, d.price, d.quantity, d.contact_info, d.remarks]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
    );
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `조경수DB_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilter = searchQuery.trim() || selectedRegion !== '전체';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-xl mx-auto">
      {/* 헤더 */}
      <header className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">전국 조경수 DB</h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
              마지막 동기화: {formatSync(lastSync)}
              {justUpdated && <span className="text-emerald-500 font-medium">· 업데이트됨</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              CSV 내보내기
            </button>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {isSyncing ? <><span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />동기화 중</> : '수동 동기화'}
            </button>
          </div>
        </div>
      </header>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: '전체', value: `${stats.total}건` },
          { label: '업체', value: `${stats.companies}곳` },
          { label: '수목 종류', value: `${stats.treeTypes}종` },
          { label: '지역', value: `${stats.regions}개` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {[
          { key: 'list', label: '전체 목록' },
          { key: 'analysis', label: '가격 분석' },
          { key: 'suppliers', label: '공급업체 코드' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 가격 분석 탭 */}
      {activeTab === 'analysis' && <PriceAnalysis data={allData} />}

      {/* 공급업체 코드 탭 */}
      {activeTab === 'suppliers' && <SupplierCodes initialTokens={initialTokens} />}

      {/* 전체 목록 탭 */}
      {activeTab === 'list' && (
        <>
          {/* 검색 + 필터 */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="수목명, 지역, 규격, 업체명 검색..."
              className="flex-grow min-w-52 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {hasFilter && (
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-800">{filteredData.length}건</span> 검색됨
                {selectedRegion !== '전체' && ` · ${selectedRegion}`}
                {searchQuery.trim() && ` · "${searchQuery}"`}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedRegion('전체'); setSortConfig({ key: null, dir: 'asc' }); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                초기화
              </button>
            </div>
          )}

          <div className="space-y-8">
            {Object.keys(groupedData).length > 0 ? (
              Object.entries(groupedData).map(([region, items]) => (
                <div key={region}>
                  <h2 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
                    {region}
                    <span className="ml-2 text-sm font-normal text-gray-400">{items.length}건</span>
                  </h2>
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">지역</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">업체명</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">수목명</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">규격</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-gray-600 select-none whitespace-nowrap" onClick={() => handleSort('price')}>
                              가격 <SortIcon col="price" sortConfig={sortConfig} />
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-gray-600 select-none whitespace-nowrap" onClick={() => handleSort('quantity')}>
                              수량 <SortIcon col="quantity" sortConfig={sortConfig} />
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">연락처</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">비고</th>
                            <th className="px-5 py-3 w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-5 py-3.5 text-sm text-gray-500">{item.region}</td>
                              <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{item.company_name}</td>
                              <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{item.tree_name}</td>
                              <td className="px-5 py-3.5 text-sm text-gray-500">{item.size}</td>
                              <td className="px-5 py-3.5 text-sm text-gray-700">
                                <span className="inline-flex items-center">
                                  {item.price ? `${item.price.toLocaleString()}원` : '-'}
                                  <PriceChangeBadge item={item} priceChangeMap={priceChangeMap} />
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-sm text-gray-500">{item.quantity || '-'}</td>
                              <td className="px-5 py-3.5 text-sm text-gray-500">{item.contact_info}</td>
                              <td className="px-5 py-3.5 text-sm text-gray-400">{item.remarks}</td>
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  disabled={deletingId === item.id}
                                  className="text-gray-200 hover:text-red-400 transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100"
                                >
                                  {deletingId === item.id ? '⏳' : '✕'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white border border-gray-100 rounded-xl">
                <p className="text-gray-400">검색 결과가 없습니다.</p>
                {hasFilter && (
                  <button onClick={() => { setSearchQuery(''); setSelectedRegion('전체'); }} className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline">
                    필터 초기화
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
