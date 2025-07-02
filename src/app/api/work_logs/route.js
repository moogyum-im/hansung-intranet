// 파일 경로: src/app/api/work_logs/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// 모든 업무일지 가져오기 (GET)
export async function GET(request) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ message: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 현재 사용자의 프로필 정보(역할)를 가져와 관리자 여부를 확인합니다.
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profileError || !profileData) {
        console.error('API 업무일지 GET - 프로필 정보 로딩 실패:', profileError);
        return NextResponse.json({ message: '프로필 정보를 가져올 수 없습니다.' }, { status: 500 });
    }

    const isAdmin = profileData.role === 'admin';

    let query = supabase
        .from('work_logs')
        // user_id 관계는 'target_user', creator_id 관계는 'creator'로 명확히 지정하여 가져옵니다.
        .select(`
            id, 
            report_date, 
            today_summary, 
            tomorrow_plan, 
            notes, 
            user_id, 
            department, 
            created_at, 
            creator_id,
            target_user:profiles!work_logs_user_id_fkey(full_name), 
            creator:profiles!work_logs_creator_id_fkey(full_name)
        `)
        .order('report_date', { ascending: false });

    // 관리자가 아닐 경우, 자신이 대상이거나 자신이 작성한 업무일지만 필터링합니다.
    if (!isAdmin) {
        query = query.or(`user_id.eq.${user.id},creator_id.eq.${user.id}`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('API 업무일지 GET 에러:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}

// 새 업무일지 추가 (POST)
export async function POST(request) {
    const workLogData = await request.json();
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ message: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('work_logs')
        .insert({ 
            // user_id는 '대상자'로 선택된 ID
            // creator_id는 '실제 작성자'의 ID (현재 로그인 사용자)
            ...workLogData, 
            creator_id: user.id // 업무일지를 실제로 생성한 사용자는 현재 로그인한 user
        })
        .select()
        .single(); 
    
    if (error) {
        console.error('API 새 업무일지 추가 에러:', error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
}

// 특정 업무일지 수정 (PUT)
export async function PUT(request) {
    const { id, ...updateData } = await request.json(); // ID는 body에서 가져옴
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ message: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 수정 권한 확인: 관리자이거나, 해당 업무일지의 대상자이거나, 해당 업무일지의 작성자인 경우
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profileData.role === 'admin';

    let query = supabase.from('work_logs').update(updateData).eq('id', id);

    if (!isAdmin) {
        query = query.or(`user_id.eq.${user.id},creator_id.eq.${user.id}`);
    }

    const { data, error } = await query.select().single();

    if (error) {
        console.error('API 업무일지 수정 에러:', error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
}

// 특정 업무일지 삭제 (DELETE)
export async function DELETE(request) {
    const { id } = await request.json(); // ID는 body에서 가져옴
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ message: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 삭제 권한 확인: 관리자이거나, 해당 업무일지의 대상자이거나, 해당 업무일지의 작성자인 경우
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profileData.role === 'admin';

    let query = supabase.from('work_logs').delete().eq('id', id);

    if (!isAdmin) {
        query = query.or(`user_id.eq.${user.id},creator_id.eq.${user.id}`);
    }
    
    const { error } = await query;

    if (error) {
        console.error('API 업무일지 삭제 에러:', error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: '성공적으로 삭제되었습니다.' }, { status: 200 });
}