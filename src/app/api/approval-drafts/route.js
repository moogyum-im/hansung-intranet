import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });

        const { draftId, document_type, title, content, attachments, approvers, referrers } = await request.json();
        if (!document_type) return NextResponse.json({ error: '문서 종류가 누락되었습니다.' }, { status: 400 });

        const draftFields = {
            title: title || '(제목 없음)',
            content: content || '{}',
            document_type,
            attachments: attachments || [],
            draft_approvers: approvers || [],
            draft_referrers: referrers || [],
            last_saved_at: new Date().toISOString(),
        };

        if (draftId) {
            const { data: existing, error: fetchError } = await supabase
                .from('approval_documents')
                .select('id, author_id, status')
                .eq('id', draftId)
                .single();

            if (fetchError || !existing) return NextResponse.json({ error: '임시저장 문서를 찾을 수 없습니다.' }, { status: 404 });
            if (existing.author_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
            if (existing.status !== 'draft') return NextResponse.json({ error: '이미 상신된 문서는 임시저장할 수 없습니다.' }, { status: 400 });

            const { error: updateError } = await supabase
                .from('approval_documents')
                .update(draftFields)
                .eq('id', draftId);

            if (updateError) throw new Error(updateError.message);
            return NextResponse.json({ id: draftId });
        }

        const { data: newDraft, error: insertError } = await supabase
            .from('approval_documents')
            .insert({
                ...draftFields,
                author_id: user.id,
                requester_id: user.id,
                status: 'draft',
            })
            .select('id')
            .single();

        if (insertError) throw new Error(insertError.message);
        return NextResponse.json({ id: newDraft.id });

    } catch (error) {
        console.error('save-draft error:', error);
        return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });

        const draftId = new URL(request.url).searchParams.get('id');
        if (!draftId) return NextResponse.json({ error: '문서 ID가 필요합니다.' }, { status: 400 });

        const { data: existing, error: fetchError } = await supabase
            .from('approval_documents')
            .select('id, author_id, status')
            .eq('id', draftId)
            .single();

        if (fetchError || !existing) return NextResponse.json({ error: '임시저장 문서를 찾을 수 없습니다.' }, { status: 404 });
        if (existing.author_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        if (existing.status !== 'draft') return NextResponse.json({ error: '이미 상신된 문서는 삭제할 수 없습니다.' }, { status: 400 });

        const { error: deleteError } = await supabase.from('approval_documents').delete().eq('id', draftId);
        if (deleteError) throw new Error(deleteError.message);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('delete-draft error:', error);
        return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
