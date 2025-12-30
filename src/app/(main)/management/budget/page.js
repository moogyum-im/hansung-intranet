'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  TrendingDown, 
  AlertTriangle, 
  Activity,
  BarChart3, 
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  RefreshCw
} from 'lucide-react';

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, bgColor }) => (
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

export default function ExecutiveBudgetDashboard() {
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSiteBudgets = async () => {
    setIsRefreshing(true);
    try {
      // 1. 모든 현장 정보 로드
      const { data: sites, error: siteError } = await supabase
        .from('construction_sites')
        .select('id, name, budget, status') 
        .order('name', { ascending: true });

      if (siteError) throw siteError;

      // 2. 모든 작업 일보(과거 내역 포함) 로드하여 즉석 합산
      const { data: reports, error: reportError } = await supabase
        .from('daily_site_reports')
        .select('site_id, notes');

      if (reportError) throw reportError;

      // 3. 데이터 매핑 및 전수 합산 처리
      const processed = sites.map(site => {
        const siteReports = reports.filter(r => r.site_id === site.id);
        
        // 각 리포트의 JSON(notes) 내부 금액을 모두 더함
        const totalSpent = siteReports.reduce((acc, report) => {
            try {
                const notes = JSON.parse(report.notes);
                const labor = (notes.labor_costs || []).reduce((s, r) => s + (Number(r.total) || 0), 0);
                const tree = (notes.tree_costs || []).reduce((s, r) => s + (Number(r.total) || 0), 0);
                const mat = (notes.material_costs || []).reduce((s, r) => s + (Number(r.total) || 0), 0);
                const equip = (notes.equipment_costs || []).reduce((s, r) => s + (Number(r.total) || 0), 0);
                const card = (notes.card_costs || []).reduce((s, r) => s + (Number(r.price) || 0), 0);
                const trans = (notes.transport_costs || []).reduce((s, r) => s + (Number(r.total) || 0), 0);
                return acc + labor + tree + mat + equip + card + trans;
            } catch (e) {
                return acc;
            }
        }, 0);

        const budget = Number(site.budget || 0);
        const balance = budget - totalSpent;
        const rate = budget > 0 ? ((totalSpent / budget) * 100).toFixed(1) : 0;
        
        return {
          id: site.id,
          name: site.name,
          budget: budget,
          spent: totalSpent,
          balance: balance,
          rate: parseFloat(rate),
          isOver: balance < 0,
          status: site.status
        };
      });

      setBudgetData(processed);
    } catch (error) {
      console.error('데이터 로드 실패:', error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSiteBudgets();
  }, []);

  const totals = {
    budget: budgetData.reduce((acc, curr) => acc + curr.budget, 0),
    spent: budgetData.reduce((acc, curr) => acc + curr.spent, 0),
    overCount: budgetData.filter(d => d.isOver).length
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold text-xs tracking-widest animate-pulse">과거 내역 전수 조사 중...</p>
        </div>
    </div>
  );

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 lg:p-10">
      <header className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Activity size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">C-Level MODE</span>
                </div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                    실행예산 전수 관제 보드
                </h1>
                <p className="text-slate-500 mt-2 font-medium text-sm">모든 과거 작업일보 내역을 실시간으로 전수 합산하여 표시합니다.</p>
            </div>
            <div className="flex items-center gap-3">
                <button 
                  onClick={fetchSiteBudgets}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                  데이터 강제 업데이트
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="총 실행예산 합계" 
            value={`₩${(totals.budget / 100000000).toFixed(2)}억`} 
            subValue="전체 프로젝트" 
            icon={Wallet} 
            colorClass="text-blue-600" 
            bgColor="bg-blue-50"
          />
          <StatCard 
            title="전수 합산 실투입 원가" 
            value={`₩${(totals.spent / 100000000).toFixed(2)}억`} 
            subValue={`평균 집행률 ${totals.budget > 0 ? ((totals.spent / totals.budget) * 100).toFixed(1) : 0}%`} 
            icon={TrendingDown} 
            colorClass="text-amber-600" 
            bgColor="bg-amber-50"
          />
          <StatCard 
            title="예산 위험 현장" 
            value={`${totals.overCount}개소`} 
            subValue="실시간 한도 초과" 
            icon={AlertTriangle} 
            colorClass="text-rose-600" 
            bgColor="bg-rose-50"
          />
        </div>

        {budgetData.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-[2rem] p-20 text-center">
            <p className="text-slate-500 font-bold">데이터가 존재하지 않습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-base font-black text-slate-800 mb-8 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />
                현장별 투입 분석 (과거 내역 포함)
              </h3>
              <div className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetData} layout="vertical" margin={{ left: 40, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} formatter={(val) => `₩${(Number(val) / 100000000).toFixed(2)}억`} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} formatter={(v) => v === 'budget' ? '실행예산' : '실투입원가(전수합산)'} />
                    <Bar dataKey="budget" name="실행예산" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="spent" name="실투입원가" radius={[0, 4, 4, 0]} barSize={12}>
                      {budgetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isOver ? '#f43f5e' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-base font-black text-slate-800 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={18} className="text-blue-600" />
                  현장별 집행 상세 (누적 기록)
                </div>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {budgetData.map((site, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border transition-all ${site.isOver ? 'border-rose-100 bg-rose-50/30' : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                          <span className="text-[13px] font-black text-slate-800 tracking-tight truncate max-w-[150px]">{site.name}</span>
                          {site.isOver && <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">한도 초과</span>}
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${site.isOver ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>{site.rate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ease-out ${site.isOver ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(site.rate, 100)}%` }} /></div>
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">집행 누계액</span>
                        <span className={`text-sm font-black ${site.isOver ? 'text-rose-600' : 'text-slate-700'}`}>₩{site.spent.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold">집행 잔액</span>
                        <p className={`text-xs font-bold mt-0.5 ${site.balance < 0 ? 'text-rose-500' : 'text-slate-500'}`}>₩{site.balance.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}