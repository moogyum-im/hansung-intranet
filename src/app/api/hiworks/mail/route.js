import { NextResponse } from 'next/server';

const HIWORKS_TOKEN = process.env.HIWORKS_OFFICE_TOKEN;
const BASE_URL = 'https://api.hiworks.com/office/v3';

export async function GET(request) {
    if (!HIWORKS_TOKEN) {
        return NextResponse.json({ error: 'HIWORKS_OFFICE_TOKEN 미설정' }, { status: 500 });
    }

    try {
        const res = await fetch(`${BASE_URL}/mail/receive/list?limit=20&page=1`, {
            headers: {
                'office-token': HIWORKS_TOKEN,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('Hiworks API 오류:', res.status, text);
            return NextResponse.json({ error: `Hiworks API ${res.status}`, detail: text }, { status: res.status });
        }

        const data = await res.json();

        // 하이웍스 응답 정규화
        const rawMails = data?.data?.list || data?.list || data?.mails || [];
        const mails = rawMails.map(m => ({
            id: m.mail_no || m.id,
            subject: m.title || m.subject || '(제목 없음)',
            from: m.from_name || m.sender_name || m.from || '',
            fromEmail: m.from_email || m.sender_email || '',
            date: m.receive_date || m.date || '',
            isRead: m.read_flag === 'Y' || m.is_read === true,
            link: `https://mail.hiworks.com`,
        }));

        const unreadCount = mails.filter(m => !m.isRead).length;

        return NextResponse.json({ mails, unreadCount });
    } catch (error) {
        console.error('Hiworks 메일 조회 실패:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
