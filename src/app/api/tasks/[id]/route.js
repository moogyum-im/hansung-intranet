// 파일 경로: src/app/api/tasks/[id]/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// 업무 수정 (PUT)
export async function PUT(request, { params }) {
    const taskId = params.id;
    const taskData = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    const { id, created_at, user_id, ...updateData } = taskData;

    const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}

// ★★★★★ 업무 삭제 (DELETE) 함수 수정 ★★★★★
export async function DELETE(request, { params }) {
    const taskId = params.id;
    const supabase = createRouteHandlerClient({ cookies });

    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error('API 업무 삭제 에러:', error);
        // 실패 시, 에러 메시지를 담은 Response를 반환합니다.
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    
    // 성공 시, 성공했다는 메시지를 담은 Response를 반환합니다.
    return NextResponse.json({ message: '성공적으로 삭제되었습니다.' }, { status: 200 });
}