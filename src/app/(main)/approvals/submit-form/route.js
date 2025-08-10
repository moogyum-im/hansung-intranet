// 파일 경로: src/app/api/submit-approval/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export default async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });

        const { title, content, document_type, approver_id } = await request.json();
        if (!title || !content || !document_type || !approver_id) {
            return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
        }

        const { data: newDoc, error: docError } = await supabase
            .from('approval_documents')
            .insert({ title, content, document_type, created_by: user.id, status: '진행중' })
            .select().single();
        if (docError) throw new Error(`문서 생성 실패: ${docError.message}`);

        const { error: approverError } = await supabase
            .from('approval_document_approvers')
            .insert({ document_id: newDoc.id, approver_id: approver_id, status: '대기', step: 1 });
        if (approverError) throw new Error(`결재자 정보 생성 실패: ${approverError.message}`);

        const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
                recipient_id: approver_id,
                type: 'approval_request',
                content: `새로운 '${title}' 문서에 대한 결재가 요청되었습니다.`,
                link: `/approvals/${newDoc.id}`
            });
        if (notificationError) console.warn(`알림 생성 실패: ${notificationError.message}`);

        return NextResponse.json({ message: '성공적으로 상신되었습니다.', documentId: newDoc.id }, { status: 201 });

    } catch (error) {
        console.error('상신 처리 중 서버 오류 발생:', error);
        return NextResponse.json({ error: error.message || '서버 내부 오류' }, { status: 500 });
    }
}