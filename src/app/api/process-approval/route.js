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

        const { document_id, action, comment } = await request.json(); // action: 'approve' 또는 'reject'

        if (!document_id || !action) {
            return new NextResponse(JSON.stringify({ error: '필수 정보(문서 ID, 액션)가 누락되었습니다.' }), { status: 400 });
        }

        // 1. 현재 결재 문서 정보 및 결재선 조회
        const { data: document, error: docError } = await supabase
            .from('approval_documents')
            .select('*')
            .eq('id', document_id)
            .single();

        if (docError || !document) {
            console.error('문서 조회 오류:', docError?.message);
            return new NextResponse(JSON.stringify({ error: '문서를 찾을 수 없습니다.' }), { status: 404 });
        }

        if (document.status !== 'pending') {
            return new NextResponse(JSON.stringify({ error: '이미 처리된 문서입니다.' }), { status: 400 });
        }

        // 현재 로그인한 사용자가 현재 결재자인지 확인
        if (document.current_approver_id !== user.id) {
            return new NextResponse(JSON.stringify({ error: '현재 결재자가 아닙니다.' }), { status: 403 });
        }

        const { data: approvers, error: approversError } = await supabase
            .from('approval_document_approvers')
            .select('*')
            .eq('document_id', document_id)
            .order('sequence', { ascending: true });

        if (approversError || !approvers) {
            console.error('결재선 조회 오류:', approversError?.message);
            throw new Error('결재선 정보를 가져오는데 실패했습니다.');
        }

        const currentApproverStep = approvers.find(app => app.approver_id === user.id && app.status === '대기');
        if (!currentApproverStep) {
            return new NextResponse(JSON.stringify({ error: '현재 결재 대기 중인 문서가 아닙니다.' }), { status: 400 });
        }

        // 2. 결재 이력 추가
        const { error: historyError } = await supabase
            .from('approval_histories')
            .insert({
                document_id: document_id,
                actor_id: user.id,
                action: action === 'approve' ? '승인' : '반려',
                comment: comment,
            });

        if (historyError) {
            console.error('결재 이력 추가 오류:', historyError.message);
            throw new Error('결재 이력 기록 실패');
        }

        // 3. 결재선 상태 및 문서 상태 업데이트
        let nextDocumentStatus = 'pending';
        let nextCurrentApproverId = null;

        if (action === 'reject') {
            nextDocumentStatus = 'rejected'; // 반려 처리
            // 현재 결재선 상태 '대기' -> '반려'로 업데이트
            await supabase
                .from('approval_document_approvers')
                .update({ status: '반려', approved_at: new Date().toISOString() })
                .eq('document_id', document_id)
                .eq('approver_id', user.id);
            
            // 상신자에게 알림
            await supabase.from('notifications').insert({
                recipient_id: document.author_id,
                type: 'approval_rejected',
                content: `상신하신 '${document.title}' 문서가 반려되었습니다.`,
                link: `/approvals/${document_id}`
            });

        } else { // 'approve'
            // 현재 결재선 상태 '대기' -> '승인'으로 업데이트
            await supabase
                .from('approval_document_approvers')
                .update({ status: '승인', approved_at: new Date().toISOString() })
                .eq('document_id', document_id)
                .eq('approver_id', user.id);

            const nextApproverIndex = approvers.findIndex(app => app.approver_id === user.id) + 1;

            if (nextApproverIndex < approvers.length) {
                // 다음 결재자가 있다면
                const nextApprover = approvers[nextApproverIndex];
                nextCurrentApproverId = nextApprover.approver_id;
                nextDocumentStatus = 'pending';
                // 다음 결재자의 상태를 '미결' -> '대기'로 업데이트
                await supabase
                    .from('approval_document_approvers')
                    .update({ status: '대기' })
                    .eq('document_id', document_id)
                    .eq('approver_id', nextApprover.approver_id);
                
                // 다음 결재자에게 알림
                await supabase.from('notifications').insert({
                    recipient_id: nextApprover.approver_id,
                    type: 'approval_request',
                    content: `새로운 '${document.title}' 문서에 대한 결재가 요청되었습니다.`,
                    link: `/approvals/${document_id}`
                });

            } else {
                // 모든 결재가 완료됨
                nextDocumentStatus = 'approved';
                nextCurrentApproverId = null;

                // 상신자에게 알림
                await supabase.from('notifications').insert({
                    recipient_id: document.author_id,
                    type: 'approval_approved',
                    content: `상신하신 '${document.title}' 문서가 최종 승인되었습니다.`,
                    link: `/approvals/${document_id}`
                });
                // 참조인들에게 알림
                const { data: referrers } = await supabase.from('approval_document_referrers').select('referrer_id').eq('document_id', document_id);
                if (referrers && referrers.length > 0) {
                    const referrerNotifications = referrers.map(ref => ({
                        recipient_id: ref.referrer_id,
                        type: 'approval_completed',
                        content: `'${document.title}' 문서의 결재가 완료되었습니다.`,
                        link: `/approvals/${document_id}`
                    }));
                    await supabase.from('notifications').insert(referrerNotifications);
                }
            }
        }

        // 문서 메인 테이블 업데이트
        const { error: updateDocError } = await supabase
            .from('approval_documents')
            .update({
                status: nextDocumentStatus,
                current_approver_id: nextCurrentApproverId,
                updated_at: new Date().toISOString()
            })
            .eq('id', document_id);

        if (updateDocError) {
            console.error('문서 상태 업데이트 오류:', updateDocError.message);
            throw new Error('문서 상태 업데이트 실패');
        }

        return NextResponse.json({ message: '결재가 성공적으로 처리되었습니다.', newStatus: nextDocumentStatus });

    } catch (error) {
        console.error('결재 처리 중 서버 오류 발생:', error);
        return new NextResponse(JSON.stringify({ error: error.message || '서버 내부 오류' }), { status: 500 });
    }
}