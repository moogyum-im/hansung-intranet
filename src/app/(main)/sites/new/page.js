'use client';

import { useState, useEffect, Suspense } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '../../../../lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Building2, Users, Calendar, BarChart3, ChevronLeft, ShieldCheck, Leaf, Hammer, ClipboardList } from 'lucide-react';

function NewSiteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const siteId = searchParams.get('id');
    const { employee } = useEmployee();

    const [formData, setFormData] = useState({
        name: '', site_type: '조경', contract_type: '도급', address: '',
        client: '', budget: '', start_date: '', end_date: '',
        description: '', pm_id: '',
        status: '대기', 
        progress_plant: 0, progress_facility: 0,
        is_plant_active: true, is_facility_active: true
    });

    const [allUsers, setAllUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function loadInitialData() {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, department, position')
                .order('full_name', { ascending: true });
            if (profiles) setAllUsers(profiles);

            if (siteId) {
                const { data: siteData, error } = await supabase
                    .from('construction_sites')
                    .select('*')
                    .eq('id', siteId)
                    .single();

                if (error) {
                    toast.error('현장 정보를 불러오지 못했습니다.');
                } else if (siteData) {
                    setFormData({
                        ...siteData,
                        budget: siteData.budget?.toString() || '',
                        start_date: siteData.start_date || '',
                        end_date: siteData.end_date || '',
                    });
                }
            }
        }
        loadInitialData();
    }, [siteId]);

    const formatPrice = (value) => {
        if (!value) return "";
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name === 'budget') {
            const onlyNums = value.replace(/[^0-9]/g, '');
            setFormData(prev => ({ ...prev, [name]: onlyNums }));
        } else {
            setFormData(prev => ({ 
                ...prev, 
                [name]: type === 'checkbox' ? checked : value 
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employee) return toast.error('인증 정보가 없습니다.');
        if (!formData.name.trim()) return toast.error('현장 명칭은 필수 입력 사항입니다.');

        setIsLoading(true);
        try {
            const finalData = {
                ...formData,
                start_date: formData.start_date.trim() === "" ? null : formData.start_date,
                end_date: formData.end_date.trim() === "" ? null : formData.end_date,
                budget: formData.budget ? parseInt(formData.budget) : null,
                progress_plant: parseFloat(Number(formData.progress_plant || 0).toFixed(4)),
                progress_facility: parseFloat(Number(formData.progress_facility || 0).toFixed(4))
            };

            let error;
            let currentId = siteId;

            if (siteId) {
                const { error: updateError } = await supabase
                    .from('construction_sites')
                    .update(finalData)
                    .eq('id', siteId);
                error = updateError;
            } else {
                const { data: newSite, error: insertError } = await supabase
                    .from('construction_sites')
                    .insert([finalData])
                    .select('id')
                    .single();
                error = insertError;
                if (newSite) currentId = newSite.id;
            }

            if (error) throw error;

            // 참여자 정보 갱신 (PM만 등록되도록 수정)
            const uniqueUserIds = Array.from(new Set([
                formData.pm_id, 
                employee.id
            ].filter(id => id && id !== "")));

            const membersToInsert = uniqueUserIds.map(uid => ({
                site_id: currentId,
                user_id: uid,
                role: uid === formData.pm_id ? '현장소장' : '현장멤버'
            }));

            if (membersToInsert.length > 0) {
                await supabase.from('site_members').upsert(membersToInsert, { onConflict: 'site_id, user_id' });
            }

            toast.success(siteId ? '현장 정보가 수정되었습니다.' : '현장 등록이 완료되었습니다.');
            router.push(`/sites/${currentId}`);
        } catch (error) {
            console.error(error);
            toast.error('처리에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans italic-none">
            <div className="bg-[#1E293B] sticky top-0 z-30 shadow-lg font-sans">
                <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href={siteId ? `/sites/${siteId}` : "/sites"} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 font-bold text-sm font-sans">
                            <ChevronLeft size={20} /> 돌아가기
                        </Link>
                        <div className="h-4 w-px bg-slate-700"></div>
                        <h1 className="text-white font-black tracking-tight font-sans">
                            {siteId ? '현장 정보 수정' : '신규 현장 개설 시스템'}
                        </h1>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-12 font-sans">
                <form onSubmit={handleSubmit} className="space-y-8 font-sans">
                    {/* 기본 계약 정보 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-slate-700 font-bold font-sans">
                            <Building2 size={18} />
                            <span className="text-sm font-sans">기본 계약 정보</span>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-6 gap-6 font-sans">
                            <div className="md:col-span-4 font-sans">
                                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest font-sans">공사 명칭 (계약서 기준)</label>
                                <input name="name" value={formData.name} onChange={handleChange} required 
                                    className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-slate-900 outline-none font-bold transition-all font-sans" 
                                    placeholder="정식 공사명을 입력하십시오." />
                            </div>
                            <div className="md:col-span-2 font-sans">
                                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest font-sans">진행 상태</label>
                                <select name="status" value={formData.status} onChange={handleChange} 
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-slate-900 outline-none font-sans">
                                    <option value="대기">대기</option><option value="진행중">진행중</option><option value="보류">보류</option><option value="완료">완료</option>
                                </select>
                            </div>
                            <div className="md:col-span-3 font-sans">
                                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest font-sans">발주처 명칭</label>
                                <input name="client" value={formData.client} onChange={handleChange} 
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none font-bold font-sans" />
                            </div>
                            <div className="md:col-span-3 font-sans">
                                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest font-sans">계약 구분</label>
                                <select name="contract_type" value={formData.contract_type} onChange={handleChange} 
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none font-bold font-sans">
                                    <option>도급</option><option>관급</option><option>자체 사업</option>
                                </select>
                            </div>
                            <div className="col-span-full font-sans">
                                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest font-sans">현장 소재지 주소</label>
                                <input name="address" value={formData.address} onChange={handleChange} 
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none font-bold font-sans" />
                            </div>
                        </div>
                    </div>

                    {/* 공종 관리 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-slate-700 font-bold font-sans">
                            <BarChart3 size={18} />
                            <span className="text-sm font-sans">공종 관리 및 공정률 설정</span>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
                            <div className={`p-6 rounded-2xl border-2 transition-all font-sans ${formData.is_plant_active ? 'border-slate-800 bg-slate-50' : 'border-slate-100 opacity-40'}`}>
                                <div className="flex items-center justify-between mb-6 font-sans">
                                    <div className="flex items-center gap-2 font-black text-slate-900 font-sans">
                                        <Leaf size={16} className="text-emerald-600 font-sans" />
                                        <span className="font-sans">식재 공사</span>
                                    </div>
                                    <input type="checkbox" name="is_plant_active" checked={formData.is_plant_active} onChange={handleChange} className="w-5 h-5 accent-slate-900 font-sans" />
                                </div>
                                <div className="space-y-3 font-sans">
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>초기 공정률</span><span className="text-slate-900">{Number(formData.progress_plant || 0).toFixed(4)}%</span></div>
                                    <input type="range" name="progress_plant" min="0" max="100" step="0.0001" value={formData.progress_plant} onChange={(e) => setFormData({...formData, progress_plant: e.target.value})} disabled={!formData.is_plant_active} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 font-sans" />
                                </div>
                            </div>
                            <div className={`p-6 rounded-2xl border-2 transition-all font-sans ${formData.is_facility_active ? 'border-slate-800 bg-slate-50' : 'border-slate-100 opacity-40'}`}>
                                <div className="flex items-center justify-between mb-6 font-sans">
                                    <div className="flex items-center gap-2 font-black text-slate-900 font-sans">
                                        <Hammer size={16} className="text-blue-600 font-sans" />
                                        <span className="font-sans">시설물 공사</span>
                                    </div>
                                    <input type="checkbox" name="is_facility_active" checked={formData.is_facility_active} onChange={handleChange} className="w-5 h-5 accent-slate-900 font-sans" />
                                </div>
                                <div className="space-y-3 font-sans">
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>초기 공정률</span><span className="text-slate-900">{Number(formData.progress_facility || 0).toFixed(4)}%</span></div>
                                    <input type="range" name="progress_facility" min="0" max="100" step="0.0001" value={formData.progress_facility} onChange={(e) => setFormData({...formData, progress_facility: e.target.value})} disabled={!formData.is_facility_active} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 font-sans" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 관리자 및 예산 설정 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-slate-700 font-bold font-sans">
                            <Users size={18} />
                            <span className="text-sm font-sans">관리자 및 예산 설정</span>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                            <div className="md:col-span-2 font-sans">
                                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">현장 소장 (책임자)</label>
                                <select name="pm_id" value={formData.pm_id} onChange={handleChange} className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl font-bold outline-none font-sans">
                                    <option value="">-- 소장 선택 --</option>
                                    {allUsers.map(user => <option key={user.id} value={user.id}>{user.full_name} ({user.department})</option>)}
                                </select>
                            </div>
                            {/* 담당자 선택 칸 삭제됨 */}
                            <div className="col-span-full font-sans">
                                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">총 도급액</label>
                                <div className="relative font-sans">
                                    <input type="text" name="budget" value={formatPrice(formData.budget)} onChange={handleChange} className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl font-black outline-none" placeholder="0" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm uppercase">원 (KRW)</span>
                                </div>
                            </div>
                            <div className="font-sans">
                                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">착공일</label>
                                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl font-bold outline-none font-sans" />
                            </div>
                            <div className="font-sans">
                                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">준공일</label>
                                <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl font-bold outline-none font-sans" />
                            </div>
                        </div>
                    </div>

                    {/* 공사 개요 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-slate-700 font-bold font-sans">
                            <ClipboardList size={18} />
                            <span className="text-sm font-sans">공사 개요 및 특이사항</span>
                        </div>
                        <div className="p-8 font-sans">
                            <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">현장 상세 설명</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={5}
                                className="w-full px-4 py-4 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-slate-900 transition-all font-sans"
                                placeholder="현장 관련 특이사항이나 관리 주의사항을 자유롭게 기재하십시오." />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-8 font-sans">
                        <Link href={siteId ? `/sites/${siteId}` : "/sites"} className="px-8 py-3 text-sm font-black text-slate-400 hover:text-slate-900 transition-all">
                            취소 및 돌아가기
                        </Link>
                        <button type="submit" disabled={isLoading} 
                            className="px-12 py-3 bg-[#1E293B] text-white rounded-xl font-black text-sm shadow-xl hover:bg-black transition-all disabled:bg-slate-300 active:scale-95">
                            {isLoading ? '처리 중...' : (siteId ? '현장 정보 수정 완료' : '신규 현장 개설 완료')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function NewSitePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading System...</p>
            </div>
        }>
            <NewSiteContent />
        </Suspense>
    );
}