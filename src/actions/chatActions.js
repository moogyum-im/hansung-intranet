// 파일 경로: src/actions/chatActions.js
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// (createGroupChat, removeParticipant 함수는 기존과 동일하게 유지)
export async function createGroupChat(roomName, participantIds) {
    const supabase = createServerActionClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '로그인이 필요합니다.' };
    try {
        const { data: newRoom, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({ name: roomName, created_by: user.id, is_direct_message: false })
            .select('id')
            .single();
        if (roomError) throw roomError;
        const allParticipantIds = [...new Set([user.id, ...participantIds])];
        const participantsToInsert = allParticipantIds.map(id => ({ room_id: newRoom.id, user_id: id }));
        const { error: participantsError } = await supabase.from('chat_room_participants').insert(participantsToInsert);
        if (participantsError) throw participantsError;
        revalidatePath('/chatrooms');
        return { success: true, roomId: newRoom.id };
    } catch (error) {
        console.error("그룹 채팅방 생성 실패:", error);
        return { error: '채팅방 생성에 실패했습니다.' };
    }
}
export async function removeParticipant(roomId, participantIdToRemove) {
    const supabase = createServerActionClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '로그인이 필요합니다.' };
    try {
        const { data: room, error: roomError } = await supabase.from('chat_rooms').select('created_by').eq('id', roomId).single();
        if (roomError || !room) throw new Error('채팅방 정보를 찾을 수 없습니다.');
        if (room.created_by !== user.id) return { error: '방장만 참여자를 내보낼 수 있습니다.' };
        if (participantIdToRemove === user.id) return { error: '자기 자신을 내보낼 수 없습니다.' };
        const { error: deleteError } = await supabase.from('chat_room_participants').delete().eq('room_id', roomId).eq('user_id', participantIdToRemove);
        if (deleteError) throw deleteError;
        revalidatePath(`/chatrooms/${roomId}`);
        return { success: true };
    } catch (error) {
        console.error("참여자 내보내기 실패:", error);
        return { error: '참여자를 내보내는 데 실패했습니다.' };
    }
}

// [수정] 1:1 채팅방 로직을 dm_key 기반으로 전면 수정
export async function findOrCreateDirectChat(targetUserId) {
    const supabase = createServerActionClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: '로그인이 필요합니다.' };
    if (user.id === targetUserId) return { error: '자기 자신과의 채팅방은 만들 수 없습니다.' };

    // 두 사용자 ID를 정렬하여 고유한 dm_key 생성
    const sortedIds = [user.id, targetUserId].sort();
    const dmKey = sortedIds.join('-');

    try {
        // 1. 새로 만든 dm_key 컬럼으로 기존 채팅방 확인
        const { data: existingRoom } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('dm_key', dmKey)
            .single();

        // 2. 채팅방이 있으면 해당 ID 반환
        if (existingRoom) {
            return { roomId: existingRoom.id };
        }

        // 3. 채팅방이 없으면 새로 생성
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', [user.id, targetUserId]);
        if (profileError || !profiles || profiles.length < 2) throw new Error('사용자 정보를 찾는 데 실패했습니다.');

        const myName = profiles.find(p => p.id === user.id).full_name;
        const targetName = profiles.find(p => p.id === targetUserId).full_name;
        const roomName = [myName, targetName].sort().join(', ');

        // 채팅방 생성 (id는 자동 생성, dm_key에 고유 키 저장)
        const { data: newRoom, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({
                name: roomName,
                is_direct_message: true,
                created_by: user.id,
                dm_key: dmKey // 여기에 고유 키 저장
            })
            .select('id')
            .single();
        if (roomError) throw roomError;

        // 참여자 추가
        const { error: participantsError } = await supabase
            .from('chat_room_participants')
            .insert([
                { room_id: newRoom.id, user_id: user.id },
                { room_id: newRoom.id, user_id: targetUserId }
            ]);
        if (participantsError) throw participantsError;

        revalidatePath('/chatrooms');
        return { roomId: newRoom.id };

    } catch (error) {
        console.error("1:1 채팅방 생성/조회 실패:", error);
        return { error: '채팅방을 만들거나 찾는 데 실패했습니다.' };
    }
}