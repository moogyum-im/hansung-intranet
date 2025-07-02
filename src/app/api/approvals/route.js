// 파일 경로: src/app/api/approvals/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// 모든 결재 문서 가져오기 (GET)
export async function GET(request) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) { return NextResponse.json({ message: '인증되지 않은 사용자입니다.' }, { status: 401 }); }

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profileError || !profileData) {
        console.error('API 결재 GET - 프로필 정보 로딩 실패:', profileError);
        return NextResponse.json({ message: '프로필 정보를 가져올 수 없습니다.' }, { status: 500 });
    }

    const isAdmin = profileData.role === 'admin';

    let query = supabase
        .from('approvals')
        .select(`
            id, 
            title, 
            content, 
            request_type, 
            requested_by, 
            approver_id, 
            status, 
            requested_at, 
            approved_at, 
            approver_comment,
            file_url,           
            file_path,         
            file_metadata,      
            requested_user:profiles!approvals_requested_by_fkey(full_name), 
            approving_user:profiles!approvals_approver_id_fkey(full_name)
        `)
        .order('requested_at', { ascending: false });

    if (!isAdmin) {
        query = query.or(`requested_by.eq.${user.id},approver_id.eq.${user.id}`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('API 결재 GET 에러:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}

// ... (POST, PUT, DELETE 함수는 이전과 동일)
// 새 결재 문서 추가 (POST)
export async function POST(request) {
    const approvalData = await request.json();
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ message: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('approvals')
        .insert({ 
            ...approvalData, 
            requested_by: user.id, // 요청자는 현재 로그인한 user
            status: '대기' // 초기 상태는 '대기'
        })
        .select()
        .single(); 
    
    if (error) {
        console.error('API 새 결재 문서 추가 에러:', error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
}

// 특정 결재 문서 수정 (PUT) - 결재 처리 또는 요청자 수정
export async function PUT(request) {
    const { id, ...updateData } = await request.json(); // ID는 body에서 가져옴
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ message: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 수정 권한 확인: 관리자이거나, 해당 결재 문서의 요청자이거나, 결재자인 경우
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profileData.role === 'admin';

    let query = supabase.from('approvals').update(updateData).eq('id', id);

    // 관리자가 아니면 본인이 요청했거나 본인이 결재자인 경우만 수정 가능하도록 필터 추가
    if (!isAdmin) {
        query = query.or(`requested_by.eq.${user.id},approver_id.eq.${user.id}`);
    }

    const { data, error } = await query.select().single();

    if (error) {
        console.error('API 결재 PUT 에러:', error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
}

// 특정 결재 문서 삭제 (DELETE) - 요청자만 자신의 대기 중인 문서 삭제 가능
export async function DELETE(request) {
    const { id } = await request.json(); // ID는 body에서 가져옴
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ message: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 삭제 권한 확인: 관리자이거나, 해당 결재 문서의 요청자이면서 대기 상태인 경우
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profileData.role === 'admin';

    let query = supabase.from('approvals').delete().eq('id', id);

    if (!isAdmin) {
        query = query.eq('requested_by', user.id).eq('status', '대기'); // 요청자 본인이면서 대기 상태인 경우만 삭제
    }
    
    const { error } = await query;

    if (error) {
        console.error('API 결재 DELETE 에러:', error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: '성공적으로 삭제되었습니다.' }, { status: 200 });
}