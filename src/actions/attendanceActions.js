// src/actions/attendanceActions.js
"use server";
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'; // auth-helpers의 Server Action용 클라이언트
import { cookies } from "next/headers";
import { revalidatePath } from 'next/cache';

const ATTENDANCE_TABLE_NAME = 'attendances';
// ... (getSupabaseServerClient 헬퍼 함수는 이제 createServerActionClient를 직접 사용)

export async function checkInAction(formData) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore }); // 함수 형태로 전달
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(); // getSession() 대신 getUser() 권장
    if (authError || !user) {
        return { success: false, error: '인증되지 않았습니다.' };
    }
    
    const employeeId = formData?.get('employeeId') || user.id;
    const attendanceTime = new Date().toISOString();
    
    // _addAttendanceRecord 함수를 호출하거나, 직접 DB 로직 작성
    // 예시:
    const { data, error } = await supabase
        .from(ATTENDANCE_TABLE_NAME)
        .insert([{ employee_id: employeeId, timestamp: attendanceTime, status: '출근', recorded_by: user.id }])
        .select().single();
    // ... (에러 처리 및 반환)
    if (error) return { success: false, error: error.message };
    revalidatePath('/attendance');
    return { success: true, data };
}

export async function checkOutAction(formDataOrRecordId) {
    const cookieStore = cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });
    // ... (checkInAction과 유사한 로직)
}