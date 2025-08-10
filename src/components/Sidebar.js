// 파일 경로: src/components/Sidebar.js
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import Image from 'next/image';

const HomeIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> );
const DocumentTextIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> );
const UsersIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-v1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.978 5.978 0 0112 13a5.979 5.979 0 013-1.197m-3 6.393A3.426 3.426 0 0012 17.647a3.426 3.426 0 00-3-1.454m-3 0a3.426 3.426 0 01-3-1.454" /></svg> );
const CalendarIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> );
const CurrencyWonIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 4h4m5 4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2z" /></svg> );
const ClipboardListIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> );
const ChatIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> );
const UserCircleIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const ChevronDownIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg> );
const BriefcaseIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.25L13 21h-2L3 13.25V9h18v4.25zM12 21v-8h-1l-7-8h16l-7 8h-1zm-9 0h18" /></svg> );

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const router = useRouter();
    const { employee, loading } = useEmployee();
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const [isWorkMenuOpen, setIsWorkMenuOpen] = useState(false);
    const [departments, setDepartments] = useState([]);

    useEffect(() => { setIsWorkMenuOpen(pathname.startsWith('/work')); }, [pathname]);

    useEffect(() => {
        const fetchDepartments = async () => {
            const { data, error } = await supabase.rpc('get_distinct_departments');
            if (error) console.error("부서 목록을 불러오는데 실패했습니다:", error);
            else setDepartments(data || []);
        };
        fetchDepartments();
    }, []);

    const menuItems = [
      { name: '대시보드', href: '/dashboard', icon: HomeIcon },
      { name: '공지사항', href: '/notices', icon: DocumentTextIcon },
      { name: '조직도', href: '/organization', icon: UsersIcon },
      { name: '현장 관리', href: '/sites', icon: CalendarIcon },
      // ★★★ 결재 메뉴를 '전자 결재'로 변경 및 증명서 메뉴 통합 ★★★
      { name: '전자 결재', href: '/approvals', icon: CurrencyWonIcon },
      { name: '업무', href: '/work', icon: ClipboardListIcon, isDropdown: true },
      { name: '채팅', href: '/chatrooms', icon: ChatIcon, count: totalUnreadCount },
      { name: '마이페이지', href: '/mypage', icon: UserCircleIcon },
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

    return (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={onClose}></div>
            <aside className={`fixed top-0 left-0 w-64 h-full bg-gray-800 text-white flex flex-col z-30 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
                <div className="h-16 flex items-center justify-center p-4 border-b border-gray-700"><Link href="/dashboard" className="flex items-center"><img src="/hansung_logo.png" alt="한성 로고" className="h-8 w-auto" /></Link></div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {menuItems.map((item) => (
                        item.isDropdown ? (
                            <div key={item.name}>
                                <button onClick={() => setIsWorkMenuOpen(!isWorkMenuOpen)} className={`flex items-center justify-between w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${pathname.startsWith(item.href) ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                                    <div className="flex items-center"><item.icon className="h-5 w-5 mr-3" /><span>{item.name}</span></div>
                                    <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 ${isWorkMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isWorkMenuOpen && ( <ul className="pt-2 pl-6 space-y-1">{departments.map((dept, index) => ( <li key={index}><Link href={`/work/${encodeURIComponent(dept.department)}/calendar`} className={`block px-3 py-2 text-sm rounded-md ${pathname.includes(encodeURIComponent(dept.department)) ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>{dept.department}</Link></li> ))}</ul> )}
                            </div>
                        ) : (
                            <Link key={item.name} href={item.href} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${pathname.startsWith(item.href) ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                                <item.icon className="h-5 w-5 mr-3" /><span>{item.name}</span>
                                {item.count > 0 && ( <span className="ml-auto bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5">{item.count}</span> )}
                            </Link>
                        )
                    ))}
                </nav>
                <div className="px-4 py-4 border-t border-gray-700">
                    {loading ? ( <div className="text-center text-sm">로딩 중...</div> ) : employee ? (
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-500 flex-shrink-0">{employee.avatar_url && <Image src={employee.avatar_url} alt="프로필" width={40} height={40} className="rounded-full" />}</div>
                            <div className="ml-3"><p className="text-sm font-medium">{employee.full_name}</p><p className="text-xs text-gray-400">{employee.position}</p></div>
                            <button onClick={handleLogout} className="ml-auto p-2 text-gray-400 hover:text-white"><LogoutIcon /></button>
                        </div>
                    ) : ( <Link href="/login" className="block text-center text-sm font-medium text-gray-300 hover:text-white">로그인</Link> )}
                </div>
            </aside>
        </>
    );
}