// 파일 경로: src/actions/chatActions.js
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// ★★★ 1. 그룹 채팅방 생성 (수정) ★★★
export async function createGroupChat(roomName, participantIds) {
    const supabase = createServerActionClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '로그인이 필요합니다.' };

    try {
        // 1. 새 채팅방 생성
        const { data: newRoom, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({ name: roomName, created_by: user.id, is_direct_message: false })
            .select('id')
            .single();

        if (roomError) throw roomError;

        // 2. 참여자(만든 사람 + 선택된 사람) 추가
        const allParticipantIds = [...new Set([user.id, ...participantIds])]; // 중복 제거
        const participantsToInsert = allParticipantIds.map(id => ({
            room_id: newRoom.id,
            user_id: id,
        }));

        const { error: participantsError } = await supabase
            .from('chat_room_participants')
            .insert(participantsToInsert);

        if (participantsError) throw participantsError;
        
        revalidatePath('/chatrooms');
        return { success: true, roomId: newRoom.id };

    } catch (error) {
        console.error("그룹 채팅방 생성 실패:", error);
        return { error: '채팅방 생성에 실패했습니다.' };
    }
}

// ★★★ 2. 참여자 내보내기 (새로 추가) ★★★
export async function removeParticipant(roomId, participantIdToRemove) {
    const supabase = createServerActionClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '로그인이 필요합니다.' };

    try {
        // 방장인지 확인
        const { data: room, error: roomError } = await supabase
            .from('chat_rooms')
            .select('created_by')
            .eq('id', roomId)
            .single();
        
        if (roomError || !room) throw new Error('채팅방 정보를 찾을 수 없습니다.');
        if (room.created_by !== user.id) return { error: '방장만 참여자를 내보낼 수 있습니다.' };
        if (participantIdToRemove === user.id) return { error: '자기 자신을 내보낼 수 없습니다.' };

        // 참여자 삭제
        const { error: deleteError } = await supabase
            .from('chat_room_participants')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', participantIdToRemove);

        if (deleteError) throw deleteError;

        revalidatePath(`/chatrooms/${roomId}`);
        return { success: true };

    } catch (error) {
        console.error("참여자 내보내기 실패:", error);
        return { error: '참여자를 내보내는 데 실패했습니다.' };
    }
}


// 1:1 채팅방 찾기 또는 생성 (기존 코드)
export async function findOrCreateDirectChat(targetUserId) {
    // ...
}

// 채팅방 나가기 (기존 코드)
export async function leaveChatRoom(roomId) {
    // ...
}