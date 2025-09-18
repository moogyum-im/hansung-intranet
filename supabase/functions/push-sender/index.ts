// supabase/functions/push-sender/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
// --- [수정] 인터넷 주소 대신, import_map.json에 등록한 별명으로 불러옵니다. ---
import webpush from "web-push"

// VAPID 키를 환경 변수(Secrets)에서 불러옵니다.
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

// web-push 라이브러리를 초기화합니다.
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@hansung.com', // 관리자 이메일
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.error('VAPID keys are not defined in environment variables.');
}

serve(async (req) => {
  // 웹 브라우저가 먼저 "실제로 요청을 보내도 괜찮아?"라고 물어보는 Preflight 요청을 처리합니다.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 
      'Access-Control-Allow-Origin': '*', // 실제 서비스에서는 Vercel 도메인으로 제한하는 것이 안전합니다.
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    } });
  }

  try {
    // 프론트엔드에서 보낸 요청에서 구독 정보(배달 주소)와 알림 내용을 꺼냅니다.
    const { subscription, payload } = await req.json();

    // web-push를 이용해 푸시 알림을 보냅니다.
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    
    // 성공 응답을 보냅니다.
    return new Response(JSON.stringify({ success: true, message: 'Push notification sent.' }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    // 실패 응답을 보냅니다.
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
      status: 500,
    });
  }
})