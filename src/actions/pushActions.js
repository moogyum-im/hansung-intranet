// src/actions/pushActions.js

"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// 전달받은 구독 정보를 DB에 저장(또는 업데이트)하는 함수
export async function saveSubscription(subscription) {
  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  // 현재 로그인한 사용자 정보를 가져옵니다.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "사용자 인증에 실패했습니다." };
  }

  try {
    // push_subscriptions 테이블에 user_id를 기준으로 데이터를 삽입하거나 업데이트합니다(upsert).
    // 이렇게 하면 사용자가 재구독해도 정보가 중복으로 쌓이지 않습니다.
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: user.id,
        subscription_details: subscription,
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("구독 정보 저장 실패:", error);
    return { success: false, error: "구독 정보를 저장하는 중 오류가 발생했습니다." };
  }
}