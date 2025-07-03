// 파일 경로: src/components/GlobalNotificationManager.jsx (단순화된 버전)
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from 'lib/supabase/client'; // (../ 또는 ../../ 사라짐)
import { useEmployee } from '@/contexts/EmployeeContext';
import Link from 'next/link';

const BellIcon = ({ hasUnread }) => (
    <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {hasUnread && (
            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-green-600" />
        )}
    </div>
);

export default function GlobalNotificationManager() {

    const { employee: currentUser } = useEmployee();
    const [notifications, setNotifications] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        if (!currentUser?.id) return;
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) console.error('알림 조회 실패:', error);
        else setNotifications(data || []);
    }, [currentUser?.id, supabase]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // 결재 등 시스템 알림 구독
    useEffect(() => {
        if (!currentUser?.id) return;

        const channel = supabase.channel(`realtime_notifications:${currentUser.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}`},
              (payload) => {
                setNotifications(prev => [payload.new, ...prev]);
              }
            ).subscribe();
        
        return () => { supabase.removeChannel(channel); };
    }, [currentUser?.id, supabase]);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (notificationId) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    };

    const hasUnread = notifications.some(n => !n.is_read);

    if (!currentUser) return null;

    return (
        <div ref={dropdownRef} className="fixed bottom-6 right-6 z-50">
            {isDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden animate-fade-in-up">
                    <div className="p-3 font-bold border-b">알림</div>
                    <ul className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <li className="p-4 text-center text-sm text-gray-500">새로운 알림이 없습니다.</li>
                        ) : (
                            notifications.map(n => (
                                <li key={n.id} className={`border-b ${!n.is_read ? 'bg-green-50' : ''}`}>
                                    <Link 
                                        href={n.link_url || '#'} 
                                        onClick={() => handleMarkAsRead(n.id)}
                                        className="block p-3 hover:bg-gray-100"
                                    >
                                        <p className="text-sm text-gray-800">{n.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                    </Link>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
            <button 
                onClick={() => setIsDropdownOpen(prev => !prev)} 
                className="p-4 rounded-full bg-green-600 hover:bg-green-700 shadow-lg group transition-transform hover:scale-110"
            >
                <BellIcon hasUnread={hasUnread} />
            </button>
        </div>
    );
}