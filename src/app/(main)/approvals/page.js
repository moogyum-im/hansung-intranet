'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  ArrowRight,
  ClipboardCheck, 
  Search, 
  PlusCircle, 
  ChevronRight, 
  AlertCircle,
  UserPlus,
  UserCheck,
  Share2,
  X,
  Search as SearchIcon,
  Users
} from 'lucide-react';

// --- 문서 공유 모달 컴포넌트 ---
function ShareModal({ isOpen, onClose, doc, currentUser, allEmployees }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [loading, setLoading] = useState(false);

    // 부서 우선순위 설정 (부서 없는 경우 '미지정'을 0순위로 배치)
    const deptPriority = { '미지정': 0, '최고 경영진': 1, '공무부': 2, '관리부': 3, '전략기획부': 4 };

    // 🚀 부서 미지정자 포함, 재직자 필터링 및 그룹화 로직
    const groupedEmployees = useMemo(() => {
        if (!allEmployees) return {};

        // 1. 필터링 (재직자만, 본인 제외, 검색어 적용)
        const filtered = allEmployees.filter(emp => 
            emp.id !== currentUser.id && 
            emp.employment_status === '재직' && 
            (emp.full_name?.includes(searchTerm) || emp.department?.includes(searchTerm))
        );

        // 2. 부서별 그룹화 (부서 없으면 '미지정')
        const groups = filtered.reduce((acc, emp) => {
            const dept = emp.department || '미지정';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(emp);
            return acc;
        }, {});

        // 3. 정렬 (부서 우선순위 적용 후 성함순 정렬)
        const sortedDepts = Object.keys(groups).sort((a, b) => {
            return (deptPriority[a] ?? 99) - (deptPriority[b] ?? 99);
        });

        const result = {};
        sortedDepts.forEach(dept => {
            result[dept] = groups[dept].sort((a, b) => a.full_name.localeCompare(b.full_name));
        });

        return result;
    }, [allEmployees, searchTerm, currentUser.id]);

    const handleShare = async () => {
        if (!selectedEmp) return toast.error("공유할 직원을 선택하세요.");
        setLoading(true);
        try {
            const { error: refError } = await supabase.from('approval_document_referrers').insert({
                document_id: doc.id,
                referrer_id: selectedEmp.id,
                referrer_name: selectedEmp.full_name,
                referrer_position: selectedEmp.position
            });
            if (refError) throw refError;

            await supabase.from('approval_share_logs').insert({
                doc_id: doc.id,
                sender_id: currentUser.id,
                receiver_id: selectedEmp.id,
                reason: '문서 공유 전달'
            });

            await supabase.from('notifications').insert({
                recipient_id: selectedEmp.id,
                type: 'document_shared',
                content: `📢 [문서공유] ${currentUser.full_name}님이 '${doc.title}' 문서를 공유했습니다.`,
                link: `/approvals/${doc.id}`,
                is_read: false
            });

            toast.success(`${selectedEmp.full_name}님에게 공유되었습니다.`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("공유 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-bold">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Share2 size={20} className="text-blue-600"/> 문서 공유하기
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" placeholder="이름 또는 부서 검색" 
                            className="w-full pl-12 pr-4 py-4 bg-slate-100 border-none rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                        {Object.keys(groupedEmployees).length > 0 ? Object.keys(groupedEmployees).map(dept => (
                            <div key={dept} className="mb-6 last:mb-0">
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <Users size={12} className="text-blue-500" />
                                    <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">
                                        {dept === '미지정' ? '부서 미지정 / 관리자' : dept}
                                    </span>
                                    <div className="flex-1 h-px bg-blue-50" />
                                </div>
                                <div className="space-y-1">
                                    {groupedEmployees[dept].map(emp => (
                                        <button 
                                            key={emp.id} 
                                            onClick={() => setSelectedEmp(emp)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${selectedEmp?.id === emp.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-700'}`}
                                        >
                                            <div className="text-left">
                                                <span className="text-[14px] font-black block">{emp.full_name} {emp.position}</span>
                                            </div>
                                            {selectedEmp?.id === emp.id && <CheckCircle2 size={18} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 text-center text-slate-300 font-black">
                                <SearchIcon size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-xs">재직 중인 직원이 없습니다.</p>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleShare} disabled={loading || !selectedEmp}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm hover:bg-black transition-all disabled:opacity-30 shadow-xl active:scale-[0.98]"
                    >
                        {loading ? "전송 중..." : "선택한 직원에게 문서 공유"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- 메인 위젯 컴포넌트 ---
function MyApprovalsWidget({ toReview, submitted, approved, rejected, referred, currentUserId, currentUserFullName, allEmployees }) {
    const [activeTab, setActiveTab] = useState('toReview');
    const [subFilter, setSubFilter] = useState('all');
    const [lastViewed, setLastViewed] = useState({});
    const [shareTarget, setShareTarget] = useState(null);

    useEffect(() => {
        const savedTime = localStorage.getItem('HANSUNG_APPROV_VIEW_V3');
        if (savedTime) setLastViewed(JSON.parse(savedTime));
    }, []);

    const handleMainTabClick = (key) => {
        setActiveTab(key);
        setSubFilter('all'); 
        const updatedTime = { ...lastViewed, [key]: new Date().toISOString() };
        setLastViewed(updatedTime);
        localStorage.setItem('HANSUNG_APPROV_VIEW_V3', JSON.stringify(updatedTime));
    };

    const filteredData = useMemo(() => {
        let currentList = [];
        if (activeTab === 'toReview') currentList = toReview;
        else if (activeTab === 'submitted') currentList = submitted;
        else if (activeTab === 'approved') currentList = approved;
        else if (activeTab === 'rejected') currentList = rejected;
        else currentList = referred;

        if (subFilter === 'sent') return currentList.filter(doc => doc.creator_name === currentUserFullName || doc.category === 'submitted');
        if (subFilter === 'received') return currentList.filter(doc => doc.creator_name !== currentUserFullName && doc.category !== 'submitted');
        return currentList;
    }, [activeTab, subFilter, toReview, submitted, approved, rejected, referred, currentUserFullName]);

    const getStatusChip = (status) => {
        const statusMap = { 
            'pending': { text: '진행중', style: 'bg-amber-50 text-amber-600 border-amber-100' }, 
            '진행중': { text: '진행중', style: 'bg-amber-50 text-amber-600 border-amber-100' }, 
            '승인': { text: '승인완료', style: 'bg-blue-50 text-blue-600 border-blue-100' }, 
            '반려': { text: '반려됨', style: 'bg-red-50 text-red-600 border-red-100' },
            '완료': { text: '승인완료', style: 'bg-blue-50 text-blue-600 border-blue-100' },
            '대기': { text: '내차례', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
        };
        const currentStatus = statusMap[status] || { text: status, style: 'bg-slate-50 text-slate-600 border-slate-100' };
        return <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${currentStatus.style}`}>{currentStatus.text}</span>;
    };

    const hasNewUpdate = (key, list) => {
        if (!list || list.length === 0) return false;
        const lastTime = lastViewed[key];
        if (!lastTime) return true;
        return list.some(doc => new Date(doc.created_at) > new Date(lastTime));
    };

    const tabs = [
        { key: 'toReview', label: '받은 결재', count: toReview.length, data: toReview },
        { key: 'submitted', label: '상신한 결재', count: submitted.length, data: submitted },
        { key: 'approved', label: '승인 결재', count: approved.length, data: approved },
        { key: 'rejected', label: '반려 결재', count: rejected.length, data: rejected },
        { key: 'referred', label: '참조할 결재', count: referred.length, data: referred },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-bold relative">
            <ShareModal 
                isOpen={!!shareTarget} onClose={() => setShareTarget(null)} 
                doc={shareTarget} currentUser={{id: currentUserId, full_name: currentUserFullName}}
                allEmployees={allEmployees}
            />

            <div className="bg-slate-50/50 border-b border-slate-200 px-2">
                <nav className="flex space-x-1">
                    {tabs.map((tab) => (
                        <button 
                            key={tab.key} onClick={() => handleMainTabClick(tab.key)} 
                            className={`relative whitespace-nowrap py-4 px-5 font-black text-[13px] border-b-2 transition-all ${activeTab === tab.key ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                        >
                            {hasNewUpdate(tab.key, tab.data) && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,1)]" />}
                            {tab.label}
                            <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full font-black ${activeTab === tab.key ? (tab.key === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600') : 'bg-slate-200 text-slate-500'}`}>{tab.count}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {(activeTab === 'approved' || activeTab === 'rejected' || activeTab === 'referred') && (
                <div className="flex items-center gap-2 p-3 bg-white border-b border-slate-50 shadow-inner">
                    <button onClick={() => setSubFilter('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${subFilter === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>전체</button>
                    <button onClick={() => setSubFilter('sent')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${subFilter === 'sent' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}><UserPlus size={12}/> 내가 올린 결재</button>
                    <button onClick={() => setSubFilter('received')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${subFilter === 'received' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}><UserCheck size={12}/> 내가 받은 결재</button>
                </div>
            )}

            <div className="max-h-[480px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                    <div className="py-20 text-center text-slate-300 font-bold">문서가 존재하지 않습니다.</div>
                ) : (
                    filteredData.map(doc => (
                        <div key={doc.id} className="group flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors">
                            <Link href={`/approvals/${doc.id}`} className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-1.5 font-bold">
                                    <p className="font-black text-[14px] text-slate-700 truncate group-hover:text-blue-600">{doc.title}</p>
                                    {getStatusChip(doc.status)}
                                </div>
                                <div className="flex items-center text-[12px] text-slate-400 gap-3 font-bold">
                                    <span className="text-slate-500 underline underline-offset-2 font-black">{doc.creator_name === currentUserFullName ? '상신함' : '결재참여'}: {doc.creator_name}</span>
                                    <span className="w-px h-2 bg-slate-200" />
                                    <span className="flex items-center gap-1.5"><Clock size={12} />{new Date(doc.created_at).toLocaleDateString()}</span>
                                </div>
                            </Link>
                            
                            <div className="flex items-center gap-2">
                                {activeTab === 'referred' && (
                                    <button 
                                        onClick={() => setShareTarget(doc)}
                                        className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all border border-slate-100 flex items-center gap-1.5 text-[11px] font-black hover:shadow-md"
                                    >
                                        <Share2 size={14} /> 공유
                                    </button>
                                )}
                                <Link href={`/approvals/${doc.id}`} className="p-2 text-slate-300 group-hover:text-blue-500 transition-all">
                                    <ChevronRight size={18} />
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function ApprovalsPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const [approvalsData, setApprovalsData] = useState({ toReview: [], submitted: [], approved: [], rejected: [], referred: [] });
    const [allEmployees, setAllEmployees] = useState([]);
    const [loadingApprovals, setLoadingApprovals] = useState(true);

    const fetchData = useCallback(async (currentEmployee) => {
        if (!currentEmployee) return;
        setLoadingApprovals(true);
        try {
            const { data: appData } = await supabase.rpc('get_my_approvals', { p_user_id: currentEmployee.id });
            if (appData) {
                setApprovalsData({
                    toReview: appData.filter(doc => doc.category === 'to_review' && doc.status !== '반려'),
                    submitted: appData.filter(doc => doc.category === 'submitted' && doc.status !== '반려' && doc.status !== '승인' && doc.status !== '완료'),
                    approved: appData.filter(doc => (doc.status === '승인' || doc.status === '완료') && doc.status !== '반려'),
                    rejected: appData.filter(doc => doc.status === '반려'),
                    referred: appData.filter(doc => doc.category === 'referred'),
                });
            }

            const { data: empData } = await supabase.from('profiles').select('id, full_name, department, position, role, status, employment_status');
            setAllEmployees(empData || []);

        } catch (error) { console.error(error); } finally { setLoadingApprovals(false); }
    }, []);

    useEffect(() => { if (employee) fetchData(employee); }, [employee, fetchData]);

    if (employeeLoading) return <div className="p-10 text-center font-bold">LOADING...</div>;

    return (
        <div className="p-6 sm:p-10 bg-[#f8fafc] min-h-screen font-bold">
            <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-black text-[11px] tracking-widest uppercase mb-2">
                        <FileCheck size={14} /> Electronic Approval System
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">전자 결재</h1>
                    <p className="text-slate-500 text-[14px] mt-2 font-bold font-bold">한성 종합조경의 효율적인 의사결정을 위한 통합 결재 플랫폼입니다.</p>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto space-y-14 font-bold">
                <section>
                    <div className="flex items-center justify-between mb-5 px-1 font-bold">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
                                <ClipboardCheck size={18} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 font-bold">내 결재 관리</h2>
                        </div>
                    </div>
                    
                    {!loadingApprovals ? (
                        <MyApprovalsWidget 
                            {...approvalsData}
                            currentUserId={employee?.id} 
                            currentUserFullName={employee?.full_name}
                            allEmployees={allEmployees}
                        />
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-xl p-32 text-center animate-pulse font-bold">데이터 동기화 중...</div>
                    )}
                </section>

                <section>
                    <div className="flex items-center gap-2.5 mb-5 px-1 font-bold">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white shadow-md shadow-slate-200">
                            <PlusCircle size={18} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 font-bold">신규 결재 기안</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-bold">
                        {[
                            { title: '휴가 신청서', href: '/approvals/leave', icon: '🗓️' },
                            { title: '출장 신청서', href: '/approvals/business-trip', icon: '✈️' },
                            { title: '출장 여비 정산서', href: '/approvals/expense-settlement', icon: '💰' },
                            { title: '지출 결의서', href: '/approvals/expense', icon: '💳' },
                            { title: '내부 결재서', href: '/approvals/internal', icon: '📑' },
                            { title: '업무 보고서', href: '/approvals/work-report', icon: '📈' },
                            { title: '시말서', href: '/approvals/apology', icon: '⚠️' }
                        ].map((form) => (
                            <Link 
                                href={form.href} key={form.title} 
                                className="group bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-xl transition-all flex flex-col font-bold"
                            >
                                <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all mb-6">{form.icon}</span>
                                <h3 className="font-black text-slate-800 text-lg group-hover:text-blue-600 mb-2 font-bold">{form.title}</h3>
                                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center text-[12px] font-black text-blue-600 uppercase tracking-wider font-bold">
                                    기안하기 <ChevronRight size={14} className="ml-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}