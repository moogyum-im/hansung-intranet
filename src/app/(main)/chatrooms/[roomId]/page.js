// 파일 경로: src/app/(main)/chatrooms/[roomId]/page.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import GroupChatWindow from '@/components/GroupChatWindow';

async function getChatRoomData(roomId) {
    const supabase = createServerComponentClient({ cookies });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: participantCheck } = await supabase
        .from('chat_room_participants')
        .select('room_id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!participantCheck) notFound();

    const { data: chatRoom, error } = await supabase
        .from('chat_rooms')
        .select(`
            *,
            messages:chat_messages(*, sender:profiles(id, full_name, avatar_url)),
            participants:chat_room_participants(*, profiles(id, full_name, position))
        `)
        .eq('id', roomId)
        .order('created_at', { foreignTable: 'chat_messages', ascending: true })
        .single();
    
    if (error || !chatRoom) {
        console.error("채팅방 데이터 로딩 실패:", error);
        notFound();
    }

    return {
        currentUser: user,
        chatRoom,
    };
}

export default async function ChatRoomPage({ params }) {
    const { currentUser, chatRoom } = await getChatRoomData(params.roomId);
    
    return (
        <div className="h-full">
            <GroupChatWindow 
                currentUser={currentUser}
                chatRoom={chatRoom}
                initialMessages={chatRoom.messages}
                initialParticipants={chatRoom.participants}
            />
        </div>
    );
}