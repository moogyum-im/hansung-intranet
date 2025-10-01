import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new NextResponse(JSON.stringify({ error: '인증되지 않은 사용자입니다.' }), { status: 401 });
        }

        const {
            title,
            content,
            document_type,
            approver_ids,
            referrer_ids,
            requester_id,
            requester_name,
            requester_department,
            requester_position,
            attachments
        } = await request.json();
        
        if (!title || !document_type || !approver_ids || approver_ids.length === 0) {
            return new NextResponse(JSON.stringify({ error: '필수 정보(제목, 문서 종류, 결재선)가 누락되었습니다.' }), { status: 400 });
        }

        const { data: newDoc, error: docError } = await supabase
            .from('approval_documents')
            .insert({
                // document_number는 최종 승인 시 수기로 입력되므로 여기서 제외합니다.
                title,
                content: content || '{}',
                document_type,
                author_id: user.id,
                requester_id: requester_id,
                requester_name: requester_name,
                requester_department: requester_department,
                requester_position: requester_position,
                status: 'pending',
                current_step: 1,
                current_approver_id: approver_ids[0].id,
                attachments: attachments,
            })
            .select('*')
            .single();

        if (docError) throw new Error(`문서 생성 실패: ${docError.message}`);
           
        const approversToInsert = approver_ids.map((approver, index) => ({
            document_id: newDoc.id,
            approver_id: approver.id,
            approver_name: approver.full_name,
            approver_position: approver.position,
            sequence: index + 1,
            status: index === 0 ? '대기' : '미결'
        }));

        const { error: approverError } = await supabase
            .from('approval_document_approvers')
            .insert(approversToInsert);

        if (approverError) throw new Error(`결재선 정보 생성 실패: ${approverError.message}`);
        
        // ... (이하 로직은 기존과 동일) ...
        
        if (referrer_ids && referrer_ids.length > 0) {
            const referrersToInsert = referrer_ids.map(referrer => ({
                document_id: newDoc.id,
                referrer_id: referrer.id,
                referrer_name: referrer.full_name,
                referrer_position: referrer.position
            }));
            const { error: referrerError } = await supabase
                .from('approval_document_referrers')
                .insert(referrersToInsert);
            if (referrerError) console.warn(`참조인 정보 생성 실패: ${referrerError.message}`);
        }
        
        const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
                recipient_id: approver_ids[0].id,
                type: 'approval_request',
                content: `새로운 '${newDoc.title}' 문서에 대한 결재가 요청되었습니다.`,
                link: `/approvals/${newDoc.id}`
            });
        if (notificationError) console.warn(`알림 생성 실패: ${notificationError.message}`);

        return NextResponse.json({ message: '성공적으로 상신되었습니다.', documentId: newDoc.id });

    } catch (error) {
        console.error('상신 처리 중 서버 오류 발생:', error);
        return new NextResponse(JSON.stringify({ error: error.message || '서버 내부 오류' }), { status: 500 });
    }
}