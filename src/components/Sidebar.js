// src/components/Sidebar.jsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import Image from 'next/image';

// ★★★ 아이콘 컴포넌트들: 각 카테고리의 의미에 맞게 Heroicons V2 (Outline)로 교체 ★★★

// 1. 대시보드: HomeIcon (집/대시보드)
const HomeIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125a3 3 0 003 3h8.25a3 3 0 003-3V9.75M10.5 21v-6.75a.75.75 0 01.75-.75h2.25a.75.75 0 01.75.75V21" />
    </svg>
);

// 2. 공지사항: MegaphoneIcon (확성기/공지) 또는 DocumentTextIcon (문서)
const AnnouncementIcon = (props) => ( // MegaphoneIcon
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.02v1.272a.75.75 0 01-.75.75h-.75a.75.75 0 01-.75-.75V15.75h-.243c-.26-.144-.453-.29-.636-.436a1.355 1.355 0 01-.1-.087V13.5a.75.75 0 01.75-.75h.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25A1.5 1.5 0 0113.5 3v6a1.5 1.5 0 01-3 0V3A1.5 1.5 0 0112 2.25zM12 13.5a.75.75 0 01.75-.75h.75a.75.75 0 01.75.75V15h.375c.18 0 .355-.02.527-.06A4.5 4.5 0 0019.5 10.5h1.125c.828 0 1.5.672 1.5 1.5v3.75a.75.75 0 01-1.5 0v-2.25h-.375c-.18 0-.355.02-.527.06A4.5 4.5 0 0115 17.25H9.75a4.5 4.5 0 01-4.5-4.5V9.75c0-.414.336-.75.75-.75H8.25V7.5A.75.75 0 019 6.75h1.5A.75.75 0 0111.25 7.5V8.25h.75z" />
    </svg>
);

// 3. 조직도: UserGroupIcon (사용자 그룹)
const OrganizationIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.75a3 3 0 003-3v-5.25s-.984-.429-1.25-1.125A4.043 4.043 0 0018 7.5c0-1.872-1.24-3.472-2.928-4.027c-.75-.24-1.488-.373-2.28-.415m.004 5.922h.007a.75.75 0 11-.007-.007H12a.75.75 0 01-.75-.75V7.5a.75.75 0 01-.75-.75h-2.25A.75.75 0 017.5 6V4.5a.75.75 0 011.5 0v1.5a.75.75 0 001.5 0V3.75a.75.75 0 01.75-.75h2.25a.75.75 0 01.75.75v1.5a.75.75 0 001.5 0V4.5a.75.75 0 01.75-.75h.75a.75.75 0 01.75.75V6a.75.75 0 00.75.75h2.25a.75.75 0 01.75.75V7.5a.75.75 0 01-.75.75h-2.25a.75.75 0 00-.75.75v1.5a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75V9.75a.75.75 0 00-1.5 0V9.75h-.007zM18 18.75a3 3 0 003-3v-5.25s-.984-.429-1.25-1.125A4.043 4.043 0 0018 7.5c0-1.872-1.24-3.472-2.928-4.027c-.75-.24-1.488-.373-2.28-.415M12 13a7 7 0 100-14 7 7 0 000 14zM12 4a3 3 0 100-6 3 3 0 000 6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 0 0112 0v1zm0 0h6v-1a6 0 00-9-5.197M15 21a6 0 00-9-5.197m0 0A5.978 0 0112 13a5.979 0 013-1.197m-3 6.393A3.426 0 0012 17.647a3.426 0 00-3-1.454m-3 0a3.426 0 01-3-1.454" />
    </svg>
);

// 4. 현장 관리: BuildingOffice2Icon (사무실 건물 - 현장/빌딩)
const SiteManagementIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// 5. 결재: PencilSquareIcon (연필/서명/결재)
const ApprovalIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
);

// 6. 채팅: ChatBubbleLeftRightIcon (양방향 말풍선)
const ChatIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.766v4.734a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25v-4.734M2.25 12.766L12 2.25l9.75 10.516M2.25 12.766l.75 2.25L12 20.25l8.995-5.234.75-2.25M12 2.25v18.75" />
    </svg>
);

