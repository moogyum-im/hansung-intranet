import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 오늘 날짜(KST)를 'YYYY-MM-DD'로 반환
function todayKST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

// hire_date에 개월 수를 더한 날짜를 'YYYY-MM-DD'로 반환. 대상 월에 없는 날짜(예: 1/31 + 1개월)는 그 달의 말일로 보정.
function addMonthsClamped(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 근속연수 → 연차일수 (1,2년=15 / 3,4년=16 / ... / 21년 이상=25, 2년마다 1일씩 증가)
function leaveDaysForYears(years) {
  if (years <= 0) return 0;
  return Math.min(15 + Math.floor((years - 1) / 2), 25);
}

async function isAuthorized(request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  // 관리자가 수동 실행하는 경우 세션으로 인증
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from('profiles').select('role, department').eq('id', user.id).single();
  return profile?.role === 'admin' || profile?.department === '관리부';
}

export async function GET(request) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: '권한 없음' }, { status: 401 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const today = todayKST();

    const { data: employees, error } = await adminSupabase
      .from('profiles')
      .select('id, full_name, hire_date, total_leave_days, used_leave_days, carry_over_days')
      .eq('employment_status', '재직')
      .not('hire_date', 'is', null);

    if (error) throw new Error(error.message);

    const results = { granted: [], skipped: 0, errors: [] };

    for (const emp of employees || []) {
      try {
        // 1) 월차 (입사~1년 미만, 입사일 기준 매월 응당일에 +1일, 최대 11회)
        for (let m = 1; m <= 11; m++) {
          if (addMonthsClamped(emp.hire_date, m) === today) {
            const newTotal = Number(emp.total_leave_days || 0) + 1;
            const { error: insErr } = await adminSupabase.from('leave_grant_history').insert({
              profile_id: emp.id,
              grant_type: 'monthly',
              grant_date: today,
              amount: 1,
              resulting_total: newTotal,
            });
            if (insErr) {
              if (insErr.code !== '23505') throw insErr; // 23505 = 이미 오늘 부여됨(중복 방지)
            } else {
              await adminSupabase.from('profiles').update({ total_leave_days: newTotal }).eq('id', emp.id);
              results.granted.push({ id: emp.id, name: emp.full_name, type: 'monthly', amount: 1 });
            }
            break;
          }
        }

        // 2) 연차 (입사 1주년부터 매 입사일마다, 근속연수에 따라 차등 부여 + 이월 정산)
        for (let y = 1; y <= 60; y++) {
          if (addMonthsClamped(emp.hire_date, y * 12) === today) {
            const amount = leaveDaysForYears(y);
            const carryOver = Math.max(Number(emp.total_leave_days || 0) - Number(emp.used_leave_days || 0), 0);
            const newTotal = carryOver + amount;
            const { error: insErr } = await adminSupabase.from('leave_grant_history').insert({
              profile_id: emp.id,
              grant_type: 'annual',
              grant_date: today,
              amount,
              years_of_service: y,
              resulting_carry_over: carryOver,
              resulting_total: newTotal,
            });
            if (insErr) {
              if (insErr.code !== '23505') throw insErr;
            } else {
              await adminSupabase.from('profiles').update({
                carry_over_days: carryOver,
                total_leave_days: newTotal,
                used_leave_days: 0,
              }).eq('id', emp.id);
              results.granted.push({ id: emp.id, name: emp.full_name, type: 'annual', years: y, amount });
            }
            break;
          }
        }
      } catch (empErr) {
        results.errors.push({ id: emp.id, name: emp.full_name, message: empErr.message });
      }
    }

    return NextResponse.json({ success: true, date: today, ...results });
  } catch (err) {
    console.error('leave-accrual cron error:', err);
    return NextResponse.json({ error: err.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
