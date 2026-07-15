'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Building2, ChevronRight } from 'lucide-react';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white';

function NewPlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSiteId = searchParams.get('siteId');

  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);

  useEffect(() => {
    supabase.from('construction_sites')
      .select('id, name, start_date, end_date, status, budget')
      .order('name')
      .then(({ data }) => {
        setSites(data || []);
        if (preselectedSiteId && data) {
          const site = data.find(s => s.id === preselectedSiteId);
          if (site) setSelectedSite(site);
        }
      });
  }, [preselectedSiteId]);

  const handleSiteChange = (siteId) => {
    if (!siteId) { setSelectedSite(null); return; }
    const site = sites.find(s => s.id === siteId);
    if (site) setSelectedSite(site);
  };

  const handleGo = () => {
    if (selectedSite) router.push(`/database/execution-plans/site/${selectedSite.id}`);
  };

  return (
    <div className="p-6 sm:p-8 max-w-xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft size={15} /> 목록으로
      </button>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">현장 선택</h1>
        <p className="text-sm text-gray-400 mt-1">현장을 선택하면 공정표 관리 페이지로 이동합니다. 분기는 다음 화면에서 추가할 수 있습니다.</p>
      </header>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">현장 선택 *</label>
          <select
            value={selectedSite?.id || ''}
            onChange={e => handleSiteChange(e.target.value)}
            className={inputCls}
            autoFocus
          >
            <option value="">현장을 선택하세요</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {selectedSite && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
            <Building2 size={15} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 space-y-0.5">
              <p className="font-semibold">{selectedSite.name}</p>
              {selectedSite.start_date && (
                <p>공사기간: {selectedSite.start_date} ~ {selectedSite.end_date || '미정'}</p>
              )}
              {selectedSite.budget && (
                <p>계약금액: {(Number(selectedSite.budget) / 100000000).toFixed(2)}억원</p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleGo}
          disabled={!selectedSite}
          className="w-full py-3 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          공정표 관리 페이지로 <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default function NewExecutionPlanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">로딩 중...</div>}>
      <NewPlanForm />
    </Suspense>
  );
}
