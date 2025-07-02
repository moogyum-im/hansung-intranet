// 파일 경로: src/actions/chatActions.js
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// 1:1 채팅방 찾기 또는 생성
export async function findOrCreateDirectChat(targetUserId) {
  const supabase = createServerActionClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');
  
  const currentUserId = user.id;
  if (currentUserId === targetUserId) return;

  const userIds = [currentUserId, targetUserId].sort();

  const { data: existingRoomId, error: rpcError } = await supabase.rpc('find_direct_chat_room', {
    user_id_1: userIds[0],
    user_id_2: userIds[1]
  });

  if (rpcError) {
    console.error('1:1 채팅방 검색 RPC 에러:', rpcError);
    return;
  }

  if (existingRoomId) {
    return redirect(`/chatrooms/${existingRoomId}`);
  }

  const { data: usersData } = await supabase.from('profiles').select('full_name').in('id', userIds);
  const roomName = usersData?.map(u => u.full_name).join(', ') || '1:1 대화';
  
  const { data: newRoom, error: newRoomError } = await supabase
    .from('chat_rooms')
    .insert({ name: roomName, is_direct_message: true })
    .select('id')
    .single();

  if (newRoomError) return;

  const participants = userIds.map(id => ({ room_id: newRoom.id, user_id: id }));
  await supabase.from('chat_room_participants').insert(participants);
  
  redirect(`/chatrooms/${newRoom.id}`);
}


// ★★★★★ 채팅방 나가기 서버 액션 (새로 추가) ★★★★★
export async function leaveChatRoom(roomId) {
  const supabase = createServerActionClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // 이 액션은 로그인한 사용자만 호출할 수 있으므로, 실제로는 이 에러가 거의 발생하지 않습니다.
    return { error: '로그인이 필요합니다.' };
  }

  // 1. chat_room_participants 테이블에서 내 참여 기록을 삭제합니다.
  const { error } = await supabase
    .from('chat_room_participants')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', user.id);

  if (error) {
    console.error("채팅방 나가기 실패:", error);
    return { error: '채팅방을 나가는 데 실패했습니다.' };
  }

  // 2. 채팅방 목록 페이지의 캐시를 무효화하여, 나간 방이 즉시 사라지도록 합니다.
  revalidatePath('/chatrooms');
  
  // 3. 채팅 목록 페이지로 리다이렉트합니다.
  // redirect 함수는 try-catch 블록 안에서 사용될 때 특별한 에러를 발생시킬 수 있으므로,
  // 단독으로 호출하는 것이 가장 안전합니다.
  redirect('/chatrooms');
}