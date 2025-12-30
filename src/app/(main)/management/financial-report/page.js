'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { 
  TrendingDown, // <-- 누락되었던 아이콘 추가
  Wallet, 
  AlertCircle, 
  Landmark, 
  ArrowRightLeft, 
  Calculator, 
  Users, 
  Building2,
  BarChart3,
  PieChart as PieIcon
} from 'lucide-react';

// --- 재무 전용 통계 카드 ---
const FinanceStatCard = ({ title, value, subValue, icon: Icon, colorClass, bgColor }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">{value}</h3>
        <p className={`text-[11px] mt-1.5 font-bold px-2 py-0.5 rounded-full inline-block ${bgColor} ${colorClass}`}>
          {subValue}
        </p>
      </div>
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <Icon size={24} className={colorClass} />
      </div>
    </div>
  </div>
);

export default function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [pnlData, setPnlData] = useState([]);

  // --- [핵심] 작업일보 데이터를 재무 계정별로 자동 매핑하여 집계하는 함수 ---
  const fetchFinancialStatus = async () => {
    try {
      // 1. 현장 기본 정보 로드
      const { data: sites, error: siteError } = await supabase
        .from('construction_sites')
        .select('id, name, budget');
      
      if (siteError) throw siteError;

      // 2. 모든 작업일보의 비용 내역(notes JSON) 로드
      const { data: reports, error: reportError } = await supabase
        .from('daily_site_reports')
        .select('site_id, notes');
      
      if (reportError) throw reportError;

      // 3. 현장별 계정 매핑 집계
      const siteStats = sites.map(site => {
        const siteReports = reports.filter(r => r.site_id === site.id);
        
        let labor = 0, tree = 0, material = 0, equipment = 0, card = 0, transport = 0;

        siteReports.forEach(report => {
          try {
            const notes = JSON.parse(report.notes);
            // 작업일보 내부의 각 테이블 합계 자동 매핑
            labor += (notes.labor_costs?.reduce((sum, r) => sum + (Number(r.total) || 0), 0) || 0);
            tree += (notes.tree_costs?.reduce((sum, r) => sum + (Number(r.total) || 0), 0) || 0);
            material += (notes.material_costs?.reduce((sum, r) => sum + (Number(r.total) || 0), 0) || 0);
            equipment += (notes.equipment_costs?.reduce((sum, r) => sum + (Number(r.total) || 0), 0) || 0);
            card += (notes.card_costs?.reduce((sum, r) => sum + (Number(r.price) || 0), 0) || 0);
            transport += (notes.transport_costs?.reduce((sum, r) => sum + (Number(r.total) || 0), 0) || 0);
          } catch (e) { console.error("JSON 파싱 에러", e); }
        });

        const totalExpense = labor + tree + material + equipment + card + transport;
        const revenue = Number(site.budget || 0);
        const profit = revenue - totalExpense;
        const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

        return {
          name: site.name,
          revenue,
          labor,
          material: tree + material, // 수목+자재 통합
          equipment,
          other: card + transport, // 카드+운반비 통합
          totalExpense,
          profit,
          margin: parseFloat(margin)
        };
      });

      setPnlData(siteStats);
    } catch (err) {
      console.error("재무 집계 중 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialStatus();
  }, []);

  const totalRevenue = pnlData.reduce((acc, cur) => acc + cur.revenue, 0);
  const totalExpense = pnlData.reduce((acc, cur) => acc + cur.totalExpense, 0);
  const totalProfit = totalRevenue - totalExpense;

  const categoryData = [
    { name: '노무비', value: pnlData.reduce((acc, cur) => acc + cur.labor, 0), fill: '#3b82f6' },
    { name: '자재비', value: pnlData.reduce((acc, cur) => acc + cur.material, 0), fill: '#10b981' },
    { name: '장비비', value: pnlData.reduce((acc, cur) => acc + cur.equipment, 0), fill: '#f59e0b' },
    { name: '기타/일반', value: pnlData.reduce((acc, cur) => acc + cur.other, 0), fill: '#6366f1' },
  ];

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">전사 재무 데이터 매핑 중...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 lg:p-10">
      <header className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Landmark size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">FINANCIAL-REPORT</span>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">스마트 손익(P&L) 대시보드</h1>
            <p className="text-slate-500 mt-2 font-medium text-sm">작업일보 계정 데이터를 자동으로 분류하여 실시간 손익을 집계합니다.</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FinanceStatCard title="누적 매출액" value={`₩${(totalRevenue / 100000000).toFixed(2)}억`} subValue="전체 실행예산" icon={Wallet} colorClass="text-blue-600" bgColor="bg-blue-50" />
          <FinanceStatCard title="누적 투입원가" value={`₩${(totalExpense / 100000000).toFixed(2)}억`} subValue="실 집행 총액" icon={TrendingDown} colorClass="text-rose-600" bgColor="bg-rose-50" />
          <FinanceStatCard title="누적 세전이익" value={`₩${(totalProfit / 100000000).toFixed(2)}억`} subValue={`평균 이익률 ${totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(1) : 0}%`} icon={Calculator} colorClass="text-emerald-600" bgColor="bg-emerald-50" />
          <FinanceStatCard title="투입 인건비" value={`₩${(categoryData[0].value / 10000000).toFixed(1)}천만`} subValue="노무비 집계 현황" icon={Users} colorClass="text-indigo-600" bgColor="bg-indigo-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-800 mb-8 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" /> 현장별 매출 대비 손익 구조 (억원)
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip formatter={(val) => `₩${(val / 100000000).toFixed(2)}억`} />
                  <Legend />
                  <Bar dataKey="revenue" name="매출(예산)" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalExpense" name="투입원가" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="현장이익" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-800 mb-8 flex items-center gap-2">
              <PieIcon size={18} className="text-blue-600" /> 비용 계정별 비중
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(val) => `₩${(val/10000).toLocaleString()}만원`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 상세 테이블 */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="text-base font-black text-slate-800 mb-6">현장별 세부 실적 (P&L)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400">현장명</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 text-right">매출액</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 text-right">투입원가</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 text-right">세전손익</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 text-center">이익률</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pnlData.map((site, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 text-sm">{site.name}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm">₩{site.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-rose-600">₩{site.totalExpense.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-emerald-600 font-bold">₩{site.profit.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-black px-2 py-1 rounded ${site.margin > 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {site.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}