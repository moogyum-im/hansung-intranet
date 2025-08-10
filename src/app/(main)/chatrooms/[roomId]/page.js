// src/app/(main)/chatrooms/[roomId]/page.js
// 주의: 파일 확장자를 .jsx에서 .js로 변경하는 것을 권장합니다.

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import GroupChatWindow from '@/components/GroupChatWindow';

/**
 * 주어진 roomId에 대한 채팅방 데이터를 비동기적으로 가져옵니다.
 * 이 함수는 서버 컴포넌트에서 호출됩니다.
 * @param {string} roomId - 가져올 채팅방의 ID
 * @returns {Promise<{
 * currentUser?: Object,
 * chatRoom?: Object,
 * initialMessages?: Array,
 * initialParticipants?: Array,
 * error?: string
 * }>} - 채팅방 데이터 또는 에러 객체
 */
async function getChatRoomData(roomId) {
    const supabase = createServerComponentClient({ cookies });

    console.log(`[getChatRoomData] roomId: ${roomId} 데이터 로딩 시작.`);

    // 1. 현재 사용자 정보 가져오기
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("[getChatRoomData] 사용자 정보를 불러오는 데 실패했습니다 (로그인 필요):", userError?.message || '사용자 없음');
            redirect('/login'); // 로그인 페이지 경로에 맞춰 수정 필요
        }
        console.log(`[getChatRoomData] 사용자 정보 로드 완료: ${user.id}`);
        
        // 2. 사용자가 해당 채팅방의 참여자인지 확인
        const { data: participantCheck, error: participantError } = await supabase
            .from('chat_room_participants')
            .select('room_id')
            .eq('room_id', roomId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (participantError || !participantCheck) {
            console.error("[getChatRoomData] 참여자 확인 실패 또는 참여자가 아님:", participantError?.message || '참여자 아님');
            notFound(); // 참여자가 아니면 404 페이지
        }
        console.log(`[getChatRoomData] 참여자 확인 완료: 사용자는 방에 참여하고 있습니다.`);

        // 3. 채팅방 정보 가져오기
        const { data: chatRoom, error: chatRoomError } = await supabase
            .from('chat_rooms')
            .select('*') // 모든 컬럼 선택
            .eq('id', roomId)
            .single();

        if (chatRoomError || !chatRoom) {
            console.error("[getChatRoomData] 채팅방 정보를 불러오는 데 실패했습니다:", chatRoomError?.message || '채팅방 없음');
            notFound(); // 채팅방을 찾을 수 없으면 404 페이지
        }
        console.log(`[getChatRoomData] 채팅방 정보 로드 완료: ${chatRoom.name}`);

        // 4. 초기 메시지 가져오기 (초기 로드 시 DB에서 메시지 가져오는 부분)
        const { data: initialMessages, error: messagesError } = await supabase
            .from('chat_messages')
            .select(`*, sender:profiles(id, full_name, avatar_url)`) // avatar_url 추가하여 가져오도록 제안 (프로필 사진 용도)
            .eq('room_id', roomId)
            .order('created_at', { ascending: true }) // 메시지 순서 보장
            .limit(100); // 초기 로드를 위한 메시지 수 제한 (필요에 따라 조절)

        if (messagesError) {
            console.error("[getChatRoomData] 초기 메시지를 불러오는 데 실패했습니다:", messagesError.message);
        } else {
            console.log(`[getChatRoomData] 초기 메시지 로드 완료: ${initialMessages.length}개`);
        }

        // 5. 채팅방 참여자 정보 가져오기
        const { data: participants, error: participantsError } = await supabase
            .from('chat_room_participants')
            .select('profiles(id, full_name, position)'); // position 필드 추가

        if (participantsError) {
            console.error("[getChatRoomData] 참여자 정보를 불러오는 데 실패했습니다:", participantsError.message);
        } else {
            console.log(`[getChatRoomData] 참여자 정보 로드 완료: ${participants.length}명`);
        }
        
        console.log(`[getChatRoomData] 모든 데이터 로딩 성공.`);
        return {
            currentUser: user,
            chatRoom,
            initialMessages: initialMessages || [],
            initialParticipants: participants?.map(p => p.profiles) || []
        };

    } catch (error) {
        // 이 catch 블록은 `redirect()`나 `notFound()` 호출 전에 발생한 예외를 잡습니다.
        console.error("[getChatRoomData] 데이터 로드 중 예상치 못한 오류 발생:", error);
        // 사용자에게 404 또는 일반적인 오류 페이지를 보여주는 것이 좋습니다.
        notFound(); 
    }
}

/**
 * ChatRoomPage 컴포넌트는 특정 채팅방의 상세 페이지를 렌더링합니다.
 * 이 컴포넌트는 서버 컴포넌트이며, getChatRoomData 함수를 사용하여 데이터를 Pre-fetch 합니다.
 * @param {Object} props - 페이지 컴포넌트의 props 객체
 * @param {{ roomId: string }} props.params - 동적 라우팅 파라미터 (예: URL의 `[roomId]`)
 */
export default async function ChatRoomPage({ params }) {
    const data = await getChatRoomData(params.roomId);
    
    // getChatRoomData 내부에서 이미 redirect나 notFound를 처리하므로,
    // 여기서는 data.error를 다시 체크할 필요가 없습니다.
    // 만약 data.error가 반환될 수 있는 상황이라면, 그에 따른 적절한 UI를 렌더링해야 합니다.
    // 현재 구현에서는 error 발생 시 notFound() 또는 redirect()를 호출하여 이 컴포넌트가 렌더링되지 않습니다.
    
    return (
        <div className="h-full">
            <GroupChatWindow 
                currentUser={data.currentUser}
                chatRoom={data.chatRoom}
                initialMessages={data.initialMessages}
                initialParticipants={data.initialParticipants}
            />
        </div>
    );
}