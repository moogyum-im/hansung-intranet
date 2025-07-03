// 파일 경로: src/contexts/NotificationContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useEmployee } from './EmployeeContext';
import { supabase } from '../../lib/supabase/client';
import ToastNotification from '@/components/ToastNotification'; // 잠시 후 만들 알림 UI 컴포넌트

const NotificationContext = createContext();

export function useNotification() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const { employee } = useEmployee();
    const [notification, setNotification] = useState(null);
    const supabase = createClient();

    useEffect(() => {
        // 로그인한 사용자가 없으면 아무것도 하지 않음
        if (!employee) return;

        // 내가 참여한 모든 채팅방의 새 메시지를 감지하는 리스너
        const handleNewMessage = (payload) => {
            // 내가 보낸 메시지는 알림을 띄우지 않음
            if (payload.new.sender_id === employee.id) return;
            
            // 새 알림 설정 (ToastNotification 컴포넌트에 전달될 데이터)
            setNotification({
                roomId: payload.new.room_id,
                message: payload.new.content,
                sender: payload.new.sender_id // 임시로 ID만 저장, 실제 이름은 Toast에서 조회
            });
        };
        
        const messageChannel = supabase.channel(`public:chat_messages:user=${employee.id}`)
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages',
                    // 내가 참여한 방(room_id)에서 발생한 이벤트만 듣도록 필터링
                    filter: `room_id=in.(select room_id from chat_room_participants where user_id = '${employee.id}')`
                },
                handleNewMessage
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
        };
    }, [employee, supabase]);

    return (
        <NotificationContext.Provider value={{}}>
            {children}
            {/* 알림이 발생하면 ToastNotification 컴포넌트를 렌더링 */}
            {notification && (
                <ToastNotification 
                    notification={notification} 
                    onClose={() => setNotification(null)} 
                />
            )}
        </NotificationContext.Provider>
    );
}