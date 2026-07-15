'use client';

import { useState } from 'react';

export default function SupplierCodesClient({ initialTokens }) {
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
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">공급업체 코드 관리</h1>
        <p className="text-sm text-gray-500 mt-1">업체별 수목 입력 링크를 발급합니다. 링크를 업체에 전달하면 해당 업체만 데이터를 입력할 수 있습니다.</p>
      </header>

      {/* 코드 발급 폼 */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-3">새 업체 코드 발급</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            placeholder="업체명 입력 (예: 한강조경)"
            className="flex-grow border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={isCreating || !newCompany.trim()}
            className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            {isCreating ? '발급 중...' : '코드 발급'}
          </button>
        </form>
      </div>

      {/* 코드 목록 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">업체명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">코드</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">발급일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => copyLink(token.code)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      {copiedId === token.code ? '복사됨!' : '링크 복사'}
                    </button>
                    <button
                      onClick={() => handleToggle(token)}
                      className="text-sm text-gray-500 hover:underline"
                    >
                      {token.is_active ? '비활성화' : '활성화'}
                    </button>
                    <button
                      onClick={() => handleDelete(token)}
                      className="text-sm text-red-500 hover:underline"
                    >
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
