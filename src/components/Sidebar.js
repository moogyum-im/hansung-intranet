// src/components/Sidebar.js
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import { openMainChatPopup } from '@/lib/chatPopup'; // ✅ 추가
import {
  LayoutDashboard,
  Megaphone,
  Users2,
  Construction,
  FileCheck,
  MessagesSquare,
  UserCircle,
  LogOut,
  Building2,
  ChevronUp,
  ChevronDown,
  Database,
  ExternalLink,
  TreePine,
  TrendingUp,
  ClipboardList,
  FileSpreadsheet,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const router = useRouter();
    
    const { employee, loading, setEmployee, fetchEmployee } = useEmployee();
    
    const [isWorkMenuOpen, setIsWorkMenuOpen] = useState(false);
    const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [accessibleBoards, setAccessibleBoards] = useState([]);

    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [pendingApprovals, setPendingApprovals] = useState(0);
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);
    const [currentStatus, setCurrentStatus] = useState('근무 중');

    useEffect(() => {
        setIsWorkMenuOpen(pathname.startsWith('/work'));
        setIsDbMenuOpen(pathname.startsWith('/database'));
        setIsAdminMenuOpen(pathname.startsWith('/admin'));
    }, [pathname]);

    useEffect(() => {
        const fetchDepartments = async () => {
            const { data, error } = await supabase.rpc('get_distinct_departments');
            if (!error) setDepartments(data || []);
        };
        fetchDepartments();
    }, []);

    useEffect(() => {
        const fetchAccessibleBoards = async () => {
            if (!employee) return;
            const { data, error } = await supabase
                .from('board_permissions')
                .select(`board:resource_boards!inner(name, url_slug)`)
                .eq('user_id', employee.id);
            if (!error) {
                setAccessibleBoards(data.map(item => ({
                    name: item.board.name,
                    href: `/database/${item.board.url_slug}`
                })));
            }
        };
        if (!loading) fetchAccessibleBoards();
    }, [employee, loading]);

    useEffect(() => {
        if (employee?.status) setCurrentStatus(employee.status);
    }, [employee]);

    const fetchTotalUnreadCount = useCallback(async () => {
        if (!employee) return;
        const { data, error } = await supabase.rpc('get_my_total_unread_count');
        setTotalUnreadCount(error ? 0 : (data || 0));
    }, [employee]);

    const fetchPendingApprovals = useCallback(async () => {
        if (!employee) return;
        const { count, error } = await supabase
            .from('approval_documents')
            .select('*', { count: 'exact', head: true })
            .eq('status', '대기')
            .contains('current_approver_id', [employee.id]);
        setPendingApprovals(error ? 0 : (count || 0));
    }, [employee]);

    useEffect(() => {
        if (employee) {
            fetchTotalUnreadCount();
            fetchPendingApprovals();
            const channel = supabase.channel(`sidebar-listener-${employee.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, fetchTotalUnreadCount)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants' }, fetchTotalUnreadCount)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_documents' }, fetchPendingApprovals)
                .subscribe();
            return () => supabase.removeChannel(channel);
        }
    }, [employee, fetchTotalUnreadCount, fetchPendingApprovals]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const updateStatus = async (newStatus) => {
        if (!employee) return;
        try {
            setCurrentStatus(newStatus);
            setStatusMenuOpen(false);
            const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', employee.id);
            if (error) throw error;
            if (typeof setEmployee === 'function') setEmployee({ ...employee, status: newStatus });
            toast.success(`상태가 '${newStatus}'(으)로 변경되었습니다.`, { position: 'bottom-left' });
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error(error);
            toast.error('상태 변경에 실패했습니다.');
            if (employee?.status) setCurrentStatus(employee.status);
        }
    };

    const statusOptions = [
        { label: '근무 중',  color: 'text-emerald-500', bg: 'bg-emerald-500' },
        { label: '자리 비움', color: 'text-amber-500',   bg: 'bg-amber-500'   },
        { label: '회의 중',  color: 'text-rose-500',    bg: 'bg-rose-500'    },
        { label: '외근/출장', color: 'text-blue-500',    bg: 'bg-blue-500'    },
        { label: '퇴근',     color: 'text-slate-500',   bg: 'bg-slate-500'   },
    ];

    const currentStatusConfig = statusOptions.find(s => s.label === currentStatus) || statusOptions[0];

    // ── 메뉴 구성 ──
    const menuItems = [
        { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
        { name: '공지사항', href: '/notices',   icon: Megaphone },
        { name: '조직도',   href: '/organization', icon: Users2 },
    ];

    const allowedSiteDepts = ['공무부', '최고 경영진', '최고경영진', '공사부', '시스템관리부', '전략기획부'];
    if (employee && allowedSiteDepts.includes(employee.department)) {
        menuItems.push({ name: '현장 관리', href: '/sites', icon: Construction });
    }

    menuItems.push({ name: '전자 결재', href: '/approvals', icon: FileCheck, hasAlert: pendingApprovals > 0 });

    if (employee && (employee.department === '관리부' || employee.role === 'admin')) {
        menuItems.push({ name: '경영 지원', href: '/admin-portal', icon: Building2 });
    }

    menuItems.push(
        // ✅ isPopup: true 추가 — Link 대신 팝업 버튼으로 렌더링
        { name: '사내 채팅', icon: MessagesSquare, hasAlert: totalUnreadCount > 0, isPopup: true },
        { name: '내 정보',   href: '/mypage', icon: UserCircle }
    );

    if (employee && employee.position === '회장') {
        menuItems.push({ name: '카이 발전량 데이터', href: 'https://kaienergy-intranet-31fc.vercel.app/database/generation', icon: Database, isExternal: true });
    }

    const canAccessDb = employee && employee.department === '전략기획부' && employee.full_name === '임아름';

    return (
        <>
            <Toaster />
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden ${isOpen ? 'block' : 'hidden'}`}
                onClick={onClose}
            />

            <aside className={`fixed top-0 left-0 w-64 h-full bg-[#1e293b] text-slate-300 flex flex-col z-50 transform
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out
                border-r border-slate-700/50 shadow-xl`}>

                {/* 로고 */}
                <div className="h-16 flex items-center justify-center p-4 border-b border-slate-700/50 bg-[#1e293b]">
                    <Link href="/dashboard" className="flex items-center">
                        <img src="/hansung_logo.png" alt="한성 로고" className="h-7 w-auto" />
                    </Link>
                </div>

                {/* 내비게이션 */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
                    {menuItems.map((item) => {
                        // ✅ 팝업 항목: button으로 렌더링
                        if (item.isPopup) {
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => { openMainChatPopup(); onClose(); }}
                                    className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group relative hover:bg-slate-800 hover:text-white"
                                >
                                    <div className="relative mr-3">
                                        <item.icon size={18} className="text-slate-400 group-hover:text-white" />
                                        {item.hasAlert && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-[#1e293b] rounded-full animate-pulse" />
                                        )}
                                    </div>
                                    <span className="flex-1 text-left">{item.name}</span>
                                    {/* ✅ 미확인 메시지 수 뱃지 */}
                                    {totalUnreadCount > 0 && (
                                        <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                        </span>
                                    )}
                                </button>
                            );
                        }

                        // 외부 링크 항목
                        if (item.isExternal) {
                            return (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={onClose}
                                    className="flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group relative hover:bg-slate-800 hover:text-white"
                                >
                                    <div className="relative mr-3">
                                        <item.icon size={18} className="text-slate-400 group-hover:text-white" />
                                    </div>
                                    <span className="flex-1">{item.name}</span>
                                    <ExternalLink size={12} className="text-slate-500 group-hover:text-slate-300" />
                                </a>
                            );
                        }

                        // 일반 항목: Link 유지
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group relative
                                    ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                            >
                                <div className="relative mr-3">
                                    <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                                    {item.hasAlert && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-[#1e293b] rounded-full animate-pulse" />
                                    )}
                                </div>
                                <span className="flex-1">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* 데이터베이스 섹션 — 최고 경영진 / 전략기획부 / 공무부만 노출 */}
                {canAccessDb && (
                    <div className="mt-2">
                        <button
                            onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
                            className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group hover:bg-slate-800 hover:text-white"
                        >
                            <Database size={18} className="text-slate-400 group-hover:text-white mr-3" />
                            <span className="flex-1 text-left">데이터베이스</span>
                            <ChevronDown size={14} className={`text-slate-500 transition-transform ${isDbMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDbMenuOpen && (
                            <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
                                {[
                                    { name: '전국 조경수 DB', href: '/database/tree-sales', icon: TreePine },
                                    { name: '공사 예정 공정표', href: '/database/execution-plans', icon: ClipboardList },
                                    { name: '계약 내역 관리', href: '/database/contract-estimates', icon: FileSpreadsheet },
                                    { name: '수익 실행 관리', href: '/database/profit-management', icon: TrendingUp },
                                ].map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={onClose}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all
                                                ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                        >
                                            <item.icon size={14} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 하단 프로필 */}
                <div className="p-4 border-t border-slate-700/50 bg-[#1e293b] relative">
                    {statusMenuOpen && (
                        <div className="absolute bottom-[80px] left-4 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                            {statusOptions.map((status) => (
                                <button
                                    key={status.label}
                                    onClick={() => updateStatus(status.label)}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors
                                        ${currentStatus === status.label ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${status.bg}`} />
                                    {status.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center text-xs text-slate-500 py-2">Loading...</div>
                    ) : employee ? (
                        <div className="flex items-center gap-3 px-1">
                            <div className="w-9 h-9 rounded-lg bg-slate-700 overflow-hidden border border-slate-600 shrink-0 relative">
                                {employee.avatar_url ? (
                                    <Image src={employee.avatar_url} alt="User" width={36} height={36} className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                        {employee.full_name?.charAt(0)}
                                    </div>
                                )}
                                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-[#1e293b] rounded-full ${currentStatusConfig.bg}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div
                                    className="flex items-center gap-1 cursor-pointer group"
                                    onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                                >
                                    <p className="text-xs font-bold text-white truncate">{employee.full_name} {employee.position}</p>
                                    <ChevronUp size={12} className={`text-slate-500 group-hover:text-slate-300 transition-transform ${statusMenuOpen ? 'rotate-180' : ''}`} />
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                    <span className={`text-[10px] font-black ${currentStatusConfig.color}`}>
                                        {currentStatus}
                                    </span>
                                    <button onClick={handleLogout} className="text-[10px] font-medium text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors">
                                        <LogOut size={10} /> 로그아웃
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Link href="/login" className="block text-center py-2 text-xs font-bold text-blue-400 hover:text-blue-300">로그인</Link>
                    )}
                </div>
            </aside>
        </>
    );
}