'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { 
  ArrowLeft, 
  Save, 
  Calculator, 
  Target, 
  Building2, 
  Calendar, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BiddingRegistrationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // 1. 입찰 등록 데이터 필드 설정
    const [formData, setFormData] = useState({
        client_name: '',       // 발주처
        project_name: '',      // 공사명
        bid_notice_date: '',   // 공고일
        bid_deadline: '',      // 입찰 마감일
        region: '',            // 지역
        base_price: 0,         // 기초금액(설계가)
        my_bid_amount: 0,      // 당사 투찰금액
        target_budget: 0,      // 목표 실행예산
        bid_rate: 0,           // 투찰률(%) - 자동계산
        expected_gap: 0,       // 수익성 Gap - 자동계산
    });

    // 2. 투찰률 및 수익성 실시간 시뮬레이션 로직
    useEffect(() => {
        const rate = formData.base_price > 0 
            ? ((formData.my_bid_amount / formData.base_price) * 100).toFixed(3) 
            : 0;
        
        const gap = formData.my_bid_amount > 0 
            ? (((formData.my_bid_amount - formData.target_budget) / formData.my_bid_amount) * 100).toFixed(2)
            : 0;

        setFormData(prev => ({ 
            ...prev, 
            bid_rate: parseFloat(rate),
            expected_gap: parseFloat(gap)
        }));
    }, [formData.base_price, formData.my_bid_amount, formData.target_budget]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const { error } = await supabase
                .from('bidding_history')
                .insert([{
                    ...formData,
                    status: '입찰중',
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
            toast.success('신규 입찰 정보가 정상적으로 등록되었습니다.');
            router.push('/management/bidding-strategy');
        } catch (error) {
            console.error('등록 실패:', error);
            toast.error('저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen p-6 lg:p-10 font-sans">
            <div className="max-w-4xl mx-auto">
                {/* 상단 네비게이션 */}
                <div className="flex justify-between items-center mb-8">
                    <button 
                        onClick={() => router.back()} 
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold transition-all"
                    >
                        <ArrowLeft size={20} /> 분석 대시보드로 이동
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2">
                            <Target size={16} className="text-blue-600" />
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Bidding Input</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 섹션 1: 입찰 기본 정보 */}
                    <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Landmark size={20} className="text-blue-600" /> 기본 입찰 정보 등록
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">공사명</label>
                                <input required name="project_name" value={formData.project_name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" placeholder="공사명을 기입하세요" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">발주처</label>
                                <input required name="client_name" value={formData.client_name} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" placeholder="예: LH공사, 수자원공사" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">공고일자</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="date" required name="bid_notice_date" value={formData.bid_notice_date} onChange={handleChange} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">입찰 마감기한</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="date" required name="bid_deadline" value={formData.bid_deadline} onChange={handleChange} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" />
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">지역정보</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input required name="region" value={formData.region} onChange={handleChange} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" placeholder="공사 현장 지역 기입" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 섹션 2: 수익성 시뮬레이션 */}
                    <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Calculator size={20} className="text-blue-600" /> 투찰 및 예상 수익 시뮬레이션
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">기초금액 (설계가)</label>
                                    <input type="number" name="base_price" value={formData.base_price} onChange={handleChange} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-blue-500 uppercase tracking-widest text-left">당사 투찰 예정가</label>
                                    <input type="number" name="my_bid_amount" value={formData.my_bid_amount} onChange={handleChange} className="w-full px-4 py-4 bg-blue-50/30 border border-blue-200 rounded-2xl text-xl font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" placeholder="0" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">목표 실행 예산</label>
                                    <input type="number" name="target_budget" value={formData.target_budget} onChange={handleChange} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                                </div>
                            </div>

                            {/* 결과 모니터링창 */}
                            <div className="bg-slate-900 rounded-[1.5rem] p-8 text-white flex flex-col justify-center relative shadow-2xl">
                                <div className="space-y-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">실시간 투찰률</p>
                                        <div className="flex items-end gap-2">
                                            <span className="text-5xl font-black text-blue-400 leading-none">{formData.bid_rate}</span>
                                            <span className="text-xl font-bold text-slate-500 mb-1">%</span>
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-800" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">예상 수익성 (Gap)</p>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-3xl font-black leading-none ${formData.expected_gap >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {formData.expected_gap > 0 ? '+' : ''}{formData.expected_gap}%
                                            </span>
                                            {formData.expected_gap < 5 && formData.expected_gap !== 0 && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-rose-500/20 text-rose-400 rounded text-[10px] font-bold">
                                                    <AlertCircle size={10} /> 수익성 주의
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 하단 저장 버튼 */}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => router.back()} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all">등록 취소</button>
                        <button type="submit" disabled={loading} className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
                            {loading ? '기록 중...' : (
                                <>
                                    <Save size={18} /> 입찰 데이터 기록 완료
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}