import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encrypt';
import Pop3Command from 'node-pop3';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 인코딩된 메일 헤더 디코딩 (=?UTF-8?B?...?= 등)
function decodeHeader(str) {
    if (!str) return '';
    return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
        try {
            if (encoding.toUpperCase() === 'B') {
                return Buffer.from(text, 'base64').toString(
                    charset.toLowerCase().includes('utf') ? 'utf8' : 'binary'
                );
            } else {
                return text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (m, h) =>
                    String.fromCharCode(parseInt(h, 16))
                );
            }
        } catch { return text; }
    });
}

// 발신자 파싱: "이름 <email>" → { name, address }
function parseFrom(from) {
    if (!from) return { name: '', address: '' };
    const decoded = decodeHeader(from);
    const match = decoded.match(/^(.+?)\s*<([^>]+)>/);
    if (match) return { name: match[1].trim().replace(/^["']|["']$/g, ''), address: match[2] };
    return { name: '', address: decoded.trim() };
}

// POP3 헤더 파싱
function parseHeaders(raw) {
    const headers = {};
    const lines = (raw || '').split(/\r?\n/);
    let current = null;
    for (const line of lines) {
        if (line === '') break;
        if (/^\s/.test(line) && current) {
            headers[current] += ' ' + line.trim();
        } else {
            const m = line.match(/^([^:]+):\s*(.*)/);
            if (m) {
                current = m[1].toLowerCase();
                headers[current] = m[2].trim();
            }
        }
    }
    return headers;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) {
            return NextResponse.json({ notConnected: true, mails: [], unreadCount: 0 });
        }

        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('hiworks_email, hiworks_password_enc')
            .eq('id', userId)
            .single();

        if (error || !profile?.hiworks_email || !profile?.hiworks_password_enc) {
            return NextResponse.json({ notConnected: true, mails: [], unreadCount: 0 });
        }

        const password = decrypt(profile.hiworks_password_enc);

        const pop3 = new Pop3Command({
            user: profile.hiworks_email,
            password,
            host: 'pop3s.hiworks.com',
            port: 995,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            timeout: 15000,
        });

        // 전체 메시지 수
        const [msgCount] = await pop3.STAT();
        const total = parseInt(msgCount, 10) || 0;

        const mails = [];

        if (total > 0) {
            // 최근 20개 (마지막 메시지부터 역순)
            const start = Math.max(1, total - 19);
            const nums = Array.from({ length: total - start + 1 }, (_, i) => total - i);

            for (const msgNum of nums) {
                try {
                    const headerRaw = await pop3.TOP(msgNum, 0);
                    const headers = parseHeaders(headerRaw);
                    const { name, address } = parseFrom(headers.from);
                    const dateStr = headers.date
                        ? new Date(headers.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                        : '';
                    mails.push({
                        id: msgNum,
                        subject: decodeHeader(headers.subject) || '(제목 없음)',
                        from: name || address,
                        fromEmail: address,
                        date: dateStr,
                        isRead: false,
                        link: 'https://mails.office.hiworks.com/list/inbox?page=1',
                    });
                } catch {}
            }
        }

        await pop3.QUIT();

        return NextResponse.json({ connected: true, mails, unreadCount: total });
    } catch (error) {
        console.error('POP3 메일 조회 오류:', error?.message);
        return NextResponse.json({ connected: true, mails: [], unreadCount: 0, fetchError: true });
    }
}
