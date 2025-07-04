// 파일 경로: src/components/Sidebar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

// SVG 아이콘 컴포넌트들 (기존과 동일)
const DashboardIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> );
const NoticeIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.236 9.168-5.518" /></svg> );
const OrgIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> );
const SiteManagementIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 4h1m4-4h1m-1 4h1" /></svg> );
const TaskIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l-4 4-4-4m4 4V3"/></svg> );
const ChatIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> );
const MyPageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const ApprovalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 8l3-3m0 0l-3-3m3 3H9"/></svg>;

const MenuItem = ({ item, isActive }) => (
    <Link href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${ isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' }`}>
        {item.icon}
        <span>{item.label}</span>
    </Link>
);

export default function Sidebar() {
    const pathname = usePathname() || ''; // pathname이 null일 경우를 대비
    const { employee, loading } = useEmployee();
   
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState({});

    useEffect(() => {
        const pathSegments = pathname.split('/').filter(Boolean);
        if (pathSegments.length > 0 && pathSegments[0] === 'work') {
            const newOpenMenus = { work: true };
            if(pathSegments.length > 1) {
                newOpenMenus[pathSegments[1]] = true; // 부서 메뉴 열기
            }
            setOpenMenus(newOpenMenus);
        } else {
             setOpenMenus({}); // 다른 최상위 메뉴로 이동시 업무 메뉴 닫기
        }
    }, [pathname]);

    const toggleMenu = (menuKey) => { setOpenMenus(prev => ({ ...prev, [menuKey]: !prev[menuKey] })); };
    
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const handleStatusChange = async (newStatus) => {
        if (!employee) return;
        const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', employee.id);
        if (error) {
            console.error('상태 변경 실패:', error);
            alert(`상태 변경에 실패했습니다.`);
        } else {
            window.dispatchEvent(new Event('profileUpdated'));
            setIsStatusMenuOpen(false);
        }
    };
    
    const statusOptions = ['업무 중', '회의 중', '외근 중', '식사 중', '자리 비움', '연차 중'];
    const statusColorMap = { '업무 중': 'bg-green-500', '회의 중': 'bg-blue-500', '외근 중': 'bg-yellow-500', '식사 중': 'bg-orange-500', '자리 비움': 'bg-purple-500', '연차 중': 'bg-gray-400' };

    const topMenuItems = [
        { href: '/dashboard', label: '대시보드', icon: <DashboardIcon /> },
        { href: '/notices', label: '공지사항', icon: <NoticeIcon /> },
        { href: '/organization', label: '조직도', icon: <OrgIcon /> },
        { href: '/sites', label: '현장 관리', icon: <SiteManagementIcon /> },
        { href: '/approvals', label: '결재', icon: <ApprovalIcon /> },
    ];
    const bottomMenuItems = [
        { href: '/chatrooms', label: '채팅', icon: <ChatIcon /> },
        { href: '/mypage', label: '마이페이지', icon: <MyPageIcon /> },
    ];
    
    const departments = {
        '전략기획부': 'strategy', 
        '공무부': 'gongmu', 
        '공사부': 'gongsa', 
        '관리부': 'gyeongri', // '관리부'는 보통 '경리' 업무를 포함하므로 'gyeongri'로 사용
        '비서실': 'biseo'
    };

    return (
        <aside className="w-64 bg-white flex flex-col border-r shrink-0 fixed top-0 left-0 h-screen overflow-y-auto z-50">
            <div className="h-20 flex items-center justify-center border-b">
                <Link href="/dashboard" className="font-black text-3xl text-indigo-600">HANSUNG</Link>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1"> 
                {topMenuItems.map(item => <MenuItem key={item.label} item={item} isActive={pathname.startsWith(item.href)} />)}

                <div>
                    <button onClick={() => toggleMenu('work')} className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${pathname.startsWith('/work') ? 'text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                        <div className="flex items-center gap-3"><TaskIcon /><span>업무</span></div>
                        <svg className={`w-4 h-4 transform transition-transform ${openMenus['work'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg> 
                    </button>
                    {openMenus['work'] && ( 
                        <div className="mt-1 pl-4 space-y-1">
                            {Object.entries(departments).map(([deptKor, deptEng]) => (
                                <div key={deptEng}>
                                    <button onClick={() => toggleMenu(deptEng)} className={`w-full text-left flex items-center justify-between py-1.5 px-2 rounded-md text-sm ${pathname.includes(`/${deptEng}/`) ? 'font-semibold text-gray-800' : 'font-medium text-gray-600 hover:text-gray-800'}`}>
                                        {deptKor}
                                        <svg className={`w-3 h-3 text-gray-400 transform transition-transform ${openMenus[deptEng] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg> 
                                    </button>
                                    {openMenus[deptEng] && (
                                        <div className="mt-1 pl-5 space-y-1 border-l-2 border-gray-200 ml-1">
                                            <Link href={`/work/${deptEng}/calendar`} className={`block text-sm py-1 px-2 rounded-md ${pathname === `/work/${deptEng}/calendar` ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-gray-800'}`}>업무 캘린더</Link>
                                            <Link href={`/work/${deptEng}/library`} className={`block text-sm py-1 px-2 rounded-md ${pathname === `/work/${deptEng}/library` ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-gray-800'}`}>자료실</Link>
                                            <Link href={`/work/${deptEng}/logs`} className={`block text-sm py-1 px-2 rounded-md ${pathname === `/work/${deptEng}/logs` ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-gray-800'}`}>업무일지</Link>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {bottomMenuItems.map(item => <MenuItem key={item.label} item={item} isActive={pathname.startsWith(item.href)} />)}
            </nav>
            <div className="px-4 py-4 border-t shrink-0"> 
                {loading ? ( <div className="animate-pulse flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-200"></div><div className="flex-1"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-3 bg-gray-200 rounded w-1/2 mt-1.5"></div></div></div> ) : 
                employee ? (
                    <div className="relative user-status-dropdown"> 
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">{employee.full_name?.charAt(0) || 'U'}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 truncate">{employee.full_name}</p>
                                <button onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)} className="text-xs text-gray-500 flex items-center gap-1.5 hover:text-gray-800 transition-colors">
                                    <span className={`w-2 h-2 rounded-full ${statusColorMap[employee.status] || 'bg-gray-400'}`}></span>
                                    {employee.status || '상태 없음'}
                                    <svg className={`w-3 h-3 text-gray-400 transform transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg> 
                                </button>
                            </div>
                        </div>
                        {isStatusMenuOpen && (
                            <div className="absolute bottom-full left-0 w-full mb-2 bg-white border rounded-lg shadow-lg z-[60] animate-fade-in-up"> 
                                <ul className="p-1">
                                    {statusOptions.map(status => (
                                        <li key={status}><button onClick={() => handleStatusChange(status)} className="w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-gray-100 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${statusColorMap[status]}`}></span>{status}</button></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <button onClick={handleLogout} className="w-full mt-4 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-red-500 rounded-lg transition-colors">로그아웃</button>
                    </div>
                ) : ( <Link href="/login" className="block text-center py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">로그인</Link> )}
            </div>
        </aside>
    );
}