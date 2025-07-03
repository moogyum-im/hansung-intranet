// 파일 경로: src/app/(main)/layout.js
'use client';



import { useEffect } from 'react';


import { supabase } from 'lib/supabase/client'; // (../../ 사라짐)
import Sidebar from 'components/Sidebar'; // (혹시 Sidebar import도 있다면 수정)
// [수정!] ../../contexts/EmployeeContext
import { EmployeeProvider, useEmployee } from 'contexts/EmployeeContext'; // (../../ 사라짐)

import { usePathname } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import ClientSideOnlyWrapper from 'components/ClientSideOnlyWrapper'; // <--- 이 줄을 추가!
import GlobalNotificationManager from 'components/GlobalNotificationManager'; // <--- 이 줄도 추가! (아마 이것도 빠져있을 가능성 높음)

// ... (rest of the code)

// ... (이하 나머지 코드는 그대로)
// 레이아웃의 실제 콘텐츠와 로직을 담당하는 내부 컴포넌트
function LayoutContent({ children }) {

    const { employee: currentUser } = useEmployee();
    const pathname = usePathname();

    // 실시간 채팅 메시지 구독 (가장 단순하고 확실한 버전)
    useEffect(() => {
        if (!currentUser?.id) return;

        const channel = supabase.channel('realtime_chat_all_messages')
            .on(
                'postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                async (payload) => {
                    const newMessage = payload.new;
                    const currentChatRoomId = pathname.split('/chatrooms/')[1];

                    // 1. 내가 보냈거나, 내가 현재 보고 있는 방의 메시지는 알림 X
                    if (newMessage.sender_id === currentUser.id || newMessage.room_id === currentChatRoomId) {
                        return;
                    }

                    // 2. 내가 이 채팅방의 멤버가 맞는지 DB에 직접 확인
                    const { data, error } = await supabase
                        .from('chat_room_participants')
                        .select('room_id')
                        .eq('room_id', newMessage.room_id)
                        .eq('user_id', currentUser.id)
                        .maybeSingle();

                    // 내가 참여한 방의 메시지가 아니면 알림 X
                    if (error || !data) {
                        return;
                    }

                    // 3. 보낸 사람 이름 가져오기
                    const { data: senderData } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', newMessage.sender_id)
                        .single();
                    
                    const senderName = senderData?.full_name || '누군가';
                    
                    // 4. 최종적으로 토스트 알림 띄우기
                    toast.custom(
                        (t) => (
                          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                            <div className="flex-1 w-0 p-4">
                              <div className="flex items-start">
                                <div className="ml-3 flex-1">
                                  <p className="text-sm font-medium text-gray-900">{senderName}</p>
                                  <p className="mt-1 text-sm text-gray-500">{newMessage.content}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex border-l border-gray-200">
                              <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                닫기
                              </button>
                            </div>
                          </div>
                        ),
                        { id: newMessage.id }
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, supabase, pathname]);


    return (
        <>
            <div className="flex h-screen overflow-hidden"> 
                <Sidebar /> 
                <main className="flex-1 pl-64 bg-gray-100"> 
                    {children}
                </main>
            </div>
            <ClientSideOnlyWrapper>
                <GlobalNotificationManager />
            </ClientSideOnlyWrapper>
        </>
    );
}

// 최종적으로 export되는 MainLayout 컴포넌트
export default function MainLayout({ children }) {
    return (
        // EmployeeProvider가 LayoutContent보다 상위에 있어야 합니다.
        <EmployeeProvider>
            {/* react-hot-toast를 위한 Toaster 컴포넌트 */}
            <Toaster position="top-right" />
            <LayoutContent>{children}</LayoutContent>
        </EmployeeProvider>
    );
}