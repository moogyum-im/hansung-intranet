// 파일 경로: src/app/(main)/chatrooms/[roomId]/page.jsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import GroupChatWindow from '@/components/GroupChatWindow';
import { notFound } from 'next/navigation';

async function getChatRoomData(roomId) {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '로그인 필요' };

    const { data: participantCheck } = await supabase.from('chat_room_participants').select('room_id').eq('room_id', roomId).eq('user_id', user.id).maybeSingle();
    if (!participantCheck) return { error: '참여자가 아님' };

    const { data: chatRoom } = await supabase.from('chat_rooms').select('*').eq('id', roomId).single();
    if (!chatRoom) return { error: '채팅방 없음' };

    const { data: initialMessages } = await supabase.from('chat_messages').select(`*, sender:profiles(id, full_name)`).eq('room_id', roomId).order('created_at');
    const { data: participants } = await supabase.from('chat_room_participants').select('profiles(id, full_name)').eq('room_id', roomId);
    
    return {
        currentUser: user,
        chatRoom,
        initialMessages: initialMessages || [],
        initialParticipants: participants?.map(p => p.profiles) || []
    };
}

export default async function ChatRoomPage({ params }) {
    const data = await getChatRoomData(params.roomId);
    if (data.error) return notFound();
    
    return (
        // ★★★ GroupChatWindow를 h-full div로 감싸서 높이를 100% 차지하게 합니다 ★★★
        <div className="h-full">
            <GroupChatWindow 
                serverCurrentUser={data.currentUser}
                serverChatRoom={data.chatRoom}
                serverInitialMessages={data.initialMessages}
                serverInitialParticipants={data.initialParticipants}
            />
        </div>
    );
}