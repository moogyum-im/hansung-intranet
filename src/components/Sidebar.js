"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Megaphone, 
  Users2, 
  Construction, 
  FileCheck, 
  Briefcase, 
  Database, 
  FolderSearch, 
  ShieldCheck, 
  MessagesSquare, 
  UserCircle, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const router = useRouter();
    const { employee, loading } = useEmployee();
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [isWorkMenuOpen, setIsWorkMenuOpen] = useState(false);
    const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [accessibleBoards, setAccessibleBoards] = useState([]);

    useEffect(() => {
        setIsWorkMenuOpen(pathname.startsWith('/work'));
        setIsDbMenuOpen(pathname.startsWith('/database'));
        setIsAdminMenuOpen(pathname.startsWith('/admin'));
    }, [pathname]);

    useEffect(() => {
        const fetchDepartments = async () => {
            const { data, error } = await supabase.rpc('get_distinct_departments');
            if (error) console.error("부서 목록을 불러오는데 실패했습니다:", error);
            else setDepartments(data || []);
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

            if (error) {
                console.error("접근 가능한 게시판 목록 로딩 오류:", error);
            } else {
                const boards = data.map(item => ({
                    name: item.board.name,
                    href: `/database/${item.board.url_slug}`
                }));
                setAccessibleBoards(boards);
            }
        };
        if (!loading) fetchAccessibleBoards();
    }, [employee, loading]);

    const menuItems = [
      { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
      { name: '공지사항', href: '/notices', icon: Megaphone },
      { name: '조직도', href: '/organization', icon: Users2 },
      { name: '현장 관리', href: '/sites', icon: Construction },
      { name: '전자 결재', href: '/approvals', icon: FileCheck },
      { name: '업무 전용', href: '/work', icon: Briefcase, isDropdown: true, menuKey: 'work' },
      { name: '데이터베이스', href: '/database', icon: Database, isDropdown: true, menuKey: 'db', requiresPermission: true },
      { name: '자료실', href: '/resources', icon: FolderSearch },
      ...(employee && employee.role === 'admin' ? [{ 
          name: '시스템 관리', 
          href: '/admin', 
          icon: ShieldCheck, 
          isDropdown: true, 
          menuKey: 'admin' 
      }] : []),
      { name: '사내 채팅', href: '/chatrooms', icon: MessagesSquare, count: totalUnreadCount },
      { name: '내 정보', href: '/mypage', icon: UserCircle },
    ];

    const fetchTotalUnreadCount = useCallback(async () => {
        if (!employee) return;
        const { data, error } = await supabase.rpc('get_my_total_unread_count');
        if (error) { setTotalUnreadCount(0); } 
        else { setTotalUnreadCount(data || 0); }
    }, [employee]);

    useEffect(() => {
        if (employee) {
            fetchTotalUnreadCount();
            const channel = supabase.channel(`sidebar-listener-${employee.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => fetchTotalUnreadCount())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_participants' }, () => fetchTotalUnreadCount())
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [employee, fetchTotalUnreadCount]);

    const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };
    
    const toggleDropdown = (menuKey) => {
        if (menuKey === 'work') setIsWorkMenuOpen(!isWorkMenuOpen);
        if (menuKey === 'db') setIsDbMenuOpen(!isDbMenuOpen);
        if (menuKey === 'admin') setIsAdminMenuOpen(!isAdminMenuOpen);
    };

    return (
        <>
            {/* 모바일 배경 흐림 처리 */}
            <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={onClose}></div>
            
            <aside className={`fixed top-0 left-0 w-64 h-full bg-[#1e293b] text-slate-300 flex flex-col z-50 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out border-r border-slate-700/50 shadow-xl`}>
                
                {/* 로고 영역: 한성 로고 원복 */}
                <div className="h-16 flex items-center justify-center p-4 border-b border-slate-700/50 bg-[#1e293b]">
                    <Link href="/dashboard" className="flex items-center">
                        <img src="/hansung_logo.png" alt="한성 로고" className="h-7 w-auto" />
                    </Link>
                </div>

                {/* 네비게이션 리스트 */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
                    {menuItems.map((item) => {
                        if (item.requiresPermission && accessibleBoards.length === 0) return null;
                        
                        const isActive = pathname.startsWith(item.href);
                        
                        return item.isDropdown ? (
                            <div key={item.name} className="mb-1">
                                <button onClick={() => toggleDropdown(item.menuKey)} 
                                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
                                    ${isActive ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}>
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} className={isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'} />
                                        <span>{item.name}</span>
                                    </div>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${
                                        (item.menuKey === 'work' && isWorkMenuOpen) || (item.menuKey === 'db' && isDbMenuOpen) || (item.menuKey === 'admin' && isAdminMenuOpen) ? 'rotate-180' : ''
                                    }`} />
                                </button>
                                
                                <div className={`overflow-hidden transition-all duration-200 ${
                                    (item.menuKey === 'work' && isWorkMenuOpen) || (item.menuKey === 'db' && isDbMenuOpen) || (item.menuKey === 'admin' && isAdminMenuOpen)
                                    ? 'max-h-96 mt-1' : 'max-h-0'
                                }`}>
                                    <ul className="pl-10 pr-2 space-y-1">
                                        {item.menuKey === 'work' && departments.map((dept, index) => (
                                            <li key={index}>
                                                <Link href={`/work/${encodeURIComponent(dept.department)}/calendar`} 
                                                    className={`block px-3 py-2 text-xs font-medium rounded-md transition-all ${pathname.includes(encodeURIComponent(dept.department)) ? 'text-blue-400 bg-blue-400/5' : 'text-slate-500 hover:text-slate-300'}`}>
                                                    {dept.department}
                                                </Link>
                                            </li>
                                        ))}
                                        {item.menuKey === 'db' && accessibleBoards.map(board => (
                                            <li key={board.name}>
                                                <Link href={board.href} 
                                                    className={`block px-3 py-2 text-xs font-medium rounded-md transition-all ${pathname === board.href ? 'text-blue-400 bg-blue-400/5' : 'text-slate-500 hover:text-slate-300'}`}>
                                                    {board.name}
                                                </Link>
                                            </li>
                                        ))}
                                        {item.menuKey === 'admin' && (
                                            <>
                                                <li><Link href="/admin/permissions" className={`block px-3 py-2 text-xs font-medium rounded-md transition-all ${pathname === '/admin/permissions' ? 'text-blue-400 bg-blue-400/5' : 'text-slate-500 hover:text-slate-300'}`}>DB 권한 관리</Link></li>
                                                <li><Link href="/admin/resources" className={`block px-3 py-2 text-xs font-medium rounded-md transition-all ${pathname.startsWith('/admin/resources') ? 'text-blue-400 bg-blue-400/5' : 'text-slate-500 hover:text-slate-300'}`}>자료실 관리</Link></li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <Link key={item.name} href={item.href} 
                                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group
                                ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                <item.icon size={18} className={`mr-3 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                                <span className="flex-1">{item.name}</span>
                                {item.count > 0 && ( 
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {item.count}
                                    </span> 
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* 하단 사용자 프로필 섹션 */}
                <div className="p-4 border-t border-slate-700/50 bg-[#1e293b]">
                    {loading ? (
                        <div className="text-center text-xs text-slate-500 py-2">Loading...</div>
                    ) : employee ? (
                        <div className="flex items-center gap-3 px-1">
                            <div className="w-9 h-9 rounded-lg bg-slate-700 overflow-hidden border border-slate-600 shrink-0">
                                {employee.avatar_url ? (
                                    <Image src={employee.avatar_url} alt="User" width={36} height={36} className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                        {employee.full_name?.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{employee.full_name} {employee.position}</p>
                                <button onClick={handleLogout} className="text-[10px] font-medium text-slate-500 hover:text-red-400 flex items-center gap-1 mt-0.5 transition-colors">
                                    <LogOut size={10} /> 로그아웃
                                </button>
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