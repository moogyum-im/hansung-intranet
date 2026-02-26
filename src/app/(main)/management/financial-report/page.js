'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, ReferenceLine
} from 'recharts';
import { 
  TrendingDown, TrendingUp, Wallet, Target, Activity, FileText, ChevronRight, X, Calendar, Camera, Cloud, Users, Truck, Construction, Printer
} from 'lucide-react';

export default function FinanceExecutiveReport() {
  const [loading, setLoading] = useState(true);
  const [pnlData, setPnlData] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [siteHistory, setSiteHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchStatus = async () => {
    try {
      const { data: sites } = await supabase.from('construction_sites').select('*');
      const { data: reports } = await supabase.from('daily_site_reports').select('id, site_id, notes, report_date').order('report_date', { ascending: false });

      const stats = sites.map(site => {
        const siteReports = reports.filter(r => r.site_id === site.id);
        const latest = siteReports[0];
        let totalCost = 0, progress = 0;

        if (latest) {
          try {
            const rawNotes = JSON.parse(latest.notes);
            totalCost = (rawNotes.settlement_costs || []).reduce((acc, cur) => acc + (Number(cur.total) || 0), 0);
            progress = (Number(rawNotes.progress_plant_prev || 0) + Number(rawNotes.progress_plant || 0) + 
                        Number(rawNotes.progress_facility_prev || 0) + Number(rawNotes.progress_facility || 0)) / 2;
          } catch (e) { console.error(e); }
        }

        const budget = Number(site.budget || 0);
        return {
          id: site.id,
          fullName: site.name,
          shortName: site.name.length > 8 ? site.name.substring(0, 8) + '..' : site.name,
          budget,
          budgetInOck: budget / 100000000, 
          totalCost,
          totalCostInOck: totalCost / 100000000,
          remainingBudget: budget - totalCost,
          remainingInOck: (budget - totalCost) / 100000000,
          progress: parseFloat(progress.toFixed(2))
        };
      });
      setPnlData(stats);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSiteSelect = async (site) => {
    setSelectedSite(site);
    setHistoryLoading(true);
    try {
      const { data } = await supabase.from('daily_site_reports').select('*').eq('site_id', site.id).order('report_date', { ascending: false });
      setSiteHistory(data || []);
    } catch (e) { console.error(e); } finally { setHistoryLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-xs tracking-widest text-slate-400">데이터 집계 중...</div>;

  return (
    <div className="bg-[#f8fafc] min-h-screen p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-10 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2 font-black">
            <Target size={16} />
            <span className="text-[10px] uppercase tracking-[0.3em]">Executive Finance Report</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic-none">전사 채산성 분석 및 예산 집행 현황</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {/* 상단 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="총 도급액" value={`₩${pnlData.reduce((a,c)=>a+c.budget, 0).toLocaleString()}`} icon={Wallet} color="text-slate-900" />
          <StatCard title="누적 집행원가" value={`₩${pnlData.reduce((a,c)=>a+c.totalCost, 0).toLocaleString()}`} icon={TrendingDown} color="text-rose-600" />
          <StatCard title="전체 가용잔액" value={`₩${pnlData.reduce((a,c)=>a+c.remainingBudget, 0).toLocaleString()}`} icon={TrendingUp} color="text-emerald-600" />
          <StatCard title="평균 공정률" value={`${(pnlData.reduce((a,c)=>a+c.progress,0)/pnlData.length).toFixed(1)}%`} icon={Activity} color="text-blue-600" />
        </div>

        {/* 차트 */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortName" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} axisLine={false} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} unit="억" />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  formatter={(val, name, props) => [`₩${props.payload[props.dataKey === 'budgetInOck' ? 'budget' : 'totalCost'].toLocaleString()}`, name]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="budgetInOck" name="도급액" fill="#e2e8f0" radius={[8, 8, 0, 0]} barSize={40} />
                <Bar dataKey="totalCostInOck" name="집행원가" fill="#1e293b" radius={[8, 8, 0, 0]} barSize={25} />
                <Bar dataKey="remainingInOck" name="가용잔액" barSize={15}>
                  {pnlData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.remainingBudget < 0 ? '#f43f5e' : '#3b82f6'} radius={entry.remainingBudget < 0 ? [0, 0, 8, 8] : [8, 8, 0, 0]} />
                  ))}
                </Bar>
                <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 목록 */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 font-black text-[10px] text-slate-400 uppercase">
                <th className="px-10 py-5">현장명</th>
                <th className="px-6 py-5 text-right">총 도급액</th>
                <th className="px-6 py-5 text-right font-sans">누적 투입원가</th>
                <th className="px-6 py-5 text-right font-sans">공정률</th>
                <th className="px-10 py-5 text-center font-sans">보고서</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pnlData.map((site, idx) => (
                <tr key={idx} onClick={() => handleSiteSelect(site)} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                  <td className="px-10 py-5 font-black text-slate-800 text-sm font-sans">{site.fullName}</td>
                  <td className="px-6 py-5 text-right font-bold text-slate-400 text-sm font-sans">₩{site.budget.toLocaleString()}</td>
                  <td className="px-6 py-5 text-right font-black text-rose-600 text-sm font-sans">₩{site.totalCost.toLocaleString()}</td>
                  <td className="px-6 py-5 text-right font-bold text-slate-800 text-sm font-sans">{site.progress}%</td>
                  <td className="px-10 py-5 text-center"><FileText size={18} className="inline text-slate-300 group-hover:text-blue-600 transition-all" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* 🚀 현장 히스토리 모달 */}
      {selectedSite && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col font-sans">
            <div className="p-8 border-b flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-slate-900">{selectedSite.fullName} 투입 이력</h2>
              <button onClick={() => setSelectedSite(null)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {historyLoading ? <div className="text-center py-20 font-bold text-slate-300">이력 로드 중...</div> : 
                siteHistory.map((log, i) => (
                  <div key={i} onClick={() => setSelectedReport(log)} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl hover:bg-blue-50 cursor-pointer transition-all border border-slate-100">
                    <div>
                      <span className="font-black text-blue-700 text-sm block">{log.report_date}</span>
                      <span className="text-xs text-slate-500 font-bold">{log.content || '작업 요약 없음'}</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* 🚀 [최종형] 금일 작업일보 서류 뷰어 (전체 화면 & 기입 데이터만) */}
      {selectedReport && (
        <div className="fixed inset-0 bg-white z-[70] flex flex-col font-sans overflow-y-auto">
          {/* 상단 컨트롤 바 */}
          <div className="sticky top-0 bg-white/80 backdrop-blur-md px-10 py-6 border-b flex justify-between items-center z-20">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl"><FileText size={24}/></div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900">{selectedReport.report_date} 작업 보고서</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedSite?.fullName}</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-200 transition-all"><Printer size={18}/> 출력하기</button>
                <button onClick={() => setSelectedReport(null)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"><X size={24}/></button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto w-full p-10 space-y-12 pb-20">
            {/* 1. 기본 정보 (날씨/공정) */}
            <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center text-center">
                    <Cloud className="text-blue-500 mb-2" size={32}/>
                    <p className="text-[10px] font-black text-slate-400 mb-1 font-sans font-sans">현장 날씨</p>
                    <p className="font-black text-slate-900 font-sans">{JSON.parse(selectedReport.notes || '{}').weather || '맑음'}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center text-center">
                    <Construction className="text-emerald-500 mb-2" size={32}/>
                    <p className="text-[10px] font-black text-slate-400 mb-1 font-sans">금일 식재 공정</p>
                    <p className="font-black text-slate-900 font-sans">{JSON.parse(selectedReport.notes || '{}').progress_plant || 0}%</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center text-center">
                    <Activity className="text-amber-500 mb-2" size={32}/>
                    <p className="text-[10px] font-black text-slate-400 mb-1 font-sans">금일 시설 공정</p>
                    <p className="font-black text-slate-900 font-sans font-sans">{JSON.parse(selectedReport.notes || '{}').progress_facility || 0}%</p>
                </div>
            </div>

            {/* 2. 금일 작업 내용 */}
            <div className="space-y-4">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2"><div className="w-1.5 h-6 bg-blue-600 rounded-full"/> 금일 작업 내용</h4>
                <div className="p-10 bg-white border-2 border-slate-100 rounded-[2.5rem] text-xl font-bold text-slate-700 leading-relaxed shadow-sm italic-none font-sans">
                    {selectedReport.content || '상세 기록된 작업 내용이 없습니다.'}
                </div>
            </div>

            {/* 3. 투입 내역 (데이터가 있는 항목만 필터링) */}
            <div className="space-y-4 font-sans font-sans font-sans">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2"><div className="w-1.5 h-6 bg-rose-600 rounded-full"/> 금일 투입 원가 상세 (기입 내역)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {JSON.parse(selectedReport.notes || '{}').settlement_costs?.filter(s => Number(s.today) > 0).map((s, i) => (
                        <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100 font-sans">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-xs">{s.item.includes('노무') ? <Users size={16}/> : s.item.includes('장비') ? <Truck size={16}/> : <Wallet size={16}/>}</div>
                                <span className="font-bold text-slate-700 font-sans">{s.item}</span>
                            </div>
                            <span className="font-black text-slate-900 text-lg font-sans">₩{Number(s.today).toLocaleString()}</span>
                        </div>
                    ))}
                    {(!JSON.parse(selectedReport.notes || '{}').settlement_costs?.some(s => Number(s.today) > 0)) && (
                        <div className="col-span-2 py-10 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed font-sans">금일 투입된 원가 내역이 없습니다.</div>
                    )}
                </div>
            </div>

            {/* 4. 현장 전경 사진 */}
            <div className="space-y-4">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2"><div className="w-1.5 h-6 bg-emerald-600 rounded-full"/> 금일 현장 전경</h4>
                <div className="grid grid-cols-2 gap-6">
                    {selectedReport.photos && selectedReport.photos.length > 0 ? selectedReport.photos.map((p, i) => (
                        <div key={i} className="rounded-[2rem] overflow-hidden aspect-[4/3] shadow-lg border-4 border-white">
                            <img src={p.url} alt="현장사진" className="w-full h-full object-cover" />
                        </div>
                    )) : (
                        <div className="col-span-2 py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center font-sans">
                            <Camera size={48} className="text-slate-200 mb-4"/>
                            <p className="font-black text-slate-400 font-sans font-sans">등록된 현장 사진이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 transition-all hover:border-blue-200">
      <div className="p-4 bg-slate-50 rounded-2xl font-sans"><Icon size={24} className={color} /></div>
      <div className="font-sans">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">{title}</p>
        <h3 className={`text-xl font-black tracking-tight ${color} font-sans`}>{value}</h3>
      </div>
    </div>
  );
}