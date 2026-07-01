import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/encrypt';

export const preferredRegion = 'icn1';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST: 하이웍스 자격증명 검증 후 저장
export async function POST(request) {
    try {
        const { userId, email, password } = await request.json();
        if (!userId || !email || !password) {
            return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });
        }

        // Supabase Edge Function으로 POP3 자격증명 검증
        const verifyRes = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-hiworks-mail`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                },
                body: JSON.stringify({ verifyOnly: true, email, password }),
                signal: AbortSignal.timeout(15000),
            }
        );

        const verifyData = await verifyRes.json();
        if (!verifyData.ok) {
            return NextResponse.json(
                { error: verifyData.error || '이메일 또는 비밀번호가 올바르지 않습니다.' },
                { status: 401 }
            );
        }

        const passwordEnc = encrypt(password);
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ hiworks_email: email, hiworks_password_enc: passwordEnc })
            .eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Hiworks 연동 저장 오류:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: 연동 해제
export async function DELETE(request) {
    try {
        const { userId } = await request.json();
        if (!userId) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ hiworks_email: null, hiworks_password_enc: null })
            .eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
