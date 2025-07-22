import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import GroupChatWindow from '@/components/GroupChatWindow';
import { revalidatePath } from 'next/cache';

export default async function ChatRoomPage({ params }) {
    const supabase = createSupabaseServerClient();
    const roomId = params.roomId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return notFound();
    }
    
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    //           '읽음 처리' 로직을 여기에 추가합니다.
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // 사용자가 이 채팅방에 들어온 시간을 last_read_at으로 기록합니다.
    const { error: updateError } = await supabase
        .from('chat_room_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('room_id', roomId);

    if (updateError) {
        console.error("Failed to mark as read:", updateError);
        // 오류가 발생해도 페이지 로딩은 계속 진행합니다.
    } else {
        // 읽음 처리가 성공하면, 사이드바의 카운트가 업데이트 되도록 캐시를 갱신합니다.
        revalidatePath('/(main)/layout', 'layout');
    }
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

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
        
    // ★★★ 테이블 이름을 messages -> chat_messages 로 수정했습니다. ★★★
    const { data: messages, error: messagesError } = await supabase
        .from('chat_messages') // 기존 코드의 'messages' 테이블 이름 오류 수정
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