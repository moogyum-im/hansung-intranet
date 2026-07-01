import { NextResponse } from 'next/server';

export const preferredRegion = 'icn1';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) {
            return NextResponse.json({ notConnected: true, mails: [], unreadCount: 0 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const res = await fetch(`${supabaseUrl}/functions/v1/fetch-hiworks-mail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceKey}`,
                'apikey': serviceKey,
            },
            body: JSON.stringify({ userId }),
            signal: AbortSignal.timeout(20000),
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('메일 라우트 오류:', error?.message);
        return NextResponse.json({ connected: true, mails: [], unreadCount: 0, fetchError: true });
    }
}