// 7. 마이페이지: UserIcon (단일 사용자) 또는 UserCircleIcon (사용자 원형)
const MyPageIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// 8. 로그아웃: ArrowRightOnRectangleIcon (오른쪽 화살표 사각형 - 나가는 문)
const LogoutIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H9" />
    </svg>
);


export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const router = useRouter();
    const { employee, loading } = useEmployee();
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);

    const menuItems = [
        { name: '대시보드', href: '/dashboard', icon: HomeIcon },
        { name: '공지사항', href: '/notices', icon: AnnouncementIcon }, // 변경된 아이콘
        { name: '조직도', href: '/organization', icon: OrganizationIcon }, // 변경된 아이콘
        { name: '현장 관리', href: '/sites', icon: SiteManagementIcon }, // 변경된 아이콘
        { name: '결재', href: '/approvals', icon: ApprovalIcon }, // 변경된 아이콘
        { name: '채팅', href: '/chatrooms', icon: ChatIcon, count: totalUnreadCount },
        { name: '마이페이지', href: '/mypage', icon: MyPageIcon }, // 변경된 아이콘
    ];

    const fetchTotalUnreadCount = useCallback(async () => {
        if (!employee) {
            console.log("Employee not loaded, skipping unread count fetch.");
            return;
        }
        console.log("Fetching total unread count...");
        const { data, error } = await supabase.rpc('get_my_total_unread_count');
        if (error) {
            console.error('Error fetching total unread count:', error);
        } else if (data) {
            const total = data.reduce((acc, item) => acc + item.unread_count, 0);
            console.log("Total unread count fetched:", total);
            setTotalUnreadCount(total);
        }
    }, [employee]);

    useEffect(() => {
        if (employee) {
            fetchTotalUnreadCount();
        }

        const channel = supabase.channel('sidebar-unread-listener')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                },
                (payload) => {
                    console.log('New message inserted in sidebar listener!', payload);
                    if (payload.new && payload.new.recipient_id === employee?.id) {
                        fetchTotalUnreadCount();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'chat_room_participants',
                    filter: `employee_id=eq.${employee?.id}`
                },
                (payload) => {
                    console.log('Chat participant update received in sidebar listener!', payload);
                    fetchTotalUnreadCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            console.log("Sidebar unread listener unsubscribed.");
        };
    }, [employee, fetchTotalUnreadCount]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={onClose}></div>
            <aside className={`fixed top-0 left-0 w-64 h-full bg-gray-800 text-white flex flex-col z-30 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
                <div className="h-16 flex items-center justify-center p-4 border-b border-gray-700">
                    <Link href="/dashboard" className="flex items-center">
                        <img src="/hansung_logo.png" alt="한성 로고" className="h-8 w-auto" />
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {menuItems.map((item) => (
                        <Link key={item.name} href={item.href} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${pathname === item.href ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                            <item.icon className="h-5 w-5 mr-3" /> {/* 아이콘 컴포넌트 사용 */}
                            <span>{item.name}</span>
                            {/* count가 0보다 클 때만 뱃지 표시 */}
                            {item.count > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5">
                                    {item.count}
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>
                <div className="px-4 py-4 border-t border-gray-700">
                    {loading ? (
                        <div className="text-center text-sm">로딩 중...</div>
                    ) : employee ? (
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-500 flex-shrink-0">
                                {/* 아바타 URL이 있다면 Image 컴포넌트 사용, 없으면 기본 배경 */}
                                {employee.avatar_url && <Image src={employee.avatar_url} alt="프로필" width={40} height={40} className="rounded-full" />}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{employee.full_name}</p>
                                <p className="text-xs text-gray-400">{employee.position}</p>
                            </div>
                            <button onClick={handleLogout} className="ml-auto p-2 text-gray-400 hover:text-white">
                                <LogoutIcon />
                            </button>
                        </div>
                    ) : (
                        <Link href="/login" className="block text-center text-sm font-medium text-gray-300 hover:text-white">
                            로그인
                        </Link>
                    )}
                </div>
            </aside>
        </>
    );
}