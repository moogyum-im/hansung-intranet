'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle
} from 'lucide-react';

// --- 현장 관리 스타일의 '내 결재 현황' 리스트 컴포넌트 ---
function MyApprovalsWidget({ toReview, submitted, completed, referred }) {
    const [activeTab, setActiveTab] = useState('toReview');
    
    const getStatusChip = (status) => {
        const statusMap = { 
            'pending': { text: '진행중', style: 'bg-amber-50 text-amber-600 border-amber-100' }, 
            '진행중': { text: '진행중', style: 'bg-amber-50 text-amber-600 border-amber-100' }, 
            '승인': { text: '완료', style: 'bg-blue-50 text-blue-600 border-blue-100' }, 
            '반려': { text: '반려', style: 'bg-red-50 text-red-600 border-red-100' },
            '완료': { text: '완료', style: 'bg-blue-50 text-blue-600 border-blue-100' },
            '대기': { text: '내차례', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
        };
        const currentStatus = statusMap[status] || { text: status, style: 'bg-slate-50 text-slate-600 border-slate-100' };
        return <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${currentStatus.style}`}>{currentStatus.text}</span>;
    };

    const renderList = (list) => {
        if (!list || list.length === 0) return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <FileText size={40} strokeWidth={1.2} />
                <p className="text-[13px] font-medium mt-3 text-slate-400 font-bold">해당하는 결재 문서가 없습니다.</p>
            </div>
        );
        return ( 
            <div className="divide-y divide-slate-100">
                {list.map(doc => (
                    <Link key={doc.id} href={`/approvals/${doc.id}`} className="group flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 mb-1.5 font-bold">
                                <p className="font-black text-[14px] text-slate-700 truncate group-hover:text-blue-600 transition-colors">{doc.title}</p>
                                {getStatusChip(doc.status)}
                            </div>
                            <div className="flex items-center text-[12px] text-slate-400 gap-3 font-bold">
                                <span className="text-slate-500 underline underline-offset-2 font-black">{doc.creator_name || '정보 없음'}</span>
                                <span className="text-slate-200">|</span>
                                <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                                    <Clock size={12} />
                                    {doc.created_at && new Date(doc.created_at).toLocaleString('ko-KR', {
                                        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                ))}
            </div> 
        );
    };

    const tabs = [
        { key: 'toReview', label: '받은 결재', count: toReview.length },
        { key: 'submitted', label: '상신한 결재', count: submitted.length },
        { key: 'completed', label: '완료된 결재', count: completed.length },
        { key: 'referred', label: '참조할 결재', count: referred.length },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-bold">
            <div className="bg-slate-50/50 border-b border-slate-200 px-2">
                <nav className="flex space-x-1" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button 
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)} 
                            className={`whitespace-nowrap py-4 px-5 font-black text-[13px] border-b-2 transition-all ${
                                activeTab === tab.key 
                                ? 'border-blue-600 text-blue-600 bg-white' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                            }`}
                        >
                            {tab.label}
                            <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full font-black ${
                                activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                {renderList(
                    activeTab === 'toReview' ? toReview : 
                    activeTab === 'submitted' ? submitted : 
                    activeTab === 'completed' ? completed : referred
                )}
            </div>
        </div>
    );
}

export default function ApprovalsPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const [approvalsData, setApprovalsData] = useState({ toReview: [], submitted: [], completed: [], referred: [] });
    const [loadingApprovals, setLoadingApprovals] = useState(true);
    const [hasDraft, setHasDraft] = useState(false); // [디버깅] 임시저장 데이터 존재 여부

    // [핵심] 페이지 진입 시 작성 중이던 기안서(임시저장)가 있는지 체크
    useEffect(() => {
        const draft = localStorage.getItem('HANSUNG_DRAFT_V4');
        if (draft) {
            console.log("💾 [시스템] 작성 중인 임시 저장 문서를 발견했습니다.");
            setHasDraft(true);
        }
    }, []);

    const fetchApprovalsData = useCallback(async (currentEmployee) => {
        if (!currentEmployee) { setLoadingApprovals(false); return; }
        setLoadingApprovals(true);
        try {
            const { data, error } = await supabase.rpc('get_my_approvals', { p_user_id: currentEmployee.id });
            if (error) {
                console.error("결재 데이터 로드 실패:", error);
                setApprovalsData({ toReview: [], submitted: [], completed: [], referred: [] });
                return;
            }
            setApprovalsData({
                toReview: data.filter(doc => doc.category === 'to_review'),
                submitted: data.filter(doc => doc.category === 'submitted'),
                completed: data.filter(doc => doc.category === 'completed'),
                referred: data.filter(doc => doc.category === 'referred'),
            });
        } catch (error) {
            console.error("ApprovalsPage error:", error);
        } finally {
            setLoadingApprovals(false);
        }
    }, []);

    useEffect(() => {
        if (employee) fetchApprovalsData(employee);
    }, [employee, fetchApprovalsData]);

    const approvalForms = [
        { title: '휴가 신청서', description: '연차, 반차 등 휴가 사용을 위한 기안서입니다.', href: '/approvals/leave', icon: '🗓️' },
        { title: '출장 신청서', description: '업무 관련 외부 출장 승인을 요청하는 서류입니다.', href: '/approvals/business-trip', icon: '✈️' },
        { title: '출장 여비 정산서', description: '출장 후 발생한 여비 및 지출 비용을 정산합니다.', href: '/approvals/expense-settlement', icon: '💰' },
        { title: '지출 결의서', description: '영업비 및 제반 비용 지출 결재를 요청합니다.', href: '/approvals/expense', icon: '💳' },
        { title: '내부 결재서', description: '사내 공문 및 중요 의사결정을 위한 기안서입니다.', href: '/approvals/internal', icon: '📑' },
        { title: '업무 보고서', description: '일간/주간/월간 주요 업무 현황을 보고합니다.', href: '/approvals/work-report', icon: '📈' },
        { title: '시말서', description: '사고 경위 및 재발 방지 대책을 상신합니다.', href: '/approvals/apology', icon: '⚠️' },
        
    ];

    if (employeeLoading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 font-bold">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-sm font-black uppercase">Electronic System Loading...</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 sm:p-10 bg-[#f8fafc] min-h-screen font-bold">
            <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-black text-[11px] tracking-widest uppercase mb-2">
                        <FileCheck size={14} /> Electronic Approval System
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">전자 결재</h1>
                    <p className="text-slate-500 text-[14px] mt-2 font-bold">한성 종합조경의 효율적인 의사결정을 위한 통합 결재 플랫폼입니다.</p>
                </div>

                {/* [디버깅 알림창] 작성 중인 문서가 있을 때 표시 */}
                {hasDraft && (
                    <div className="bg-amber-50 border-2 border-amber-200 p-3 rounded-xl flex items-center gap-3 animate-bounce shadow-sm">
                        <AlertCircle className="text-amber-500" size={18} />
                        <span className="text-xs text-amber-700 font-black">작성 중인 임시 저장 문서가 있습니다!</span>
                    </div>
                )}
                
                <div className="flex items-center gap-3 font-bold">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="결재 문서 제목 검색..." 
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all w-64 shadow-sm font-bold"
                        />
                    </div>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto space-y-14 font-bold">
                {/* [상단 섹션] 내 결재 현황 */}
                <section>
                    <div className="flex items-center justify-between mb-5 px-1 font-bold">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
                                <ClipboardCheck size={18} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800">내 결재 관리</h2>
                        </div>
                    </div>
                    
                    {loadingApprovals ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-32 text-center animate-pulse shadow-sm font-bold">
                            <p className="text-slate-400 text-sm font-black">결재 데이터를 동기화하고 있습니다...</p>
                        </div>
                    ) : (
                        <MyApprovalsWidget 
                            toReview={approvalsData.toReview} 
                            submitted={approvalsData.submitted}
                            completed={approvalsData.completed}
                            referred={approvalsData.referred}
                        />
                    )}
                </section>

                {/* [하단 섹션] 결재 양식 선택 */}
                <section>
                    <div className="flex items-center gap-2.5 mb-5 px-1 font-bold">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white shadow-md shadow-slate-200">
                            <PlusCircle size={18} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800">신규 결재 기안</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-bold">
                        {approvalForms.map((form) => (
                            <Link 
                                href={form.href} 
                                key={form.title} 
                                className="group bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col relative overflow-hidden font-bold"
                            >
                                <div className="absolute -right-2 -top-2 text-slate-50 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                    <FileText size={120} />
                                </div>

                                <div className="flex items-center justify-between mb-6 font-bold">
                                    <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all">{form.icon}</span>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all font-bold">
                                        <ArrowRight size={20} />
                                    </div>
                                </div>
                                
                                <h3 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors mb-2">{form.title}</h3>
                                <p className="text-slate-500 text-[13px] leading-relaxed font-bold mb-6 italic-none">
                                    {form.description}
                                </p>
                                
                                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center text-[12px] font-black text-blue-600 uppercase tracking-wider">
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