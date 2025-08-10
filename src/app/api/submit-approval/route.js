// 파일 경로: src/app/api/submit-approval/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new NextResponse(JSON.stringify({ error: '인증되지 않은 사용자입니다.' }), { status: 401 });

        const { title, content, document_type, approver_ids, reference_id, attachment_url, attachment_filename } = await request.json();

        if (!title || !content || !document_type || !approver_ids || approver_ids.length === 0) {
            return new NextResponse(JSON.stringify({ error: '필수 정보가 누락되었습니다.' }), { status: 400 });
        }

        // 1. 메인 결재 문서 생성 (current_step: 1 로 초기화)
        const { data: newDoc, error: docError } = await supabase
            .from('approval_documents')
            .insert({ title, content, document_type, created_by: user.id, status: '진행중', attachment_url, attachment_filename, current_step: 1 })
            .select().single();
        if (docError) throw new Error(`문서 생성 실패: ${docError.message}`);

        // 2. 여러 명의 결재자를 순서대로 저장
        const approversToInsert = approver_ids.map((id, index) => ({
            document_id: newDoc.id,
            approver_id: id,
            sequence: index + 1, // 순서 (1, 2, 3...)
            status: index === 0 ? '대기' : '미결', // 첫 결재자만 '대기', 나머지는 '미결'
        }));

        const { error: approverError } = await supabase
            .from('approval_document_approvers')
            .insert(approversToInsert);
        if (approverError) throw new Error(`결재자 정보 생성 실패: ${approverError.message}`);
        
        // 3. 참조인 정보 생성
        if (reference_id) {
            await supabase.from('approval_document_referrers').insert({ document_id: newDoc.id, referrer_id: reference_id });
        }
        
        // 4. 첫번째 결재자에게만 알림 전송
        await supabase.from('notifications').insert({
            recipient_id: approver_ids[0],
            type: 'approval_request',
            content: `새로운 '${title}' 문서에 대한 결재가 요청되었습니다.`,
            link: `/approvals/${newDoc.id}`
        });

        return new NextResponse(JSON.stringify({ message: '성공적으로 상신되었습니다.' }), { status: 201 });
    } catch (error) {
        console.error('상신 처리 중 오류 발생:', error);
        return new NextResponse(JSON.stringify({ error: error.message || '서버 내부 오류' }), { status: 500 });
    }
}