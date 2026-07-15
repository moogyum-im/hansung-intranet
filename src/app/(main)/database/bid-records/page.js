'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { Plus, Gavel, Trash2, ChevronRight, CalendarDays, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ALLOWED = ['임아름', '임무겸'];

export default function BidRecordsPage() {
    const router = useRouter();
    const { employee, loading } = useEmployee();
    const [projects, setProjects] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', bid_date: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!loading && employee && !ALLOWED.includes(employee.full_name)) {
            router.replace('/dashboard');
        }
    }, [employee, loading, router]);

    const fetchProjects = useCallback(async () => {
        setFetching(true);
        const { data, error } = await supabase
            .from('bid_projects')
            .select(`
                id, title, description, bid_date, created_at,
                bid_companies(company_key, company_name, is_ours),
                bid_items(id)
            `)
            .order('created_at', { ascending: false });

        if (!error) setProjects(data || []);
        setFetching(false);
    }, []);

    useEffect(() => {
        if (!loading && employee && ALLOWED.includes(employee.full_name)) {
            fetchProjects();
        }
    }, [employee, loading, fetchProjects]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error('프로젝트명을 입력하세요.');
        setSaving(true);
        const { data, error } = await supabase
            .from('bid_projects')
            .insert({ title: form.title.trim(), description: form.description.trim(), bid_date: form.bid_date || null })
            .select()
            .single();

        if (error) { toast.error('생성 실패'); setSaving(false); return; }

        // 기본 3개사 생성
        await supabase.from('bid_companies').insert([
            { project_id: data.id, company_key: 'A', company_name: 'A사', is_ours: false },
            { project_id: data.id, company_key: 'B', company_name: 'B사', is_ours: true },
            { project_id: data.id, company_key: 'C', company_name: 'C사', is_ours: false },
        ]);

        toast.success('프로젝트가 생성되었습니다.');
        setSaving(false);
        setShowModal(false);
        setForm({ title: '', description: '', bid_date: '' });
        router.push(`/database/bid-records/${data.id}`);
    };

    const handleDelete = async (id, title, e) => {
        e.stopPropagation();
        if (!confirm(`"${title}" 프로젝트를 삭제하시겠습니까?\n모든 데이터가 영구 삭제됩니다.`)) return;
        const { error } = await supabase.from('bid_projects').delete().eq('id', id);
        if (error) { toast.error('삭제 실패'); return; }
        toast.success('삭제되었습니다.');
        fetchProjects();
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">로딩 중...</div>;
    if (!employee || !ALLOWED.includes(employee.full_name)) return null;

    const ourCompanyName = (companies) => companies?.find(c => c.is_ours)?.company_name || 'B사';

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Gavel size={24} className="text-blue-500" />
                        <h1 className="text-2xl font-bold text-slate-800">입찰 기록 관리</h1>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow transition-colors"
                >
                    <Plus size={16} />
                    새 프로젝트
                </button>
            </div>

            {fetching ? (
                <div className="text-center py-20 text-slate-400">불러오는 중...</div>
            ) : projects.length === 0 ? (
                <div className="text-center py-20">
                    <Gavel size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">등록된 입찰 프로젝트가 없습니다.</p>
                    <p className="text-slate-300 text-sm mt-1">&quot;새 프로젝트&quot; 버튼으로 시작하세요.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {projects.map((p) => {
                        const companies = p.bid_companies || [];
                        const ours = companies.find(c => c.is_ours);
                        const others = companies.filter(c => !c.is_ours);
                        const itemCount = p.bid_items?.length || 0;

                        return (
                            <div
                                key={p.id}
                                onClick={() => router.push(`/database/bid-records/${p.id}`)}
                                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-base font-bold text-slate-800 truncate">{p.title}</h2>
                                        </div>
                                        {p.description && (
                                            <p className="text-sm text-slate-500 mb-3 line-clamp-2">{p.description}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            {ours && (
                                                <span className="bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">
                                                    {ours.company_name} (우리)
                                                </span>
                                            )}
                                            {others.map(c => (
                                                <span key={c.company_key} className="bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full">
                                                    {c.company_name}
                                                </span>
                                            ))}
                                            <span className="text-slate-400">·</span>
                                            <span className="text-slate-500">{itemCount}개 항목</span>
                                            {p.bid_date && (
                                                <>
                                                    <span className="text-slate-400">·</span>
                                                    <span className="flex items-center gap-1 text-slate-500">
                                                        <CalendarDays size={11} />
                                                        {p.bid_date}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={(e) => handleDelete(p.id, p.title, e)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                        <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-800">새 입찰 프로젝트</h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">프로젝트명 *</label>
                                <input
                                    type="text"
                                    placeholder="예: 2025 ○○공원 조성공사 입찰"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">설명 (선택)</label>
                                <textarea
                                    placeholder="입찰 개요, 발주처 등"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">입찰 날짜 (선택)</label>
                                <input
                                    type="date"
                                    value={form.bid_date}
                                    onChange={e => setForm(f => ({ ...f, bid_date: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                                    취소
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
                                    {saving ? '생성 중...' : '생성'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
