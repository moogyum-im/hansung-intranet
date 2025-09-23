// supabase/functions/push-sender/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import webpush from "web-push"

serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }});
  }

  try {
    // ❗ [수정] Vercel과 동일한 환경 변수 이름을 사용하도록 변경
    const VAPID_PUBLIC_KEY = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys are not configured on the server.");
    }

    webpush.setVapidDetails(
      'mailto:admin@hansung.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const { subscription, payload } = await req.json();
    
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    
    return new Response(JSON.stringify({ success: true, message: 'Push notification sent.' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });
  } catch (error) {
    console.error('--- PUSH NOTIFICATION FAILED ---');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Status Code:', error.statusCode);
    console.error('Error Body:', error.body);
    console.error('--- END OF ERROR ---');
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Push service returned status code ${error.statusCode}. Check the function logs for details.` 
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
})