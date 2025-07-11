// src/components/GlobalChatListener.jsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast'; // react-hot-toast 라이브러리 사용

export default function GlobalChatListener() {
    const { employee } = useEmployee(); // 현재 로그인한 직원 정보 (employee.id, employee.full_name 등)
    const router = useRouter(); // Next.js 라우터 (페이지 이동용)
    const pathname = usePathname(); // 현재 URL 경로 (채팅방 ID 확인용)
    const audioRef = useRef(null); // 알림 소리 Audio 객체를 저장할 ref

    // public 폴더에 저장된 알림 소리 파일 경로
    const NOTIFICATION_SOUND_URL = '/sounds/rclick-13693.mp3';

    // 1. 오디오 객체 초기화 및 브라우저 알림 권한 요청 (컴포넌트 마운트 시 한 번만 실행)
    useEffect(() => {
        // 브라우저 Notification API 지원 여부 확인 및 권한 요청
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
        // 알림 오디오 객체를 생성하고 ref에 저장합니다.
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.5; // 알림 볼륨 설정 (0.0 ~ 1.0)
    }, []); // 빈 의존성 배열: 컴포넌트가 처음 마운트될 때만 실행

    // 알림 소리 재생 함수 (재생 로직을 캡슐화하고 useCallback으로 메모이제이션)
    const playNotificationSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.load(); // 오디오 리소스를 다시 로드하여 재생 준비
            audioRef.current.play().catch(e => {
                // 브라우저의 자동 재생 정책으로 인해 play()가 실패할 수 있습니다.
                console.error("알림 오디오 재생 실패:", e);
            });

            // 모바일 기기에서 진동 알림 (지원하는 경우)
            if ('vibrate' in navigator) {
                navigator.vibrate(200); // 200ms 동안 진동
            }
        }
    }, []); // 의존성 없음: 함수 자체는 변하지 않으므로 useCallback으로 래핑

    // 2. Supabase 실시간 리스너 설정 (employee 정보가 로드된 후 실행)
    useEffect(() => {
        // employee 정보가 없으면 리스너를 설정하지 않습니다. (로그인되지 않은 상태)
        if (!employee) {
            console.log("GlobalChatListener: 직원 데이터가 로드되지 않아 구독을 건너뜀.");
            return;
        }

        console.log("GlobalChatListener: Supabase 채널 구독 시작...");

        // 'global-message-listener-final' 채널 구독
        const channel = supabase
            .channel('global-message-listener-final')
            .on(
                'postgres_changes', // PostgreSQL 데이터베이스 변경 이벤트 감지
                {
                    event: 'INSERT', // 'chat_messages' 테이블에 새로운 행이 삽입될 때만 감지
                    schema: 'public',
                    table: 'chat_messages', // 실제 채팅 메시지가 저장되는 테이블 이름
                    // filter: `recipient_id=eq.${employee.id}` // 특정 사용자에게 온 메시지만 필터링 (필요하다면)
                },
                async (payload) => {
                    const newMessage = payload.new; // 새로 삽입된 메시지 데이터

                    // 1. 내가 보낸 메시지는 알림을 받지 않습니다.
                    if (newMessage.sender_id === employee.id) {
                        console.log("내가 보낸 메시지: 알림 건너뜀.");
                        return;
                    }

                    // 2. 현재 열려있는 채팅방의 메시지는 알림을 받지 않습니다.
                    // (예: 현재 URL이 '/chatrooms/abc-123'이면, currentRoomId는 'abc-123')
                    const currentRoomId = pathname.split('/chatrooms/')[1]; // 현재 URL에서 채팅방 ID 추출
                    if (currentRoomId && currentRoomId === newMessage.room_id) {
                        console.log("현재 채팅방 메시지: 알림 건너뜀.");
                        return;
                    }

                    // 3. 메시지 관련 정보 (발신자 이름, 채팅방 이름) 비동기로 조회
                    // Supabase Realtime payload에는 직접적인 'senderName'이나 'roomName'이 없습니다.
                    // 따라서, 이 정보를 데이터베이스에서 추가로 조회해야 합니다.

                    // 3-1. 발신자 이름 가져오기: 'profiles' 테이블에서 sender_id를 이용해 full_name 조회
                    let senderName = '알 수 없는 발신자';
                    const { data: senderData, error: senderError } = await supabase
                        .from('profiles') // ★★★ 'employees' -> 'profiles'로 변경 ★★★
                        .select('full_name') // ★★★ 'name' -> 'full_name'으로 변경 ★★★
                        .eq('id', newMessage.sender_id) // 메시지의 sender_id와 일치하는 프로필 찾기
                        .single(); // 하나의 결과만 기대

                    if (senderError) {
                        console.error('발신자 이름 조회 오류:', senderError.message);
                    } else if (senderData) {
                        senderName = senderData.full_name; // ★★★ 'name' -> 'full_name'으로 변경 ★★★
                    }

                    // 3-2. 채팅방 이름 가져오기: 'chat_rooms' 테이블에서 room_id를 이용해 name 조회
                    let roomName = '알 수 없는 채팅방';
                    const { data: roomData, error: roomError } = await supabase
                        .from('chat_rooms') // 채팅방 정보가 저장된 테이블 (스키마에 따라 다름)
                        .select('name') // 채팅방 이름 컬럼
                        .eq('id', newMessage.room_id) // 메시지의 room_id와 일치하는 채팅방 찾기
                        .single(); // 하나의 결과만 기대

                    if (roomError) {
                        console.error('채팅방 이름 조회 오류:', roomError.message);
                    } else if (roomData) {
                        roomName = roomData.name;
                    }

                    // 3-3. 메시지 내용: newMessage 객체의 'content' 컬럼에서 가져오기
                    const messageContent = newMessage.content || '새 메시지'; // 'content' 컬럼이 메시지 내용이라고 가정

                    // 4. 알림 소리 재생
                    playNotificationSound(); // 위에서 정의한 playNotificationSound 함수 호출

                    // 5. 브라우저 네이티브 알림 또는 react-hot-toast 표시
                    // `document.hidden`은 사용자가 현재 브라우저 탭을 보고 있지 않을 때(다른 탭을 보거나 최소화되었을 때) true
                    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
                        // 브라우저 탭이 숨겨져 있을 때 (백그라운드일 때)
                        const notification = new Notification(`${senderName} (${roomName})`, {
                            body: messageContent,
                            tag: newMessage.room_id, // 동일한 태그를 가진 알림은 하나만 표시되고 업데이트됩니다.
                            icon: '/path/to/your/app/icon.png', // 앱 아이콘 경로 (public 폴더에 이미지 파일 필요)
                        });

                        // 알림 클릭 시 해당 채팅방으로 이동
                        notification.onclick = () => {
                            router.push(`/chatrooms/${newMessage.room_id}`);
                            window.focus(); // 브라우저 탭 활성화
                            notification.close(); // 알림 닫기
                        };
                    } else {
                        // 브라우저 탭이 활성화되어 있거나, Notification 권한이 없거나, 지원하지 않을 때
                        // react-hot-toast를 사용하여 커스텀 토스트 팝업 표시
                        toast.custom((t) => (
                            <div
                                onClick={() => {
                                    router.push(`/chatrooms/${newMessage.room_id}`); // 토스트 클릭 시 채팅방으로 이동
                                    toast.dismiss(t.id); // 클릭 시 토스트 닫기
                                }}
                                // 토스트 컨테이너 스타일: 애니메이션, 그림자, 둥근 모서리, 배경색, 마우스 오버 시 확대 효과
                                className={`${
                                    t.visible ? 'animate-enter' : 'animate-leave'
                                } max-w-md w-full bg-white shadow-xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer transform transition-all duration-300 ease-out hover:scale-105`}
                            >
                                <div className="flex-1 w-0 p-4">
                                    <div className="flex items-start">
                                        {/* 아이콘/아바타 영역 (발신자 프로필 이미지로 교체 가능) */}
                                        <div className="flex-shrink-0 pt-0.5">
                                            {/* TODO: 발신자 아바타 URL이 있다면 Image 컴포넌트를 사용하세요 */}
                                            {/* 현재는 임시 채팅 아이콘 */}
                                            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        {/* 메시지 내용 영역 */}
                                        <div className="ml-3 flex-1 overflow-hidden">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {/* 발신자 이름과 방 이름을 볼드체로 강조 */}
                                                <span className="font-bold">{senderName}</span> <span className="font-normal text-gray-600">({roomName})</span>
                                            </p>
                                            <p className="mt-1 text-sm text-gray-700 whitespace-normal line-clamp-2">
                                                {/* 메시지 내용은 최대 2줄까지만 표시하고 넘치면 ...으로 처리 */}
                                                {messageContent}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {/* 닫기 버튼 영역 */}
                                <div className="flex border-l border-gray-200">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // 부모 div의 onClick 이벤트 전파 방지 (토스트 클릭 시 이동 방지)
                                            toast.dismiss(t.id); // 닫기 버튼 클릭 시 토스트 닫기
                                        }}
                                        className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-150 ease-in-out"
                                    >
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ));
                    }
                }
            )
            .subscribe(); // Supabase Realtime 채널 구독 시작

        // 컴포넌트 언마운트 시 채널 구독 해제 (메모리 누수 방지)
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
                console.log("GlobalChatListener: Supabase 채널 구독 해제.");
            }
        };
    }, [employee, pathname, router, playNotificationSound]); // 의존성 배열에 사용된 모든 값 포함

    // 이 컴포넌트는 UI를 직접 렌더링하지 않고, 백그라운드에서 알림 로직만 처리합니다.
    return null;
}