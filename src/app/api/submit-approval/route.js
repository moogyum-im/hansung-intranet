import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
        }

        const body = await request.json();
        const {
            title, content, document_type, approver_ids, referrer_ids,
            requester_id, requester_name, requester_department, requester_position,
            attachments
        } = body;

        // [방어코드] 필수 데이터 검증 강화
        if (!title || !document_type || !approver_ids || approver_ids.length === 0) {
            return NextResponse.json({ error: '필수 정보(제목, 문서 종류, 결재선)가 누락되었습니다.' }, { status: 400 });
        }

        // 1. 메인 문서 생성 (approval_documents)
        const { data: newDoc, error: docError } = await supabase
            .from('approval_documents')
            .insert({
                title,
                content: content || '{}',
                document_type,
                author_id: user.id, // 실제 기안자(로그인 유저)
                requester_id: requester_id || user.id, // 요청자 (없으면 본인)
                requester_name,
                requester_department,
                requester_position,
                status: 'pending',
                current_step: 1,
                current_approver_id: approver_ids[0].id,
                attachments: attachments || [] // null 방지
            })
            .select()
            .single();

        if (docError) throw new Error(`문서 생성 실패: ${docError.message}`);

        // 2. 결재선 등록 (approval_document_approvers)
        const approversToInsert = approver_ids.map((approver, index) => ({
            document_id: newDoc.id,
            approver_id: approver.id,
            approver_name: approver.full_name || approver.name, // 필드명 유연성 확보
            approver_position: approver.position,
            sequence: index + 1,
            status: index === 0 ? '대기' : '미결' // 첫 번째 결재자만 '대기'
        }));

        const { error: approverError } = await supabase
            .from('approval_document_approvers')
            .insert(approversToInsert);

        if (approverError) {
            // 결재선 등록 실패 시 생성된 문서 삭제 (수동 롤백)
            await supabase.from('approval_documents').delete().eq('id', newDoc.id);
            throw new Error(`결재선 정보 생성 실패: ${approverError.message}`);
        }

        // 3. 참조인 등록 (선택 사항)
        if (referrer_ids && referrer_ids.length > 0) {
            const referrersToInsert = referrer_ids.map(referrer => ({
                document_id: newDoc.id,
                referrer_id: referrer.id,
                referrer_name: referrer.full_name || referrer.name,
                referrer_position: referrer.position
            }));
            const { error: referrerError } = await supabase
                .from('approval_document_referrers')
                .insert(referrersToInsert);
            
            if (referrerError) console.warn(`참조인 등록 누락(무시가능): ${referrerError.message}`);
        }

        // 4. 첫 번째 결재자에게 알림 전송
        await supabase.from('notifications').insert({
            recipient_id: approver_ids[0].id,
            type: 'approval_request',
            content: `📬 [결재요청] '${newDoc.title}' 문서가 도착했습니다.`,
            link: `/approvals/${newDoc.id}`,
            is_read: false
        });

        return NextResponse.json({ 
            success: true, 
            message: '성공적으로 상신되었습니다.', 
            documentId: newDoc.id 
        });

    } catch (error) {
        console.error('CRITICAL_ERROR:', error);
        return NextResponse.json({ 
            error: error.message || '서버 내부 오류가 발생했습니다.' 
        }, { status: 500 });
    }
}