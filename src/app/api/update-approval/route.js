import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });

        const { documentId, title, content, attachments, approver_ids, referrer_ids } = await request.json();
        if (!documentId) return NextResponse.json({ error: '문서 ID가 필요합니다.' }, { status: 400 });

        const { data: doc, error: fetchError } = await supabase
            .from('approval_documents')
            .select('id, status, requester_id, author_id')
            .eq('id', documentId)
            .single();

        if (fetchError || !doc) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
        if (doc.requester_id !== user.id && doc.author_id !== user.id)
            return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
        if (doc.status !== 'pending')
            return NextResponse.json({ error: '이미 결재가 진행된 문서는 수정할 수 없습니다.' }, { status: 400 });

        // 문서 본문 업데이트
        const { error: updateError } = await supabase
            .from('approval_documents')
            .update({ title, content: content || '{}', attachments: attachments || [] })
            .eq('id', documentId);

        if (updateError) throw new Error(updateError.message);

        // 결재선 교체 (기존 삭제 후 재등록)
        if (approver_ids && approver_ids.length > 0) {
            await supabase.from('approval_document_approvers').delete().eq('document_id', documentId);

            const approversToInsert = approver_ids.map((approver, index) => ({
                document_id: documentId,
                approver_id: approver.id,
                approver_name: approver.full_name || approver.name,
                approver_position: approver.position,
                sequence: index + 1,
                status: index === 0 ? '대기' : '미결',
            }));

            const { error: approverError } = await supabase
                .from('approval_document_approvers')
                .insert(approversToInsert);

            if (approverError) throw new Error(`결재선 업데이트 실패: ${approverError.message}`);

            // 첫 번째 결재자 업데이트
            await supabase
                .from('approval_documents')
                .update({ current_approver_id: approver_ids[0].id })
                .eq('id', documentId);
        }

        // 참조인 교체
        if (referrer_ids !== undefined) {
            await supabase.from('approval_document_referrers').delete().eq('document_id', documentId);

            if (referrer_ids.length > 0) {
                const referrersToInsert = referrer_ids.map(r => ({
                    document_id: documentId,
                    referrer_id: r.id,
                    referrer_name: r.full_name || r.name,
                    referrer_position: r.position,
                }));
                await supabase.from('approval_document_referrers').insert(referrersToInsert);
            }
        }

        return NextResponse.json({ success: true, message: '문서가 수정되었습니다.' });
    } catch (error) {
        console.error('update-approval error:', error);
        return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
