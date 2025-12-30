'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link'; // 링크 컴포넌트 추가
import { supabase } from '@/lib/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  Target, Trophy, AlertTriangle, TrendingUp, Search, Plus, 
  BarChart3, PieChart as PieIcon, Filter, Zap, Info, FileSpreadsheet, ArrowUpRight
} from 'lucide-react';

// --- 입찰 분석 전용 통계 카드 ---
const BiddingStatCard = ({ title, value, subValue, icon: Icon, colorClass, bgColor }) => (
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

export default function BiddingStrategyDashboard() {
  const [loading, setLoading] = useState(true);
  const [biddingData, setBiddingData] = useState([]);

  useEffect(() => {
    // 임의 수치를 활용한 데모 데이터 구성
    const demoBidding = [
      { id: 1, site_name: 'LHQ 전남권 매입임대 유지보수', client: 'LH공사', my_rate: 87.521, win_rate: 87.525, result: '낙찰', reason: '전략적 적중', gap: 2.1 },
      { id: 2, site_name: '광주선운2 A-2BL 조경식재', client: 'LH공사', my_rate: 88.120, win_rate: 87.210, result: '탈락', reason: '저가 수주 경쟁', gap: -1.5 },
      { id: 3, site_name: '광주연구개발특구 첨단3지구', client: '광주도시공사', my_rate: 86.950, win_rate: 86.948, result: '탈락', reason: '단순 운찰', gap: -0.1 },
      { id: 4, site_name: '광주신창동 지주택 조경', client: '조합', my_rate: 91.200, win_rate: 91.150, result: '낙찰', reason: '기술제안 우수', gap: 4.5 },
      { id: 5, site_name: '부산 에코델타시티 16BL 시설물', client: '중흥건설', my_rate: 87.900, win_rate: 87.850, result: '낙찰', reason: '전략적 적중', gap: 1.2 },
    ];
    setBiddingData(demoBidding);
    setLoading(false);
  }, []);

  const winCount = biddingData.filter(d => d.result === '낙찰').length;
  const winRate = ((winCount / biddingData.length) * 100).toFixed(1);
  const avgProfitGap = (biddingData.reduce((acc, cur) => acc + (cur.result === '낙찰' ? cur.gap : 0), 0) / winCount).toFixed(2);

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">전략 데이터 분석 중...</div>;

  return (
    <div className="bg-[#f8fafc] min-h-screen p-6 lg:p-10">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Target size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bidding Intelligence</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">스마트 입찰 분석 및 수주 전략</h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">과거 낙찰 데이터를 분석하여 최적의 투찰률과 수주 성공 확률을 제시합니다.</p>
        </div>
        
        {/* [수정] 신규 입찰 등록 버튼에 Link 연결 */}
        <Link 
            href="/management/bidding-strategy/new" 
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
        >
          <Plus size={18} /> 신규 입찰 등록
        </Link>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BiddingStatCard title="입찰 성공률 (Win Rate)" value={`${winRate}%`} subValue={`총 ${biddingData.length}건 중 ${winCount}건 낙찰`} icon={Trophy} colorClass="text-blue-600" bgColor="bg-blue-50" />
          <BiddingStatCard title="수주 타겟 적중률" value="75.0%" subValue="전략적 수주 대상 낙찰 비율" icon={Zap} colorClass="text-amber-600" bgColor="bg-amber-50" />
          <BiddingStatCard title="낙찰 대비 수익성 Gap" value={`+${avgProfitGap}%`} subValue="낙찰가와 실행예산의 차이 관리" icon={TrendingUp} colorClass="text-emerald-600" bgColor="bg-emerald-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" /> 발주처별 최적 투찰률 분석 (억원)
              </h3>
              <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400">데이터 기반 추천</div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="my_rate" name="당사 투찰률" unit="%" domain={[85, 95]} tick={{fontSize: 11}} />
                  <YAxis type="number" dataKey="win_rate" name="낙찰 투찰률" unit="%" domain={[85, 95]} tick={{fontSize: 11}} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <Scatter name="낙찰 성공" data={biddingData.filter(d => d.result === '낙찰')} fill="#3b82f6" />
                  <Scatter name="입찰 탈락" data={biddingData.filter(d => d.result === '탈락')} fill="#e2e8f0" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
              <Info size={18} className="text-blue-600 mt-0.5" />
              <p className="text-[12px] text-blue-800 font-medium leading-relaxed">
                <strong>전략 분석 가이드:</strong> LH공사 발주 공사는 투찰률 87.5% 대에서 당첨 확률이 가장 높습니다. <br />
                과거 데이터 기반 추천 범위: <strong>87.520% ~ 87.525%</strong>
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-800 mb-8 flex items-center gap-2">
              <PieIcon size={18} className="text-rose-600" /> 입찰 실패 사유 분석 (태그 기반)
            </h3>
            <div className="space-y-4">
              {[
                { label: '단순 운찰 (적격심사)', value: 45, color: 'bg-slate-200' },
                { label: '저가 수주 경쟁', value: 30, color: 'bg-rose-500' },
                { label: '기술 제안서 감점', value: 15, color: 'bg-amber-500' },
                { label: '실적 점수 미달', value: 10, color: 'bg-blue-500' },
              ].map((reason) => (
                <div key={reason.label}>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5">
                    <span className="text-slate-600">{reason.label}</span>
                    <span className="text-slate-900">{reason.value}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${reason.color}`} style={{ width: `${reason.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 p-5 border border-dashed border-rose-200 rounded-2xl bg-rose-50/30">
              <h4 className="text-xs font-black text-rose-700 flex items-center gap-2 mb-2 uppercase">
                <AlertTriangle size={14} /> 입찰 참여 재고 알림 (Go/No-Go)
              </h4>
              <p className="text-[12px] text-rose-600 font-bold leading-tight">
                현재 데이터 분석 결과, 저가 경쟁이 심화된 공구입니다. <br />
                당사 수주 확률 10% 미만으로 판단되니 입찰 참여 재고를 권장합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-base font-black text-slate-800">최근 입찰 히스토리 및 분석 결과</h3>
            <div className="flex gap-2">
              <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-blue-600"><Filter size={16} /></button>
              <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-green-600"><FileSpreadsheet size={16} /></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">공사명 / 발주처</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">당사 투찰률</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">낙찰 투찰률</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">결과 및 원인</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">수익성 (Gap)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {biddingData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-slate-800 tracking-tight">{item.site_name}</p>
                      <p className="text-[11px] text-slate-400 font-bold">{item.client}</p>
                    </td>
                    <td className="px-8 py-5 text-center font-mono font-bold text-slate-600">{item.my_rate}%</td>
                    <td className="px-8 py-5 text-center font-mono font-bold text-blue-600">{item.win_rate}%</td>
                    <td className="px-8 py-5 text-center">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                        item.result === '낙찰' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.result} ({item.reason})
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-bold">
                      <span className={item.gap > 0 ? 'text-blue-600' : 'text-rose-500'}>
                        {item.gap > 0 ? '+' : ''}{item.gap}%
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