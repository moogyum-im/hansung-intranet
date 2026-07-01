import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/encrypt';
import Pop3Command from 'node-pop3';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST: 하이웍스 POP3 자격증명 저장
export async function POST(request) {
    try {
        const { userId, email, password } = await request.json();
        if (!userId || !email || !password) {
            return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });
        }

        // POP3 연결 테스트
        const pop3 = new Pop3Command({
            user: email,
            password,
            host: 'pop3s.hiworks.com',
            port: 995,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            timeout: 10000,
        });

        try {
            await pop3.STAT();
            await pop3.QUIT();
        } catch (err) {
            console.error('POP3 연결 테스트 실패:', err?.message);
            const msg = err?.message?.toLowerCase() || '';
            const isIpBlocked = msg.includes('ip') || msg.includes('not allowed') || msg.includes('not permit');
            const isAuthError = !isIpBlocked && (msg.includes('[auth]') || msg.includes('login') || msg.includes('invalid password'));
            if (isAuthError) {
                return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다. POP3/SMTP 설정이 활성화되어 있는지 확인하세요.' }, { status: 401 });
            }
            // IP 차단 또는 기타 연결 오류 → 저장 허용
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
