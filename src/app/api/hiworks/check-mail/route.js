import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// 마지막으로 확인한 메일 수를 임시 저장 (서버 재시작 시 초기화됨)
const lastMailCounts = new Map();

export async function GET(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        webpush.setVapidDetails(
            'mailto:admin@han-sung.com',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY,
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

        // ── 하이웍스 API 연동 후 아래 구현 ──
        // const token = await getHiworksToken(user.id, supabase);
        // const res = await fetch('https://api.hiworks.com/mail/v3/mail?unread=true', {
        //     headers: { Authorization: `Bearer ${token}` }
        // });
        // const { mails } = await res.json();
        // const unreadCount = mails.filter(m => !m.isRead).length;
        // const newestMail = mails[0];
        const unreadCount = 0;
        const newestMail = null;

        const prevCount = lastMailCounts.get(user.id) || 0;

        if (unreadCount > prevCount && newestMail) {
            // 해당 유저의 푸시 구독 정보 조회
            const { data: sub } = await supabase
                .from('push_subscriptions')
                .select('subscription_details')
                .eq('user_id', user.id)
                .single();

            if (sub?.subscription_details) {
                await webpush.sendNotification(
                    sub.subscription_details,
                    JSON.stringify({
                        title: '📬 새 메일 도착',
                        body: `[${newestMail.from}] ${newestMail.subject}`,
                        icon: '/hansung_logo.png',
                        badge: '/icons/icon-192x192.png',
                        url: 'https://www.hiworks.com',
                        tag: 'hiworks-mail',
                    }),
                );
            }

            lastMailCounts.set(user.id, unreadCount);
        }

        return NextResponse.json({ unreadCount, mails: [] });
    } catch (error) {
        console.error('메일 확인 오류:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
