'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import MyAttendanceWidget from '@/components/MyAttendanceWidget';
import LeaveCalendar from './LeaveCalendar.jsx';
import ClientSideOnlyWrapper from '@/components/ClientSideOnlyWrapper';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Calendar, 
  FileText, 
  ChevronRight, 
  Briefcase,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Coffee,
  Lock,
  X,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';

const getGreeting = (name) => {
  return `반갑습니다. 당신의 열정이 회사의 성장을 이끕니다.`;
};

const ApprovalListItem = ({ doc, statusInfo }) => (
    <Link href={`/approvals/${doc.id}`} className="group flex items-center gap-4 p-4 hover:bg-slate-50 transition-all border-b border-slate-100 last:border-none">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${statusInfo.bg}`}>
            {statusInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.border} ${statusInfo.text}`}>
                    {statusInfo.label}
                </span>
                <h4 className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors text-sm">
                    {doc.title}
                </h4>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                <span>상신자: {doc.creator_name}</span>
                <span className="w-px h-2 bg-slate-200" />
                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
        </div>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
    </Link>
);

export default function MyPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const [approvalsData, setApprovalsData] = useState({ toReview: [], submitted: [], completed: [], referred: [] });
    const [activeTab, setActiveTab] = useState('toReview');
    const [loadingSubData, setLoadingSubData] = useState(true);

    // 비밀번호 변경 모달 관련 상태
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [isChanging, setIsChanging] = useState(false);

    const fetchData = useCallback(async (currentEmployee) => {
        if (!currentEmployee) { setLoadingSubData(false); return; }
        setLoadingSubData(true);
        try {
            const { data, error } = await supabase.rpc('get_my_approvals', { p_user_id: currentEmployee.id });
            if (error) throw error;
            setApprovalsData({
                toReview: data.filter(doc => doc.category === 'to_review'),
                submitted: data.filter(doc => doc.category === 'submitted'),
                completed: data.filter(doc => doc.category === 'completed'),
                referred: data.filter(doc => doc.category === 'referred'),
            });
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoadingSubData(false);
        }
    }, []);

    useEffect(() => {
        if (employee) fetchData(employee);
    }, [employee, fetchData]);

    // 🚀 비밀번호 변경 함수
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            return toast.error("새 비밀번호가 일치하지 않습니다.");
        }
        if (passwords.new.length < 6) {
            return toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
        }

        setIsChanging(true);
        try {
            // Supabase Auth 비밀번호 업데이트 (변경 즉시 백업/동기화됨)
            const { error } = await supabase.auth.updateUser({ 
                password: passwords.new 
            });

            if (error) throw error;

            toast.success("비밀번호가 성공적으로 변경되었습니다.");
            setIsPasswordModalOpen(false);
            setPasswords({ new: '', confirm: '' });
        } catch (error) {
            console.error(error);
            toast.error("비밀번호 변경 중 오류가 발생했습니다.");
        } finally {
            setIsChanging(false);
        }
    };

    const getStatusInfo = (status) => {
        const s = status?.toLowerCase();
        if (s === 'pending' || s === '대기' || s === '대기중') 
            return { label: '대기', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: <Clock size={16} className="text-amber-500"/> };
        if (s === '승인' || s === '완료') 
            return { label: '완료', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: <CheckCircle2 size={16} className="text-blue-500"/> };
        return { label: '진행', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', icon: <TrendingUp size={16} className="text-indigo-500"/> };
    };

    if (employeeLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#1e293b]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white font-black tracking-[0.3em] text-xs uppercase animate-pulse">System Synchronizing...</p>
            </div>
        </div>
    );

    const userName = employee?.full_name || employee?.name || '사용자';
    const userPosition = employee?.position || '';

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-12">
            {/* 비밀번호 변경 팝업 (모달) */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isChanging && setIsPasswordModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in duration-200">
                        <div className="p-8 pb-0 flex justify-between items-center">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                <KeyRound size={24} />
                            </div>
                            <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handlePasswordChange} className="p-8 space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">비밀번호 변경</h2>
                                <p className="text-xs text-slate-400 font-medium mt-1">계정 보안을 위해 정기적인 변경을 권장합니다.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">새 비밀번호</label>
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="6자 이상의 비밀번호"
                                        value={passwords.new}
                                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 bottom-4 text-slate-300 hover:text-slate-500"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">비밀번호 확인</label>
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="다시 한번 입력해주세요"
                                        value={passwords.confirm}
                                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isChanging}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isChanging ? "보안 동기화 중..." : "비밀번호 업데이트"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 헤더 섹션 */}
            <header className="relative bg-[#1e293b] pt-12 pb-24 px-6 sm:px-12 overflow-hidden shadow-2xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12 text-white pointer-events-none">
                    <ShieldCheck size={320} />
                </div>
                
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner text-blue-400">
                            <Trophy size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] tracking-widest uppercase mb-1">
                                <ShieldCheck size={12} /> Personal Intelligence Dashboard
                            </div>
                            <h1 className="text-2xl font-black text-white tracking-tight sm:text-4xl">
                                {userName} {userPosition}님, 반갑습니다.
                            </h1>
                            <p className="text-slate-400 font-medium text-sm mt-1">
                                {getGreeting(userName)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-white font-black flex items-center gap-2 text-sm transition-all shadow-xl active:scale-95"
                        >
                            <Lock size={16} className="text-blue-400"/> 보안 설정 변경
                        </button>
                        <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 hidden lg:block shadow-xl">
                            <div className="text-white font-black flex items-center gap-2 text-sm">
                                <Briefcase size={16} className="text-blue-400"/> {employee?.department || '전략기획부'} <span className="text-blue-400 text-[10px] opacity-50 font-medium">|</span> {userPosition || '소속'}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 sm:px-12 -mt-12 relative z-20 space-y-8">
                {/* 기존 위젯들 유지 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col min-h-[340px] overflow-hidden transition-all hover:shadow-2xl hover:shadow-blue-900/5">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={14} className="text-blue-600" /> 실시간 근태 관리
                            </h3>
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        </div>
                        <div className="flex-1 p-2">
                            <MyAttendanceWidget currentUser={employee} />
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col min-h-[340px] justify-between transition-all hover:shadow-2xl hover:shadow-blue-900/5">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Coffee size={14} className="text-blue-600" /> 가용 휴가 자산
                        </h3>
                        <div className="flex-1 flex flex-col justify-center items-center py-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-8xl font-black text-slate-900 tracking-tighter">
                                    {employee?.remaining_leave_days || 0}
                                </span>
                                <span className="text-xl font-black text-blue-600 uppercase tracking-tighter">Days</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-3xl p-5 flex justify-around border border-slate-100">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-tighter">전체 휴가</p>
                                <p className="font-black text-slate-900">{employee?.total_leave_days || 0}일</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200 self-center opacity-50" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-tighter">사용한 휴가</p>
                                <p className="font-black text-blue-600">
                                    {(employee?.total_leave_days || 0) - (employee?.remaining_leave_days || 0)}일
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col min-h-[340px] transition-all hover:shadow-2xl hover:shadow-blue-900/5">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Calendar size={14} className="text-blue-600" /> 협업 캘린더
                        </h3>
                        <div className="flex-1 overflow-hidden">
                            <ClientSideOnlyWrapper>
                                <div className="scale-[0.9] origin-top">
                                    <LeaveCalendar currentUser={employee} />
                                </div>
                            </ClientSideOnlyWrapper>
                        </div>
                    </div>
                </div>

                <section className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                    {/* 결재 섹션 유지 */}
                    <div className="px-10 py-8 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">전자결재 워크플로우</h2>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Approval Management</p>
                            </div>
                        </div>
                        <nav className="flex bg-slate-100/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200/50">
                            {[
                                { id: 'toReview', label: '받은 결재' },
                                { id: 'submitted', label: '상신함' },
                                { id: 'completed', label: '완료됨' }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${
                                        activeTab === tab.id 
                                        ? 'bg-white text-blue-600 shadow-lg shadow-blue-900/5 ring-1 ring-black/5' 
                                        : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`ml-2 text-[10px] py-0.5 px-2 rounded-md ${
                                        activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {approvalsData[tab.id].length}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="min-h-[450px]">
                        {loadingSubData ? (
                            <div className="py-40 flex flex-col items-center justify-center gap-4 text-slate-300">
                                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs font-black uppercase tracking-widest">Data Syncing...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {approvalsData[activeTab].length > 0 ? (
                                    approvalsData[activeTab].map(doc => (
                                        <ApprovalListItem key={doc.id} doc={doc} statusInfo={getStatusInfo(doc.status)} />
                                    ))
                                ) : (
                                    <div className="py-40 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-100">
                                            <ShieldCheck size={40} />
                                        </div>
                                        <p className="text-slate-400 font-black text-sm tracking-tight">처리할 문서가 존재하지 않습니다.</p>
                                        <p className="text-slate-300 text-[11px] mt-1 font-medium">새로운 결재 요청이 오면 이곳에 표시됩니다.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <Link href="/approvals" className="group block py-8 bg-slate-50 hover:bg-blue-50 text-center text-[11px] font-black text-slate-400 hover:text-blue-600 transition-all border-t border-slate-100 tracking-[0.3em] uppercase">
                        전체 결재 문서 시스템 확인하기 <ChevronRight size={14} className="inline ml-1 transition-transform group-hover:translate-x-1" />
                    </Link>
                </section>
            </main>
        </div>
    );
}