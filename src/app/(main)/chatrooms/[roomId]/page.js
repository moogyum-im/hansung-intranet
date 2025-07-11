import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import GroupChatWindow from '@/components/GroupChatWindow';

export default async function ChatRoomPage({ params }) {
    const supabase = createSupabaseServerClient();
    const roomId = params.roomId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return notFound();
    }
    
    const { data: chatRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
    
    if (roomError || !chatRoom) {
        return notFound();
    }

    const { data: participantsData, error: participantsError } = await supabase
        .from('chat_room_participants')
        .select('...profiles(*)')
        .eq('room_id', roomId);
    
    const participants = participantsError 
        ? [] 
        : participantsData.map(p => p.profiles).filter(Boolean);

    const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles(full_name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

    return (
        <GroupChatWindow
            serverChatRoom={chatRoom}
            serverInitialMessages={messagesError ? [] : messages}
            serverInitialParticipants={participants}
        />
    );
}