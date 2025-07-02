// 파일 경로: src/app/api/tasks/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// 새 업무 추가 (POST)
export async function POST(request) {
    const taskData = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ message: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // ★★★ 클라이언트로부터 받은 department 값을 포함하여 INSERT ★★★
    const { data, error } = await supabase
        .from('tasks')
        .insert({
            ...taskData,
            user_id: user.id, // 생성자는 현재 로그인한 사용자로 설정
        })
        .select()
        .single();
    
    if (error) {
        console.error('API 새 업무 추가 에러:', error);
        // 클라이언트에 구체적인 에러 메시지를 전달합니다.
        return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}